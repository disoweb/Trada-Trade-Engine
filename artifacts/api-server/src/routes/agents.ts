import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, tradesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GetAgentParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatAgent(a: typeof agentsTable.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    symbol: a.symbol,
    strategy: a.strategy,
    riskLevel: a.riskLevel,
    rentalPricePerDay: parseFloat(a.rentalPricePerDay),
    minBalance: parseFloat(a.minBalance),
    winRate: parseFloat(a.winRate),
    totalTrades: a.totalTrades,
    avgReturn: parseFloat(a.avgReturn),
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/agents", requireAuth, async (_req, res) => {
  const agents = await db.select().from(agentsTable).where(eq(agentsTable.isActive, true)).orderBy(desc(agentsTable.winRate));
  res.json({ items: agents.map(formatAgent) });
});

router.get("/agents/:agentId", requireAuth, async (req, res) => {
  const parsed = GetAgentParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const agents = await db.select().from(agentsTable).where(eq(agentsTable.id, parsed.data.agentId)).limit(1);
  if (agents.length === 0) {
    res.status(404).json({ error: "not_found", message: "Agent not found" });
    return;
  }

  const agent = agents[0]!;

  const recentTrades = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.agentId, agent.id))
    .orderBy(desc(tradesTable.createdAt))
    .limit(30);

  const performanceByDay = new Map<string, { balance: number; pnl: number; count: number }>();
  let runningBalance = 1000;
  for (const t of [...recentTrades].reverse()) {
    const day = t.createdAt.toISOString().slice(0, 10);
    const pnl = t.pnl ? parseFloat(t.pnl) : 0;
    runningBalance += pnl;
    const existing = performanceByDay.get(day);
    if (existing) {
      existing.pnl += pnl;
      existing.balance = runningBalance;
      existing.count++;
    } else {
      performanceByDay.set(day, { balance: runningBalance, pnl, count: 1 });
    }
  }

  const recentPerformance = Array.from(performanceByDay.entries()).map(([date, v]) => ({
    date,
    balance: v.balance,
    pnl: v.pnl,
  }));

  res.json({ ...formatAgent(agent), recentPerformance });
});

export default router;
