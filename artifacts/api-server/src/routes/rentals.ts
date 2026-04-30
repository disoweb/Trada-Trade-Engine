import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import { rentalsTable, agentsTable, tradesTable, transactionsTable, walletsTable } from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { CreateRentalBody, GetRentalParams, RenewRentalBody, RenewRentalParams, CancelRentalParams, ListRentalsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatRental(r: typeof rentalsTable.$inferSelect, agentName: string) {
  return {
    id: r.id,
    userId: r.userId,
    agentId: r.agentId,
    agentName,
    status: r.status,
    durationDays: r.durationDays,
    totalCost: parseFloat(r.totalCost),
    startAt: r.startAt?.toISOString() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    circuitBreakerTripped: r.circuitBreakerTripped,
    consecutiveFailures: r.consecutiveFailures,
    createdAt: r.createdAt.toISOString(),
  };
}

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

router.get("/rentals", requireAuth, async (req, res) => {
  const parsed = ListRentalsQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;

  const conditions = [eq(rentalsTable.userId, req.user!.userId)];
  if (status) {
    conditions.push(eq(rentalsTable.status, status as "pending" | "active" | "paused" | "expired" | "cancelled"));
  }

  const items = await db
    .select({ rental: rentalsTable, agent: agentsTable })
    .from(rentalsTable)
    .innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id))
    .where(and(...conditions))
    .orderBy(desc(rentalsTable.createdAt));

  const [totalResult] = await db.select({ count: count() }).from(rentalsTable).where(and(...conditions));

  res.json({
    items: items.map(({ rental, agent }) => formatRental(rental, agent.name)),
    total: Number(totalResult?.count ?? 0),
  });
});

router.post("/rentals", requireAuth, async (req, res) => {
  const parsed = CreateRentalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { agentId, durationDays } = parsed.data;

  const agents = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId)).limit(1);
  if (agents.length === 0) {
    res.status(404).json({ error: "not_found", message: "Agent not found" });
    return;
  }

  const agent = agents[0]!;
  const totalCost = parseFloat(agent.rentalPricePerDay) * durationDays;

  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (wallets.length === 0) {
    res.status(404).json({ error: "not_found", message: "Wallet not found" });
    return;
  }

  const wallet = wallets[0]!;
  const available = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
  if (totalCost > available) {
    res.status(400).json({ error: "insufficient_balance", message: "Insufficient balance to rent this agent" });
    return;
  }

  const rentalId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.insert(rentalsTable).values({
      id: rentalId,
      userId: req.user!.userId,
      agentId,
      status: "active",
      durationDays,
      totalCost: totalCost.toString(),
      startAt: now,
      expiresAt,
    });

    await tx.update(walletsTable)
      .set({
        balance: (parseFloat(wallet.balance) - totalCost).toString(),
        updatedAt: now,
      })
      .where(eq(walletsTable.id, wallet.id));

    await tx.insert(transactionsTable).values({
      id: uuidv4(),
      walletId: wallet.id,
      userId: req.user!.userId,
      type: "rental_fee",
      amount: totalCost.toString(),
      currency: "USDT",
      status: "completed",
      description: `Rental fee for ${agent.name} (${durationDays} days)`,
    });
  });

  res.status(201).json({
    id: rentalId,
    userId: req.user!.userId,
    agentId,
    agentName: agent.name,
    status: "active",
    durationDays,
    totalCost,
    startAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    circuitBreakerTripped: false,
    consecutiveFailures: 0,
    createdAt: now.toISOString(),
  });
});

