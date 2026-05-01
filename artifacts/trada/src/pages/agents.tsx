import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListAgents } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { ShieldAlert, Zap, Cpu, Activity, Search, TrendingUp, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <AgentsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AgentsContent() {
  const { data: agents, isLoading } = useListAgents();
  const [search, setSearch] = useState("");
  const [risk, setRisk] = useState("all");
  const [sort, setSort] = useState("winRate");

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "low": return <Badge variant="secondary" className="bg-success/10 text-success border-success/20"><ShieldAlert className="w-3 h-3 mr-1 shrink-0" />Low Risk</Badge>;
      case "medium": return <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20"><Activity className="w-3 h-3 mr-1 shrink-0" />Medium Risk</Badge>;
      case "high": return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20"><Zap className="w-3 h-3 mr-1 shrink-0" />High Risk</Badge>;
      default: return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const filtered = useMemo(() => {
    let items = agents?.items ?? [];
    if (search) items = items.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.symbol.toLowerCase().includes(search.toLowerCase()) || a.strategy.toLowerCase().includes(search.toLowerCase()));
    if (risk !== "all") items = items.filter(a => a.riskLevel === risk);
    items = [...items].sort((a, b) => {
      switch (sort) {
        case "winRate": return b.winRate - a.winRate;
        case "avgReturn": return b.avgReturn - a.avgReturn;
        case "price": return a.rentalPricePerDay - b.rentalPricePerDay;
        case "trades": return b.totalTrades - a.totalTrades;
        default: return 0;
      }
    });
    return items;
  }, [agents, search, risk, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Agents</h2>
        <p className="text-muted-foreground text-sm">Browse, filter, and rent intelligent trading agents.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents, symbols, strategies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={risk} onValueChange={setRisk}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risks</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="winRate">Win Rate</SelectItem>
              <SelectItem value="avgReturn">Avg Return</SelectItem>
              <SelectItem value="price">Price ↑</SelectItem>
              <SelectItem value="trades">Most Trades</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-2 pb-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Skeleton className="h-12 rounded-md" />
                  <Skeleton className="h-12 rounded-md" />
                  <Skeleton className="h-12 rounded-md" />
                  <Skeleton className="h-12 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filtered.length ? (
          filtered.map(agent => (
            <Card key={agent.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Cpu className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="truncate">{agent.name}</span>
                    </CardTitle>
                    <CardDescription className="text-xs">{agent.symbol} · {agent.strategy}</CardDescription>
                  </div>
                  {getRiskBadge(agent.riskLevel)}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 pt-0">
                <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className={cn("rounded-lg p-2.5 text-center", "bg-success/5 border border-success/10")}>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <Trophy className="h-3 w-3 text-success" />
                      <p className="text-xs text-muted-foreground">Win Rate</p>
                    </div>
                    <p className="font-bold text-success font-mono-num text-sm">{(agent.winRate).toFixed(1)}%</p>
                  </div>
                  <div className={cn("rounded-lg p-2.5 text-center", agent.avgReturn >= 0 ? "bg-success/5 border border-success/10" : "bg-destructive/5 border border-destructive/10")}>
                    <div className="flex items-center justify-center gap-1 mb-0.5">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Avg Return</p>
                    </div>
                    <p className={cn("font-bold font-mono-num text-sm", agent.avgReturn >= 0 ? "text-success" : "text-destructive")}>
                      {agent.avgReturn >= 0 ? "+" : ""}{(agent.avgReturn * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Total Trades</p>
                    <p className="font-bold font-mono-num text-sm">{agent.totalTrades.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Min Balance</p>
                    <p className="font-bold font-mono-num text-sm">{fmt(agent.minBalance)}</p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-0 gap-2 flex-col">
                <div className="w-full flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Daily price</span>
                  <span className="font-bold font-mono-num">{fmt(agent.rentalPricePerDay)}<span className="text-muted-foreground font-normal">/day</span></span>
                </div>
                <Link href={`/agents/${agent.id}`} className="w-full">
                  <Button className="w-full" size="sm">View Agent</Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <Cpu className="mx-auto h-10 w-10 mb-3 opacity-20" />
            <p className="font-medium">No agents match your filters</p>
            <Button variant="link" onClick={() => { setSearch(""); setRisk("all"); }}>Clear filters</Button>
          </div>
        )}
      </div>
    </div>
  );
}
