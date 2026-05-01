import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListTrades, ListTradesStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Eye, TrendingUp, TrendingDown, History, Trophy, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TradesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <TradesContent />
      </Layout>
    </ProtectedRoute>
  );
}

function TradesContent() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialRentalId = searchParams.get("rentalId") || undefined;

  const [status, setStatus] = useState<string>("all");

  const { data: trades, isLoading } = useListTrades({
    status: status !== "all" ? status as ListTradesStatus : undefined,
    rentalId: initialRentalId,
    limit: 50,
  });

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const items = trades?.items ?? [];
  const executed = items.filter(t => t.status === "executed");
  const totalPnl = executed.reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const wins = executed.filter(t => (t.pnl ?? 0) > 0).length;
  const winRate = executed.length > 0 ? ((wins / executed.length) * 100).toFixed(0) : null;

  const getSideBadge = (side: string, status: string) => {
    if (status === "skipped") return <Badge variant="secondary" className="text-xs">Skipped</Badge>;
    if (status === "failed") return <Badge variant="destructive" className="text-xs">Failed</Badge>;
    if (side === "buy") return <Badge className="bg-success/15 text-success border-success/20 hover:bg-success/20 text-xs">BUY</Badge>;
    if (side === "sell") return <Badge className="bg-destructive/15 text-destructive border-destructive/20 hover:bg-destructive/20 text-xs">SELL</Badge>;
    return <Badge variant="secondary" className="text-xs">{side.toUpperCase()}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Trade History</h2>
          <p className="text-muted-foreground text-sm">
            {initialRentalId ? "Filtered by rental" : "All trades across your rentals"}
          </p>
        </div>
        {initialRentalId && (
          <Link href="/trades">
            <Button variant="outline" size="sm">View All Trades</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <History className="h-3 w-3" /> Total
            </div>
            <div className="text-xl font-bold">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Trophy className="h-3 w-3" /> Win Rate
            </div>
            <div className="text-xl font-bold">{winRate ? `${winRate}%` : "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Target className="h-3 w-3" /> Executed
            </div>
            <div className="text-xl font-bold">{executed.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" /> Total PnL
            </div>
            <div className={cn("text-xl font-bold font-mono-num", totalPnl >= 0 ? "text-success" : "text-destructive")}>
              {totalPnl > 0 ? "+" : ""}{fmt(totalPnl)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            <SelectItem value="executed">Executed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="skipped">Skipped</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{items.length} trade{items.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i}>
              <CardContent className="flex items-center gap-3 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length ? (
        <div className="space-y-2">
          {items.map(trade => (
            <Card key={trade.id} className={cn(
              "hover:shadow-sm transition-shadow",
              trade.status === "failed" && "border-destructive/20"
            )}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                    trade.status === "executed" && (trade.pnl ?? 0) >= 0 ? "bg-success/10" :
                    trade.status === "executed" && (trade.pnl ?? 0) < 0 ? "bg-destructive/10" :
                    trade.status === "failed" ? "bg-destructive/10" : "bg-muted"
                  )}>
                    {trade.status === "executed" && (trade.pnl ?? 0) >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : trade.status === "executed" && (trade.pnl ?? 0) < 0 ? (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    ) : trade.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <History className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getSideBadge(trade.side, trade.status)}
                      <span className="font-medium text-sm">{trade.symbol}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {trade.agentName}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {trade.entryPrice && (
                        <span className="text-xs text-muted-foreground font-mono-num">
                          @{trade.entryPrice.toLocaleString()}
                        </span>
                      )}
                      {trade.signalConfidence && (
                        <span className="text-xs text-muted-foreground">
                          {(trade.signalConfidence * 100).toFixed(0)}% conf
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {trade.failureReason && (
                      <p className="text-xs text-destructive mt-0.5 truncate">{trade.failureReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {trade.pnl != null && (
                      <div className={cn(
                        "text-sm font-bold font-mono-num",
                        trade.pnl > 0 ? "text-success" : trade.pnl < 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {trade.pnl > 0 ? "+" : ""}{fmt(trade.pnl)}
                      </div>
                    )}
                    <Link href={`/trades/${trade.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <History className="h-12 w-12 opacity-20" />
            <p className="font-medium">No trades found</p>
            <p className="text-sm">Rent an agent to start trading.</p>
            <Link href="/rentals">
              <Button variant="default" className="mt-2">View Rentals</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
