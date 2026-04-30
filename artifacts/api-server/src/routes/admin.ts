import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  walletsTable,
  rentalsTable,
  tradesTable,
  withdrawalRequestsTable,
  systemAlertsTable,
  adminAuditLogTable,
  agentsTable,
} from "@workspace/db";
import { eq, and, desc, count, sum, gte, isNull } from "drizzle-orm";
import {
  ListAdminUsersQueryParams,
  ListAdminWithdrawalsQueryParams,
  RejectWithdrawalBody,
  RejectWithdrawalParams,
  ApproveWithdrawalParams,
  PauseRentalParams,
  ResumeRentalParams,
  ListAdminAlertsQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

async function auditLog(adminId: string, action: string, targetType?: string, targetId?: string, details?: Record<string, unknown>) {
  await db.insert(adminAuditLogTable).values({
    id: uuidv4(),
    adminId,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    details: details ?? null,
  });
}

router.get("/admin/dashboard", requireAdmin, async (_req, res) => {
  const [{ count: totalUsers }] = await db.select({ count: count() }).from(usersTable);
  const [{ count: activeRentals }] = await db.select({ count: count() }).from(rentalsTable).where(eq(rentalsTable.status, "active"));

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ count: tradesLast24h }] = await db.select({ count: count() }).from(tradesTable).where(gte(tradesTable.createdAt, oneDayAgo));
  const [{ count: failedLast24h }] = await db.select({ count: count() }).from(tradesTable).where(and(eq(tradesTable.status, "failed"), gte(tradesTable.createdAt, oneDayAgo)));
  const [{ count: pendingWithdrawals }] = await db.select({ count: count() }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "requested"));
  const pendingAmtResult = await db.select({ total: sum(withdrawalRequestsTable.amount) }).from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.status, "requested"));
  const [{ count: cbTripped }] = await db.select({ count: count() }).from(rentalsTable).where(eq(rentalsTable.circuitBreakerTripped, true));
  const [{ count: unresolvedAlerts }] = await db.select({ count: count() }).from(systemAlertsTable).where(eq(systemAlertsTable.resolved, false));

  const recentAlerts = await db.select().from(systemAlertsTable).orderBy(desc(systemAlertsTable.createdAt)).limit(5);

  const failedCount = Number(failedLast24h);
  const systemHealth = failedCount > 10 ? "critical" : failedCount > 3 ? "degraded" : "healthy";

  res.json({
    totalUsers: Number(totalUsers),
    activeRentals: Number(activeRentals),
    totalTradesLast24h: Number(tradesLast24h),
    failedTradesLast24h: failedCount,
    pendingWithdrawals: Number(pendingWithdrawals),
    pendingWithdrawalAmount: pendingAmtResult[0]?.total ? parseFloat(pendingAmtResult[0].total) : 0,
    circuitBreakersTripped: Number(cbTripped),
    unresolvedAlerts: Number(unresolvedAlerts),
    systemHealth,
    recentAlerts: recentAlerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      metadata: a.metadata ?? null,
      resolved: a.resolved,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
    })),
  });
});

router.get("/admin/users", requireAdmin, async (req, res) => {
  const parsed = ListAdminUsersQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset);
  const [{ count: total }] = await db.select({ count: count() }).from(usersTable);

  const enriched = await Promise.all(users.map(async (user) => {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id)).limit(1);
    const [{ count: activeRentals }] = await db.select({ count: count() }).from(rentalsTable).where(and(eq(rentalsTable.userId, user.id), eq(rentalsTable.status, "active")));
    const [{ count: totalTrades }] = await db.select({ count: count() }).from(tradesTable).where(eq(tradesTable.userId, user.id));
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletBalance: wallet ? parseFloat(wallet.balance) : 0,
      activeRentals: Number(activeRentals),
      totalTrades: Number(totalTrades),
      createdAt: user.createdAt.toISOString(),
    };
  }));

  res.json({ items: enriched, total: Number(total) });
});

