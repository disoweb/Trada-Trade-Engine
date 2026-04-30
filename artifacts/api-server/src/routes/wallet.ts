import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "@workspace/db";
import {
  walletsTable,
  transactionsTable,
  withdrawalRequestsTable,
  depositAddressesTable,
} from "@workspace/db";
import { eq, and, desc, count } from "drizzle-orm";
import { RequestWithdrawalBody, GetDepositAddressQueryParams, ListTransactionsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

router.get("/wallet", requireAuth, async (req, res) => {
  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (wallets.length === 0) {
    res.status(404).json({ error: "not_found", message: "Wallet not found" });
    return;
  }
  const w = wallets[0]!;
  res.json({
    id: w.id,
    userId: w.userId,
    balance: parseFloat(w.balance),
    currency: w.currency,
    lockedBalance: parseFloat(w.lockedBalance),
    totalDeposited: parseFloat(w.totalDeposited),
    totalWithdrawn: parseFloat(w.totalWithdrawn),
    createdAt: w.createdAt.toISOString(),
  });
});

router.get("/wallet/deposit-address", requireAuth, async (req, res) => {
  const parsed = GetDepositAddressQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "network is required: ETH, BTC, or USDT" });
    return;
  }

  const { network } = parsed.data;
  const wallet = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (wallet.length === 0) {
    res.status(404).json({ error: "not_found", message: "Wallet not found" });
    return;
  }

  const existing = await db
    .select()
    .from(depositAddressesTable)
    .where(and(eq(depositAddressesTable.walletId, wallet[0]!.id), eq(depositAddressesTable.network, network as "ETH" | "BTC" | "USDT")))
    .limit(1);

  if (existing.length > 0) {
    res.json({ address: existing[0]!.address, network, qrCode: null, memo: existing[0]!.memo ?? null });
    return;
  }

  const prefixes: Record<string, string> = { ETH: "0x", BTC: "1", USDT: "T" };
  const address = `${prefixes[network] ?? ""}${uuidv4().replace(/-/g, "").slice(0, 38)}`;
  await db.insert(depositAddressesTable).values({ id: uuidv4(), walletId: wallet[0]!.id, network: network as "ETH" | "BTC" | "USDT", address });
  res.json({ address, network, qrCode: null, memo: null });
});

router.get("/wallet/transactions", requireAuth, async (req, res) => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;
  const offset = parsed.success ? (parsed.data.offset ?? 0) : 0;

  const conditions = [eq(transactionsTable.userId, req.user!.userId)];

  const items = await db
    .select()
    .from(transactionsTable)
    .where(and(...conditions))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(transactionsTable)
    .where(and(...conditions));

  res.json({
    items: items.map((t) => ({
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      currency: t.currency,
      status: t.status,
      description: t.description,
      txHash: t.txHash ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
    total: Number(totalResult?.count ?? 0),
    offset,
    limit,
  });
});

router.post("/wallet/withdraw", requireAuth, async (req, res) => {
  const parsed = RequestWithdrawalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }

  const { amount, address, network, memo: _memo } = parsed.data;

  const wallets = await db.select().from(walletsTable).where(eq(walletsTable.userId, req.user!.userId)).limit(1);
  if (wallets.length === 0) {
    res.status(404).json({ error: "not_found", message: "Wallet not found" });
    return;
  }

  const wallet = wallets[0]!;
  const available = parseFloat(wallet.balance) - parseFloat(wallet.lockedBalance);
  if (amount > available) {
    res.status(400).json({ error: "insufficient_balance", message: "Insufficient available balance" });
    return;
  }

  const withdrawalId = uuidv4();
  const now = new Date();

  await db.insert(withdrawalRequestsTable).values({
    id: withdrawalId,
    userId: req.user!.userId,
    walletId: wallet.id,
    amount: amount.toString(),
    currency: "USDT",
    address,
    network: network as "ETH" | "BTC" | "USDT",
    status: "requested",
  });

  res.status(201).json({
    id: withdrawalId,
    userId: req.user!.userId,
    amount,
    currency: "USDT",
    address,
    network,
    status: "requested",
    rejectionReason: null,
    txHash: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
});

export default router;
