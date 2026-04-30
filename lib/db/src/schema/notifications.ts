import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  emailEnabled: boolean("email_enabled").notNull().default(true),
  telegramEnabled: boolean("telegram_enabled").notNull().default(false),
  telegramChatId: text("telegram_chat_id"),
  notifyOnDeposit: boolean("notify_on_deposit").notNull().default(true),
  notifyOnWithdrawal: boolean("notify_on_withdrawal").notNull().default(true),
  notifyOnTradeExecuted: boolean("notify_on_trade_executed").notNull().default(false),
  notifyOnTradeFailed: boolean("notify_on_trade_failed").notNull().default(true),
  notifyOnRentalExpiry: boolean("notify_on_rental_expiry").notNull().default(true),
  notifyOnCircuitBreaker: boolean("notify_on_circuit_breaker").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferencesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferencesTable.$inferSelect;
