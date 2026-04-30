import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import {
  useGetWallet,
  useGetDepositAddress,
  useListTransactions,
  getGetWalletQueryKey,
  getListTransactionsQueryKey,
  getGetDepositAddressQueryKey,
  GetDepositAddressNetwork,
  ListTransactionsType
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, Copy, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  const { data: wallet, isLoading: isWalletLoading } = useGetWallet({ query: { queryKey: getGetWalletQueryKey() } });
  const [network, setNetwork] = useState<keyof typeof GetDepositAddressNetwork>("ETH");
  const [txType, setTxType] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  const { data: depositInfo, isLoading: isDepositLoading } = useGetDepositAddress(
    { network },
    { query: { queryKey: getGetDepositAddressQueryKey({ network }) } }
  );

  const { data: transactions, isLoading: isTxLoading } = useListTransactions(
    { limit: 20, type: txType !== "all" ? txType as ListTransactionsType : undefined },
    { query: { queryKey: getListTransactionsQueryKey({ limit: 20, type: txType !== "all" ? txType as ListTransactionsType : undefined }) } }
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Wallet</h2>
          <p className="text-muted-foreground">Manage your funds and view transactions.</p>
        </div>
        <Link href="/wallet/withdraw">
          <Button>
            <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono-num">{formatCurrency(wallet?.balance || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked Balance</CardTitle>
            <WalletIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono-num">{formatCurrency(wallet?.lockedBalance || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deposited</CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isWalletLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold font-mono-num">{formatCurrency(wallet?.totalDeposited || 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deposit Funds</CardTitle>
            <CardDescription>Send funds to your unique deposit address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Network</label>
              <Select value={network} onValueChange={(val) => setNetwork(val as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                  <SelectItem value="BTC">Bitcoin</SelectItem>
                  <SelectItem value="USDT">Tether (ERC20)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">Deposit Address</label>
              {isDepositLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-muted p-2 rounded-md font-mono text-sm break-all">
                    {depositInfo?.address}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(depositInfo?.address || "")}>
                    {copied ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Recent wallet activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Select value={txType} onValueChange={setTxType}>
                <SelectTrigger className="w-[180px]">
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
            </div>

            {isTxLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions?.items?.length ? (
                      transactions.items.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(tx.createdAt), "MMM dd, HH:mm")}
                          </TableCell>
                          <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
                          <TableCell>
                            <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'failed' ? 'destructive' : 'secondary'}>
                              {tx.status}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono-num font-medium ${tx.amount > 0 ? "text-success" : "text-foreground"}`}>
                            {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
