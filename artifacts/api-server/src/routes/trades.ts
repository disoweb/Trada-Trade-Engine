import { Router } from "express";
import { db } from "@workspace/db";
import { tradesTable, agentsTable, rentalsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { GetTradeParams, ListTradesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatTrade(t: typeof tradesTable.$inferSelect, agentName: string) {
  return {
    id: t.id,
    rentalId: t.rentalId,
    agentId: t.agentId,
    agentName,
    symbol: t.symbol,
    side: t.side,
    status: t.status,
    entryPrice: t.entryPrice ? parseFloat(t.entryPrice) : null,
    exitPrice: t.exitPrice ? parseFloat(t.exitPrice) : null,
    quantity: t.quantity ? parseFloat(t.quantity) : null,
    pnl: t.pnl ? parseFloat(t.pnl) : null,
    signalConfidence: t.signalConfidence ? parseFloat(t.signalConfidence) : null,
    failureReason: t.failureReason ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/trades", requireAuth, async (req, res) => {
  const parsed = ListTradesQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;
  const rentalId = parsed.success ? parsed.data.rentalId : undefined;
  const status = parsed.success ? parsed.data.status : undefined;

  const conditions = [eq(tradesTable.userId, req.user!.userId)];
  if (rentalId) conditions.push(eq(tradesTable.rentalId, rentalId));
  if (status) conditions.push(eq(tradesTable.status, status as "pending" | "executed" | "failed" | "skipped"));

  const items = await db
    .select({ trade: tradesTable, agent: agentsTable })
    .from(tradesTable)
    .innerJoin(agentsTable, eq(tradesTable.agentId, agentsTable.id))
    .where(and(...conditions))
    .orderBy(desc(tradesTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db.select({ count: count() }).from(tradesTable).where(and(...conditions));

  res.json({
    items: items.map(({ trade, agent }) => formatTrade(trade, agent.name)),
    total: Number(totalResult?.count ?? 0),
    offset,
    limit,
  });
});

router.get("/trades/:tradeId", requireAuth, async (req, res) => {
  const parsed = GetTradeParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const result = await db
    .select({ trade: tradesTable, agent: agentsTable })
    .from(tradesTable)
    .innerJoin(agentsTable, eq(tradesTable.agentId, agentsTable.id))
    .where(and(eq(tradesTable.id, parsed.data.tradeId), eq(tradesTable.userId, req.user!.userId)))
    .limit(1);

  if (result.length === 0) {
    res.status(404).json({ error: "not_found", message: "Trade not found" });
    return;
  }

  const { trade, agent } = result[0]!;
  res.json({
    ...formatTrade(trade, agent.name),
    signalRationale: trade.signalRationale ?? null,
    rawSignal: trade.rawSignal ?? null,
    exchangeResponse: trade.exchangeResponse ?? null,
  });
});

export default router;
