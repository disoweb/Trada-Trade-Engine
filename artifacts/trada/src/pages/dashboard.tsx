import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useGetDashboardSummary, useGetPerformance, useGetRecentActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Activity, TrendingUp, Cpu, ArrowUpRight, ArrowDownLeft, Zap, AlertOctagon, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <Layout>
        <DashboardContent />
      </Layout>
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: performance, isLoading: isLoadingPerformance } = useGetPerformance({ days: 30 });
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity({ limit: 8 });

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const pnl = summary?.totalPnl ?? 0;
  const winRate = performance?.winRate ? (performance.winRate * 100).toFixed(1) : "—";
  const successRate = summary && summary.totalTrades > 0
    ? ((summary.successfulTrades / summary.totalTrades) * 100).toFixed(1)
    : "—";

  const activityIcon = (type?: string) => {
    switch (type) {
      case "deposit": return <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center shrink-0"><ArrowDownLeft className="h-4 w-4 text-success" /></div>;
      case "withdrawal": return <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center shrink-0"><ArrowUpRight className="h-4 w-4 text-warning" /></div>;
      case "trade": return <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><Zap className="h-4 w-4 text-primary" /></div>;
      case "rental": return <div className="h-8 w-8 rounded-full bg-secondary/80 flex items-center justify-center shrink-0"><Cpu className="h-4 w-4 text-foreground" /></div>;
      default: return <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0"><Activity className="h-4 w-4 text-muted-foreground" /></div>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground text-sm">Your portfolio overview and recent activity.</p>
        </div>
        {(summary?.circuitBreakerTripped ?? 0) > 0 && (
          <Badge variant="destructive" className="w-fit flex items-center gap-1.5 animate-pulse">
            <AlertOctagon className="h-3.5 w-3.5" />
            {summary!.circuitBreakerTripped} Circuit Breaker Tripped
          </Badge>
        )}
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold font-mono-num">{fmt(summary?.walletBalance ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Available USDT</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-24" /> : (
              <div className={`text-2xl font-bold font-mono-num ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                {pnl > 0 ? "+" : ""}{fmt(pnl)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{summary?.activeRentals ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Running rentals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingPerformance ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold">{winRate}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">{summary?.successfulTrades ?? 0} / {summary?.totalTrades ?? 0} trades</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Link href="/wallet" className="col-span-1">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
              <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                <ArrowDownLeft className="h-5 w-5 text-success" />
              </div>
              <span className="text-sm font-medium text-center">Deposit</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/wallet/withdraw" className="col-span-1">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
              <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-warning" />
              </div>
              <span className="text-sm font-medium text-center">Withdraw</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/agents" className="col-span-1">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium text-center">Rent Agent</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portfolio" className="col-span-1">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors h-full">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-5">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-foreground" />
              </div>
              <span className="text-sm font-medium text-center">Portfolio</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>PnL Performance</CardTitle>
              <CardDescription>Cumulative profit & loss over 30 days</CardDescription>
            </div>
            {!isLoadingPerformance && performance && (
              <div className="text-right">
                <div className={`text-sm font-bold font-mono-num ${(performance.totalReturn ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                  {(performance.totalReturn ?? 0) > 0 ? "+" : ""}{fmt(performance.totalReturn ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">30d PnL</div>
              </div>
            )}
          </CardHeader>
          <CardContent className="pl-2">
            {isLoadingPerformance ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performance?.points ?? []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => format(new Date(v), "MMM d")} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={55} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      labelFormatter={(v) => format(new Date(v), "MMM d, yyyy")}
                      formatter={(v: number) => [fmt(v), "Balance"]}
                    />
                    <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Activity</CardTitle>
            <Link href="/wallet">
              <Button variant="ghost" size="sm" className="text-xs h-7">View all</Button>
            </Link>
          </CardHeader>
          <CardContent className="px-4">
            {isLoadingActivity ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activity?.items?.length ? (
                  activity.items.map(item => (
                    <div key={item.id} className="flex items-start gap-3">
                      {activityIcon(item.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground/70 mt-0.5">
                          {format(new Date(item.createdAt), "MMM d, HH:mm")}
                        </p>
                      </div>
                      {item.amount != null && (
                        <div className={`text-sm font-semibold font-mono-num shrink-0 ${item.amount > 0 ? "text-success" : item.amount < 0 ? "text-destructive" : "text-foreground"}`}>
                          {item.amount > 0 ? "+" : ""}{fmt(item.amount)}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">No recent activity</p>
                    <Link href="/wallet">
                      <Button variant="link" size="sm" className="mt-1">Make your first deposit</Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!isLoadingPerformance && performance && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Total Return</p>
              <p className={`text-lg font-bold font-mono-num mt-1 ${(performance.totalReturn ?? 0) >= 0 ? "text-success" : "text-destructive"}`}>
                {(performance.totalReturn ?? 0) > 0 ? "+" : ""}{fmt(performance.totalReturn ?? 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="text-lg font-bold font-mono-num mt-1">{performance.winRate ? `${(performance.winRate * 100).toFixed(1)}%` : "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Successful Trades</p>
              <p className="text-lg font-bold text-success font-mono-num mt-1">
                {summary?.successfulTrades ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-lg font-bold font-mono-num mt-1">{successRate}%</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
