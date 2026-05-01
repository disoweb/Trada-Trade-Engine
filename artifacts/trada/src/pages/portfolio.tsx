import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useGetPerformance, useGetDashboardSummary, useListTrades } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, Trophy, Target, BarChart2, Calendar, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function PortfolioPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <PortfolioContent />
      </Layout>
    </ProtectedRoute>
  );
}

function PortfolioContent() {
  const [days, setDays] = useState(30);
  const { data: perf, isLoading: isPerfLoading } = useGetPerformance({ days });
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: trades, isLoading: isTradesLoading } = useListTrades({ limit: 100, status: "executed" });

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${(v * 100).toFixed(2)}%`;

  const executedTrades = trades?.items?.filter(t => t.status === "executed") ?? [];
  const wins = executedTrades.filter(t => (t.pnl ?? 0) > 0);
  const losses = executedTrades.filter(t => (t.pnl ?? 0) < 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.pnl ?? 0), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + (t.pnl ?? 0), 0) / losses.length : 0;
  const profitFactor = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : null;

  const symbolGroups = executedTrades.reduce<Record<string, { count: number; pnl: number }>>((acc, t) => {
    if (!acc[t.symbol]) acc[t.symbol] = { count: 0, pnl: 0 };
    acc[t.symbol].count++;
    acc[t.symbol].pnl += t.pnl ?? 0;
    return acc;
  }, {});

  const symbolData = Object.entries(symbolGroups).map(([symbol, data]) => ({ symbol, ...data }));

  const pnlByDay = perf?.points?.map((pt, i, arr) => ({
    date: pt.date,
    pnl: i === 0 ? 0 : (pt.balance ?? 0) - (arr[i - 1].balance ?? 0),
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Portfolio</h2>
          <p className="text-muted-foreground text-sm">Detailed performance analytics and statistics.</p>
        </div>
        <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
            <SelectItem value="30">Last 30 Days</SelectItem>
            <SelectItem value="90">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Return",
            value: isPerfLoading ? null : fmt(perf?.totalReturn ?? 0),
            sub: `${days}d`,
            icon: TrendingUp,
            color: (perf?.totalReturn ?? 0) >= 0 ? "text-success" : "text-destructive",
          },
          {
            label: "Win Rate",
            value: isPerfLoading ? null : perf?.winRate != null ? `${(perf.winRate * 100).toFixed(1)}%` : "—",
            sub: `${wins.length}W / ${losses.length}L`,
            icon: Trophy,
            color: "",
          },
          {
            label: "Winning Trades",
            value: isTradesLoading ? null : `${wins.length}`,
            sub: "profitable",
            icon: Zap,
            color: "text-success",
          },
          {
            label: "Profit Factor",
            value: isTradesLoading ? null : profitFactor != null ? profitFactor.toFixed(2) : "—",
            sub: "win/loss ratio",
            icon: TrendingDown,
            color: "",
          },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <stat.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              {stat.value == null ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <p className={cn("text-xl font-bold font-mono-num", stat.color)}>{stat.value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cumulative PnL Curve</CardTitle>
            <CardDescription>Balance over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isPerfLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (perf?.points?.length ?? 0) > 0 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={perf!.points} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => format(new Date(v), "MMM d")} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={55} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      labelFormatter={v => format(new Date(v), "MMM d, yyyy")}
                      formatter={(v: number) => [fmt(v), "Balance"]}
                    />
                    <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
                No performance data available for this period.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily PnL</CardTitle>
            <CardDescription>Profit and loss per day</CardDescription>
          </CardHeader>
          <CardContent>
            {isPerfLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : pnlByDay.length > 1 ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pnlByDay.slice(1)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => format(new Date(v), "MMM d")} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={45} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      labelFormatter={v => format(new Date(v), "MMM d, yyyy")}
                      formatter={(v: number) => [fmt(v), "PnL"]}
                    />
                    <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                      {pnlByDay.slice(1).map((entry, i) => (
                        <Cell key={i} fill={entry.pnl >= 0 ? "hsl(var(--success))" : "hsl(var(--destructive))"} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No daily data available.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Trade Statistics</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isTradesLoading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : (
              [
                { label: "Total Executed", value: executedTrades.length.toString() },
                { label: "Winning Trades", value: `${wins.length} (${executedTrades.length > 0 ? ((wins.length / executedTrades.length) * 100).toFixed(0) : 0}%)`, positive: true },
                { label: "Losing Trades", value: `${losses.length}`, negative: true },
                { label: "Avg Win", value: avgWin > 0 ? `+${fmt(avgWin)}` : "—", positive: true },
                { label: "Avg Loss", value: avgLoss < 0 ? fmt(avgLoss) : "—", negative: true },
                { label: "Profit Factor", value: profitFactor != null ? profitFactor.toFixed(2) : "—" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">{row.label}</span>
                  <span className={cn("text-sm font-semibold font-mono-num", row.positive ? "text-success" : row.negative ? "text-destructive" : "")}>
                    {row.value}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Performance by Symbol</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isTradesLoading ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : symbolData.length > 0 ? (
              <div className="space-y-3">
                {symbolData.map(s => (
                  <div key={s.symbol}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{s.symbol}</Badge>
                        <span className="text-xs text-muted-foreground">{s.count} trades</span>
                      </div>
                      <span className={cn("text-sm font-bold font-mono-num", s.pnl >= 0 ? "text-success" : "text-destructive")}>
                        {s.pnl > 0 ? "+" : ""}{fmt(s.pnl)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", s.pnl >= 0 ? "bg-success" : "bg-destructive")}
                        style={{ width: `${Math.min(Math.abs(s.pnl) / 200, 1) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No trade data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
