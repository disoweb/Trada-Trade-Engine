import { pgTable, text, timestamp, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const alertTypeEnum = pgEnum("alert_type", [
  "circuit_breaker_tripped",
  "signal_generation_failed",
  "trade_execution_failed",
  "unusual_withdrawal",
  "cron_stalled",
]);

export const alertSeverityEnum = pgEnum("alert_severity", ["info", "warning", "critical"]);

export const systemAlertsTable = pgTable("system_alerts", {
  id: text("id").primaryKey(),
  type: alertTypeEnum("type").notNull(),
  severity: alertSeverityEnum("severity").notNull().default("warning"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const adminAuditLogTable = pgTable("admin_audit_log", {
  id: text("id").primaryKey(),
  adminId: text("admin_id").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(systemAlertsTable).omit({ createdAt: true });
export const insertAuditLogSchema = createInsertSchema(adminAuditLogTable).omit({ createdAt: true });

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type SystemAlert = typeof systemAlertsTable.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogTable.$inferSelect;