router.get("/admin/withdrawals", requireAdmin, async (req, res) => {
  const parsed = ListAdminWithdrawalsQueryParams.safeParse(req.query);
  const status = parsed.success ? parsed.data.status : undefined;

  const conditions = status ? [eq(withdrawalRequestsTable.status, status as "requested" | "approved" | "broadcasted" | "completed" | "failed" | "rejected")] : [];

  const items = await db
    .select()
    .from(withdrawalRequestsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(withdrawalRequestsTable.createdAt));

  const [{ count: total }] = await db.select({ count: count() }).from(withdrawalRequestsTable).where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({
    items: items.map((w) => ({
      id: w.id,
      userId: w.userId,
      amount: parseFloat(w.amount),
      currency: w.currency,
      address: w.address,
      network: w.network,
      status: w.status,
      rejectionReason: w.rejectionReason ?? null,
      txHash: w.txHash ?? null,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
    total: Number(total),
  });
});

router.post("/admin/withdrawals/:withdrawalId/approve", requireAdmin, async (req, res) => {
  const parsed = ApproveWithdrawalParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { withdrawalId } = parsed.data;
  const now = new Date();

  await db.update(withdrawalRequestsTable).set({ status: "approved", processedBy: req.user!.userId, updatedAt: now }).where(eq(withdrawalRequestsTable.id, withdrawalId));
  await auditLog(req.user!.userId, "approve_withdrawal", "withdrawal", withdrawalId);

  const [updated] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, withdrawalId)).limit(1);
  if (!updated) { res.status(404).json({ error: "not_found", message: "Withdrawal not found" }); return; }

  res.json({ id: updated.id, userId: updated.userId, amount: parseFloat(updated.amount), currency: updated.currency, address: updated.address, network: updated.network, status: updated.status, rejectionReason: updated.rejectionReason ?? null, txHash: updated.txHash ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/admin/withdrawals/:withdrawalId/reject", requireAdmin, async (req, res) => {
  const paramsParsed = RejectWithdrawalParams.safeParse(req.params);
  const bodyParsed = RejectWithdrawalBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "validation_error", message: "Invalid request" });
    return;
  }

  const { withdrawalId } = paramsParsed.data;
  const { reason } = bodyParsed.data;
  const now = new Date();

  await db.update(withdrawalRequestsTable).set({ status: "rejected", rejectionReason: reason, processedBy: req.user!.userId, updatedAt: now }).where(eq(withdrawalRequestsTable.id, withdrawalId));

  const [wr] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, withdrawalId)).limit(1);
  if (wr) {
    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, wr.userId)).limit(1);
    if (wallet) {
      await db.update(walletsTable).set({ balance: (parseFloat(wallet.balance) + parseFloat(wr.amount)).toString(), updatedAt: now }).where(eq(walletsTable.id, wallet.id));
    }
  }

  await auditLog(req.user!.userId, "reject_withdrawal", "withdrawal", withdrawalId, { reason });

  const [updated] = await db.select().from(withdrawalRequestsTable).where(eq(withdrawalRequestsTable.id, withdrawalId)).limit(1);
  if (!updated) { res.status(404).json({ error: "not_found", message: "Withdrawal not found" }); return; }

  res.json({ id: updated.id, userId: updated.userId, amount: parseFloat(updated.amount), currency: updated.currency, address: updated.address, network: updated.network, status: updated.status, rejectionReason: updated.rejectionReason ?? null, txHash: updated.txHash ?? null, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.post("/admin/rentals/:rentalId/pause", requireAdmin, async (req, res) => {
  const parsed = PauseRentalParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }

  const now = new Date();
  await db.update(rentalsTable).set({ status: "paused", pausedBy: req.user!.userId, pausedAt: now, updatedAt: now }).where(eq(rentalsTable.id, parsed.data.rentalId));
  await auditLog(req.user!.userId, "pause_rental", "rental", parsed.data.rentalId);

  const result = await db.select({ rental: rentalsTable, agent: agentsTable }).from(rentalsTable).innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id)).where(eq(rentalsTable.id, parsed.data.rentalId)).limit(1);
  if (result.length === 0) { res.status(404).json({ error: "not_found", message: "Rental not found" }); return; }
  const { rental, agent } = result[0]!;
  res.json({ id: rental.id, userId: rental.userId, agentId: rental.agentId, agentName: agent.name, status: rental.status, durationDays: rental.durationDays, totalCost: parseFloat(rental.totalCost), startAt: rental.startAt?.toISOString() ?? null, expiresAt: rental.expiresAt?.toISOString() ?? null, circuitBreakerTripped: rental.circuitBreakerTripped, consecutiveFailures: rental.consecutiveFailures, createdAt: rental.createdAt.toISOString() });
});

