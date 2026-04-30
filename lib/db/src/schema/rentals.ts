import { pgTable, text, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rentalStatusEnum = pgEnum("rental_status", [
  "pending",
  "active",
  "paused",
  "expired",
  "cancelled",
]);

export const rentalsTable = pgTable("rentals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  agentId: text("agent_id").notNull(),
  status: rentalStatusEnum("status").notNull().default("pending"),
  durationDays: integer("duration_days").notNull(),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull(),
  startAt: timestamp("start_at"),
  expiresAt: timestamp("expires_at"),
  circuitBreakerTripped: boolean("circuit_breaker_tripped").notNull().default(false),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  circuitBreakerThreshold: integer("circuit_breaker_threshold").notNull().default(3),
  pausedBy: text("paused_by"),
  pausedAt: timestamp("paused_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertRentalSchema = createInsertSchema(rentalsTable).omit({ createdAt: true, updatedAt: true });
export type InsertRental = z.infer<typeof insertRentalSchema>;
export type Rental = typeof rentalsTable.$inferSelect;
