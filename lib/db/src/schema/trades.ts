import { pgTable, text, timestamp, numeric, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradeSideEnum = pgEnum("trade_side", ["buy", "sell", "hold"]);
export const tradeStatusEnum = pgEnum("trade_status", ["pending", "executed", "failed", "skipped"]);

export const tradesTable = pgTable("trades", {
  id: text("id").primaryKey(),
  rentalId: text("rental_id").notNull(),
  agentId: text("agent_id").notNull(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: tradeSideEnum("side").notNull(),
  status: tradeStatusEnum("status").notNull().default("pending"),
  entryPrice: numeric("entry_price", { precision: 20, scale: 8 }),
  exitPrice: numeric("exit_price", { precision: 20, scale: 8 }),
  quantity: numeric("quantity", { precision: 20, scale: 8 }),
  pnl: numeric("pnl", { precision: 20, scale: 8 }),
  signalConfidence: numeric("signal_confidence", { precision: 5, scale: 4 }),
  signalRationale: text("signal_rationale"),
  failureReason: text("failure_reason"),
  rawSignal: jsonb("raw_signal"),
  exchangeResponse: jsonb("exchange_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ createdAt: true, updatedAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
