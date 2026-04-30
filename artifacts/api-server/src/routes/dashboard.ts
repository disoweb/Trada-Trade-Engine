import { Router } from "express";
import { db } from "@workspace/db";
import {
  walletsTable,
  rentalsTable,
  tradesTable,
  transactionsTable,
  withdrawalRequestsTable,
  agentsTable,
} from "@workspace/db";
import { eq, and, desc, count, sum, gte } from "drizzle-orm";
import { GetRecentActivityQueryParams, GetPerformanceQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/dashboard/summary", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);

  const [{ count: activeRentals }] = await db
    .select({ count: count() })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.userId, userId), eq(rentalsTable.status, "active")));

  const [{ count: totalTrades }] = await db
    .select({ count: count() })
    .from(tradesTable)
    .where(eq(tradesTable.userId, userId));

  const [{ count: successfulTrades }] = await db
    .select({ count: count() })
    .from(tradesTable)
    .where(and(eq(tradesTable.userId, userId), eq(tradesTable.status, "executed")));

  const pnlResult = await db
    .select({ total: sum(tradesTable.pnl) })
    .from(tradesTable)
    .where(and(eq(tradesTable.userId, userId), eq(tradesTable.status, "executed")));

  const [{ count: pendingWithdrawals }] = await db
    .select({ count: count() })
    .from(withdrawalRequestsTable)
    .where(and(eq(withdrawalRequestsTable.userId, userId), eq(withdrawalRequestsTable.status, "requested")));

  const [{ count: cbTripped }] = await db
    .select({ count: count() })
    .from(rentalsTable)
    .where(and(eq(rentalsTable.userId, userId), eq(rentalsTable.circuitBreakerTripped, true)));

  const recentTrades = await db
    .select({ trade: tradesTable, agent: agentsTable })
    .from(tradesTable)
    .innerJoin(agentsTable, eq(tradesTable.agentId, agentsTable.id))
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.createdAt))
    .limit(5);

  res.json({
    walletBalance: wallet ? parseFloat(wallet.balance) : 0,
    walletCurrency: wallet?.currency ?? "USDT",
    activeRentals: Number(activeRentals),
    totalTrades: Number(totalTrades),
    successfulTrades: Number(successfulTrades),
    totalPnl: pnlResult[0]?.total ? parseFloat(pnlResult[0].total) : 0,
    pendingWithdrawals: Number(pendingWithdrawals),
    circuitBreakerTripped: Number(cbTripped),
    recentTrades: recentTrades.map(({ trade, agent }) => ({
      id: trade.id,
      rentalId: trade.rentalId,
      agentId: trade.agentId,
      agentName: agent.name,
      symbol: trade.symbol,
      side: trade.side,
      status: trade.status,
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) : null,
      exitPrice: trade.exitPrice ? parseFloat(trade.exitPrice) : null,
      quantity: trade.quantity ? parseFloat(trade.quantity) : null,
      pnl: trade.pnl ? parseFloat(trade.pnl) : null,
      signalConfidence: trade.signalConfidence ? parseFloat(trade.signalConfidence) : null,
      failureReason: trade.failureReason ?? null,
      createdAt: trade.createdAt.toISOString(),
    })),
  });
});

router.get("/dashboard/activity", requireAuth, async (req, res) => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const userId = req.user!.userId;

  const activities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    amount: number | null;
    createdAt: string;
  }> = [];

  const recentTrades = await db
    .select({ trade: tradesTable, agent: agentsTable })
    .from(tradesTable)
    .innerJoin(agentsTable, eq(tradesTable.agentId, agentsTable.id))
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.createdAt))
    .limit(Math.ceil(limit / 2));

  for (const { trade, agent } of recentTrades) {
    activities.push({
      id: `trade-${trade.id}`,
      type: trade.status === "executed" ? "trade_executed" : trade.status === "failed" ? "trade_failed" : "trade_executed",
      title: trade.status === "executed" ? `Trade Executed: ${trade.side.toUpperCase()} ${trade.symbol}` : `Trade Failed: ${trade.symbol}`,
      description: trade.status === "executed"
        ? `${agent.name} executed a ${trade.side} order for ${trade.symbol}${trade.pnl ? ` with PnL ${parseFloat(trade.pnl) >= 0 ? "+" : ""}${parseFloat(trade.pnl).toFixed(2)} USDT` : ""}`
        : `${agent.name} failed to execute: ${trade.failureReason ?? "Unknown reason"}`,
      amount: trade.pnl ? parseFloat(trade.pnl) : null,
      createdAt: trade.createdAt.toISOString(),
    });
  }

  const recentTxns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(Math.ceil(limit / 2));

  for (const txn of recentTxns) {
    const type = txn.type === "deposit" ? "deposit_confirmed" : txn.type === "withdrawal" ? "withdrawal_completed" : "deposit_confirmed";
    activities.push({
      id: `txn-${txn.id}`,
      type,
      title: txn.type === "deposit" ? "Deposit Confirmed" : txn.type === "withdrawal" ? "Withdrawal Completed" : txn.description,
      description: txn.description,
      amount: parseFloat(txn.amount),
      createdAt: txn.createdAt.toISOString(),
    });
  }

  activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ items: activities.slice(0, limit) });
});

router.get("/dashboard/performance", requireAuth, async (req, res) => {
  const parsed = GetPerformanceQueryParams.safeParse(req.query);
  const days = parsed.success ? (parsed.data.days ?? 30) : 30;
  const userId = req.user!.userId;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const trades = await db
    .select()
    .from(tradesTable)
    .where(and(eq(tradesTable.userId, userId), eq(tradesTable.status, "executed"), gte(tradesTable.createdAt, since)))
    .orderBy(tradesTable.createdAt);

  const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, userId)).limit(1);
  const currentBalance = wallet[0] ? parseFloat(wallet[0].balance) : 0;

  const pnlByDay = new Map<string, number>();
  for (const t of trades) {
    const day = t.createdAt.toISOString().slice(0, 10);
    pnlByDay.set(day, (pnlByDay.get(day) ?? 0) + (t.pnl ? parseFloat(t.pnl) : 0));
  }

  const points = [];
  let runningBalance = currentBalance;
  const dayKeys = Array.from(pnlByDay.keys()).sort();
  const totalPnl = dayKeys.reduce((sum, d) => sum + (pnlByDay.get(d) ?? 0), 0);
  runningBalance = currentBalance - totalPnl;

  for (const day of dayKeys) {
    const dayPnl = pnlByDay.get(day) ?? 0;
    runningBalance += dayPnl;
    points.push({ date: day, balance: parseFloat(runningBalance.toFixed(2)), pnl: parseFloat(dayPnl.toFixed(2)) });
  }

  const allPnl = trades.reduce((sum, t) => sum + (t.pnl ? parseFloat(t.pnl) : 0), 0);
  const successTrades = trades.filter((t) => (t.pnl ? parseFloat(t.pnl) > 0 : false)).length;
  const winRate = trades.length > 0 ? (successTrades / trades.length) * 100 : 0;

  res.json({ points, totalReturn: parseFloat(allPnl.toFixed(2)), winRate: parseFloat(winRate.toFixed(1)) });
});

export default router;
