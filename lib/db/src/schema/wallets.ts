import { pgTable, text, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "withdrawal",
  "trade_fee",
  "rental_fee",
  "adjustment",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
]);

export const networkEnum = pgEnum("network", ["ETH", "BTC", "USDT"]);

export const walletsTable = pgTable("wallets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  balance: numeric("balance", { precision: 20, scale: 8 }).notNull().default("0"),
  currency: text("currency").notNull().default("USDT"),
  lockedBalance: numeric("locked_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  totalDeposited: numeric("total_deposited", { precision: 20, scale: 8 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 20, scale: 8 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const depositAddressesTable = pgTable("deposit_addresses", {
  id: text("id").primaryKey(),
  walletId: text("wallet_id").notNull(),
  network: networkEnum("network").notNull(),
  address: text("address").notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: text("id").primaryKey(),
  walletId: text("wallet_id").notNull(),
  userId: text("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USDT"),
  status: transactionStatusEnum("status").notNull().default("completed"),
  description: text("description").notNull(),
  txHash: text("tx_hash"),
  idempotencyKey: text("idempotency_key").unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "requested",
  "approved",
  "broadcasted",
  "completed",
  "failed",
  "rejected",
]);

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  walletId: text("wallet_id").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USDT"),
  address: text("address").notNull(),
  network: networkEnum("network").notNull(),
  status: withdrawalStatusEnum("status").notNull().default("requested"),
  rejectionReason: text("rejection_reason"),
  txHash: text("tx_hash"),
  processedBy: text("processed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ createdAt: true });
export const insertWithdrawalSchema = createInsertSchema(withdrawalRequestsTable).omit({ createdAt: true, updatedAt: true });

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
export type WithdrawalRequest = typeof withdrawalRequestsTable.$inferSelect;
