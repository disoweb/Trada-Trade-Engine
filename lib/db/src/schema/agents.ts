import { pgTable, text, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);

export const agentsTable = pgTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  symbol: text("symbol").notNull(),
  strategy: text("strategy").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  rentalPricePerDay: numeric("rental_price_per_day", { precision: 10, scale: 2 }).notNull(),
  minBalance: numeric("min_balance", { precision: 10, scale: 2 }).notNull(),
  winRate: numeric("win_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
  avgReturn: numeric("avg_return", { precision: 10, scale: 4 }).notNull().default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agentsTable).omit({ createdAt: true, updatedAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agentsTable.$inferSelect;