router.get("/rentals/:rentalId", requireAuth, async (req, res) => {
  const parsed = GetRentalParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const result = await db
    .select({ rental: rentalsTable, agent: agentsTable })
    .from(rentalsTable)
    .innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id))
    .where(and(eq(rentalsTable.id, parsed.data.rentalId), eq(rentalsTable.userId, req.user!.userId)))
    .limit(1);

  if (result.length === 0) {
    res.status(404).json({ error: "not_found", message: "Rental not found" });
    return;
  }

  const { rental, agent } = result[0]!;

  const recentTrades = await db
    .select()
    .from(tradesTable)
    .where(eq(tradesTable.rentalId, rental.id))
    .orderBy(desc(tradesTable.createdAt))
    .limit(20);

  res.json({
    ...formatRental(rental, agent.name),
    agent: {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      symbol: agent.symbol,
      strategy: agent.strategy,
      riskLevel: agent.riskLevel,
      rentalPricePerDay: parseFloat(agent.rentalPricePerDay),
      minBalance: parseFloat(agent.minBalance),
      winRate: parseFloat(agent.winRate),
      totalTrades: agent.totalTrades,
      avgReturn: parseFloat(agent.avgReturn),
      isActive: agent.isActive,
      createdAt: agent.createdAt.toISOString(),
    },
    recentTrades: recentTrades.map((t) => formatTrade(t, agent.name)),
  });
});

router.post("/rentals/:rentalId/renew", requireAuth, async (req, res) => {
  const paramsParsed = RenewRentalParams.safeParse(req.params);
  const bodyParsed = RenewRentalBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request" });
    return;
  }

  const { rentalId } = paramsParsed.data;
  const { durationDays } = bodyParsed.data;

  const result = await db
    .select({ rental: rentalsTable, agent: agentsTable })
    .from(rentalsTable)
    .innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id))
    .where(and(eq(rentalsTable.id, rentalId), eq(rentalsTable.userId, req.user!.userId)))
    .limit(1);

  if (result.length === 0) {
    res.status(404).json({ error: "not_found", message: "Rental not found" });
    return;
  }

  const { rental, agent } = result[0]!;
  const totalCost = parseFloat(agent.rentalPricePerDay) * durationDays;

  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  const wallet = wallets[0]!;
  const available = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);

  if (totalCost > available) {
    res.status(400).json({ error: "insufficient_balance", message: "Insufficient balance to renew rental" });
    return;
  }

  const now = new Date();
  const baseDate = rental.expiresAt && rental.expiresAt > now ? rental.expiresAt : now;
  const newExpiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    await tx.update(rentalsTable).set({ expiresAt: newExpiresAt, status: "active", updatedAt: now }).where(eq(rentalsTable.id, rentalId));
    await tx.update(walletsTable).set({ balance: (parseFloat(wallet.balance) - totalCost).toString(), updatedAt: now }).where(eq(walletsTable.id, wallet.id));
    await tx.insert(transactionsTable).values({
      id: uuidv4(),
      walletId: wallet.id,
      userId: req.user!.userId,
      type: "rental_fee",
      amount: totalCost.toString(),
      currency: "USDT",
      status: "completed",
      description: `Renewal fee for ${agent.name} (${durationDays} days)`,
    });
  });

  const updated = await db.select().from(rentalsTable).where(eq(rentalsTable.id, rentalId)).limit(1);
  res.json(formatRental(updated[0]!, agent.name));
});

router.post("/rentals/:rentalId/cancel", requireAuth, async (req, res) => {
  const parsed = CancelRentalParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const result = await db
    .select({ rental: rentalsTable, agent: agentsTable })
    .from(rentalsTable)
    .innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id))
    .where(and(eq(rentalsTable.id, parsed.data.rentalId), eq(rentalsTable.userId, req.user!.userId)))
    .limit(1);

  if (result.length === 0) {
    res.status(404).json({ error: "not_found", message: "Rental not found" });
    return;
  }

  const { rental, agent } = result[0]!;

  await db.update(rentalsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(rentalsTable.id, rental.id));

  const updated = await db.select().from(rentalsTable).where(eq(rentalsTable.id, rental.id)).limit(1);
  res.json(formatRental(updated[0]!, agent.name));
});

export default router;
