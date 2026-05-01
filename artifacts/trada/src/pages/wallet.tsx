import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import {
  useGetWallet,
  useGetDepositAddress,
  useListTransactions,
  GetDepositAddressNetwork,
  ListTransactionsType
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Copy, CheckCircle2,
  RefreshCw, DollarSign, Lock, TrendingDown, Zap, Repeat
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function WalletPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <WalletContent />
      </Layout>
    </ProtectedRoute>
  );
}

function WalletContent() {
  const { data: wallet, isLoading: isWalletLoading } = useGetWallet();
  const [network, setNetwork] = useState<keyof typeof GetDepositAddressNetwork>("ETH");
  const [txType, setTxType] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  const { data: depositInfo, isLoading: isDepositLoading } = useGetDepositAddress({ network });
  const { data: transactions, isLoading: isTxLoading } = useListTransactions({
    limit: 30,
    type: txType !== "all" ? txType as ListTransactionsType : undefined,
  });

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const txIcon = (type: string) => {
    switch (type) {
      case "deposit": return <div className="h-9 w-9 rounded-full bg-success/10 flex items-center justify-center shrink-0"><ArrowDownLeft className="h-4 w-4 text-success" /></div>;
      case "withdrawal": return <div className="h-9 w-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0"><ArrowUpRight className="h-4 w-4 text-warning" /></div>;
      case "trade_fee": return <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Zap className="h-4 w-4 text-primary" /></div>;
      case "rental_fee": return <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center shrink-0"><Repeat className="h-4 w-4 text-foreground" /></div>;
      case "adjustment": return <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><TrendingDown className="h-4 w-4 text-primary" /></div>;
      default: return <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0"><DollarSign className="h-4 w-4 text-muted-foreground" /></div>;
    }
  };

  const txLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      trade_fee: "Trade Fee",
      rental_fee: "Rental Fee",
      adjustment: "Adjustment",
    };
    return labels[type] ?? type;
  };

  const netPnL = (wallet?.totalDeposited ?? 0) > 0
    ? (wallet?.balance ?? 0) - (wallet?.totalDeposited ?? 0) + (wallet?.totalWithdrawn ?? 0)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Wallet</h2>
          <p className="text-muted-foreground text-sm">Manage your USDT funds.</p>
        </div>
        <Link href="/wallet/withdraw">
          <Button className="w-full sm:w-auto">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold font-mono-num">{fmt(wallet?.balance ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">USDT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold font-mono-num">{fmt(wallet?.lockedBalance ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">In trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deposited</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold font-mono-num">{fmt(wallet?.totalDeposited ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total in</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net PnL</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? <Skeleton className="h-8 w-24" /> : netPnL != null ? (
              <div className={cn("text-2xl font-bold font-mono-num", netPnL >= 0 ? "text-success" : "text-destructive")}>
                {netPnL > 0 ? "+" : ""}{fmt(netPnL)}
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">vs. deposited</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="transactions" className="flex-1 sm:flex-none">Transactions</TabsTrigger>
          <TabsTrigger value="deposit" className="flex-1 sm:flex-none">Deposit</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
              <div>
                <CardTitle className="text-base">Transaction History</CardTitle>
                <CardDescription>All wallet activity</CardDescription>
              </div>
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="trade_fee">Trade Fees</SelectItem>
                  <SelectItem value="rental_fee">Rental Fees</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isTxLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : transactions?.items?.length ? (
                <div className="space-y-1">
                  {transactions.items.map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b last:border-0">
                      {txIcon(tx.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{txLabel(tx.type)}</p>
                        <p className="text-xs text-muted-foreground truncate">{tx.description ?? tx.txHash ?? "—"}</p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn(
                          "text-sm font-semibold font-mono-num",
                          tx.type === "deposit" ? "text-success" :
                          tx.type === "withdrawal" ? "text-destructive" : "text-foreground"
                        )}>
                          {tx.type === "deposit" ? "+" : tx.type === "withdrawal" ? "-" : ""}
                          {fmt(Math.abs(tx.amount))}
                        </div>
                        <Badge variant={tx.status === "completed" ? "secondary" : tx.status === "failed" ? "destructive" : "outline"} className="text-xs mt-0.5">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <WalletIcon className="mx-auto h-10 w-10 mb-3 opacity-20" />
                  <p className="text-sm">No transactions found</p>
                  <p className="text-xs mt-1">Make a deposit to get started</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposit" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle>Deposit USDT</CardTitle>
              <CardDescription>Send USDT to your unique wallet address. Funds arrive after network confirmation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Network</label>
                <Select value={network} onValueChange={v => setNetwork(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select network" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETH">Ethereum (ERC-20)</SelectItem>
                    <SelectItem value="BTC">Bitcoin (BEP-20)</SelectItem>
                    <SelectItem value="USDT">TRON (TRC-20)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Your Deposit Address</label>
                {isDepositLoading ? (
                  <Skeleton className="h-12 w-full rounded-md" />
                ) : (
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <div className="flex items-start gap-2">
                      <code className="flex-1 text-xs sm:text-sm font-mono break-all leading-relaxed">
                        {depositInfo?.address ?? "—"}
                      </code>
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 mt-0.5" onClick={() => copyToClipboard(depositInfo?.address ?? "")}>
                        {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-warning/10 border border-warning/20 p-3 text-sm text-warning space-y-1">
                <p className="font-semibold">Important</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 text-warning/80">
                  <li>Only send USDT on the selected network.</li>
                  <li>Sending any other asset may result in permanent loss.</li>
                  <li>Minimum deposit: $10 USDT.</li>
                  <li>Funds are credited after 12 confirmations.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
