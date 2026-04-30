import { Router } from "express";
import { db } from "@workspace/db";
import { notificationPreferencesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateNotificationPreferencesBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatPrefs(p: typeof notificationPreferencesTable.$inferSelect) {
  return {
    userId: p.userId,
    emailEnabled: p.emailEnabled,
    telegramEnabled: p.telegramEnabled,
    telegramChatId: p.telegramChatId ?? null,
    notifyOnDeposit: p.notifyOnDeposit,
    notifyOnWithdrawal: p.notifyOnWithdrawal,
    notifyOnTradeExecuted: p.notifyOnTradeExecuted,
    notifyOnTradeFailed: p.notifyOnTradeFailed,
    notifyOnRentalExpiry: p.notifyOnRentalExpiry,
    notifyOnCircuitBreaker: p.notifyOnCircuitBreaker,
  };
}

router.get("/notifications/preferences", requireAuth, async (req, res) => {
  const prefs = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, req.user!.userId))
    .limit(1);

  if (prefs.length === 0) {
    res.status(404).json({ error: "not_found", message: "Preferences not found" });
    return;
  }

  res.json(formatPrefs(prefs[0]!));
});

router.put("/notifications/preferences", requireAuth, async (req, res) => {
  const parsed = UpdateNotificationPreferencesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const existing = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, req.user!.userId))
    .limit(1);

  if (existing.length === 0) {
    res.status(404).json({ error: "not_found", message: "Preferences not found" });
    return;
  }

  const updates: Partial<typeof notificationPreferencesTable.$inferInsert> = {
    updatedAt: new Date(),
  };

  const d = parsed.data;
  if (d.emailEnabled !== undefined) updates.emailEnabled = d.emailEnabled;
  if (d.telegramEnabled !== undefined) updates.telegramEnabled = d.telegramEnabled;
  if (d.telegramChatId !== undefined) updates.telegramChatId = d.telegramChatId ?? undefined;
  if (d.notifyOnDeposit !== undefined) updates.notifyOnDeposit = d.notifyOnDeposit;
  if (d.notifyOnWithdrawal !== undefined) updates.notifyOnWithdrawal = d.notifyOnWithdrawal;
  if (d.notifyOnTradeExecuted !== undefined) updates.notifyOnTradeExecuted = d.notifyOnTradeExecuted;
  if (d.notifyOnTradeFailed !== undefined) updates.notifyOnTradeFailed = d.notifyOnTradeFailed;
  if (d.notifyOnRentalExpiry !== undefined) updates.notifyOnRentalExpiry = d.notifyOnRentalExpiry;
  if (d.notifyOnCircuitBreaker !== undefined) updates.notifyOnCircuitBreaker = d.notifyOnCircuitBreaker;

  await db.update(notificationPreferencesTable).set(updates).where(eq(notificationPreferencesTable.userId, req.user!.userId));

  const updated = await db
    .select()
    .from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, req.user!.userId))
    .limit(1);

  res.json(formatPrefs(updated[0]!));
});

export default router;