router.post("/admin/rentals/:rentalId/resume", requireAdmin, async (req, res) => {
  const parsed = ResumeRentalParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }

  const now = new Date();
  await db.update(rentalsTable).set({ status: "active", updatedAt: now }).where(eq(rentalsTable.id, parsed.data.rentalId));
  await auditLog(req.user!.userId, "resume_rental", "rental", parsed.data.rentalId);

  const result = await db.select({ rental: rentalsTable, agent: agentsTable }).from(rentalsTable).innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id)).where(eq(rentalsTable.id, parsed.data.rentalId)).limit(1);
  if (result.length === 0) { res.status(404).json({ error: "not_found", message: "Rental not found" }); return; }
  const { rental, agent } = result[0]!;
  res.json({ id: rental.id, userId: rental.userId, agentId: rental.agentId, agentName: agent.name, status: rental.status, durationDays: rental.durationDays, totalCost: parseFloat(rental.totalCost), startAt: rental.startAt?.toISOString() ?? null, expiresAt: rental.expiresAt?.toISOString() ?? null, circuitBreakerTripped: rental.circuitBreakerTripped, consecutiveFailures: rental.consecutiveFailures, createdAt: rental.createdAt.toISOString() });
});

router.post("/admin/rentals/:rentalId/reset-circuit-breaker", requireAdmin, async (req, res) => {
  const rentalId = req.params["rentalId"];
  if (!rentalId) { res.status(400).json({ error: "validation_error", message: "rentalId is required" }); return; }

  const now = new Date();
  await db.update(rentalsTable).set({ circuitBreakerTripped: false, consecutiveFailures: 0, updatedAt: now }).where(eq(rentalsTable.id, rentalId));
  await auditLog(req.user!.userId, "reset_circuit_breaker", "rental", rentalId);

  const result = await db.select({ rental: rentalsTable, agent: agentsTable }).from(rentalsTable).innerJoin(agentsTable, eq(rentalsTable.agentId, agentsTable.id)).where(eq(rentalsTable.id, rentalId)).limit(1);
  if (result.length === 0) { res.status(404).json({ error: "not_found", message: "Rental not found" }); return; }
  const { rental, agent } = result[0]!;
  res.json({ id: rental.id, userId: rental.userId, agentId: rental.agentId, agentName: agent.name, status: rental.status, durationDays: rental.durationDays, totalCost: parseFloat(rental.totalCost), startAt: rental.startAt?.toISOString() ?? null, expiresAt: rental.expiresAt?.toISOString() ?? null, circuitBreakerTripped: rental.circuitBreakerTripped, consecutiveFailures: rental.consecutiveFailures, createdAt: rental.createdAt.toISOString() });
});

router.get("/admin/alerts", requireAdmin, async (req, res) => {
  const parsed = ListAdminAlertsQueryParams.safeParse(req.query);
  const resolvedFilter = parsed.success ? parsed.data.resolved : undefined;

  const conditions = resolvedFilter !== undefined ? [eq(systemAlertsTable.resolved, resolvedFilter)] : [];

  const items = await db
    .select()
    .from(systemAlertsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(systemAlertsTable.createdAt));

  const [{ count: total }] = await db.select({ count: count() }).from(systemAlertsTable).where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json({
    items: items.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      title: a.title,
      message: a.message,
      metadata: a.metadata ?? null,
      resolved: a.resolved,
      createdAt: a.createdAt.toISOString(),
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
    })),
    total: Number(total),
  });
});

router.post("/admin/alerts/:alertId/resolve", requireAdmin, async (req, res) => {
  const alertId = req.params["alertId"];
  if (!alertId) { res.status(400).json({ error: "validation_error", message: "alertId is required" }); return; }

  const now = new Date();
  await db.update(systemAlertsTable).set({ resolved: true, resolvedBy: req.user!.userId, resolvedAt: now }).where(eq(systemAlertsTable.id, alertId));
  await auditLog(req.user!.userId, "resolve_alert", "alert", alertId);

  const [updated] = await db.select().from(systemAlertsTable).where(eq(systemAlertsTable.id, alertId)).limit(1);
  if (!updated) { res.status(404).json({ error: "not_found", message: "Alert not found" }); return; }

  res.json({ id: updated.id, type: updated.type, severity: updated.severity, title: updated.title, message: updated.message, metadata: updated.metadata ?? null, resolved: updated.resolved, createdAt: updated.createdAt.toISOString(), resolvedAt: updated.resolvedAt?.toISOString() ?? null });
});

export default router;
