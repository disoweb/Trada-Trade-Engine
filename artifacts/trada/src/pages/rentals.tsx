import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListRentals, ListRentalsStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useState } from "react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { Play, Pause, AlertOctagon, Cpu, Calendar, ArrowRight, RefreshCw, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RentalsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <RentalsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function RentalsContent() {
  const [status, setStatus] = useState<string>("all");
  const { data: rentals, isLoading } = useListRentals(
    status !== "all" ? { status: status as ListRentalsStatus } : undefined
  );

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getStatusConfig = (s: string) => {
    switch (s) {
      case "active": return { badge: <Badge className="bg-success/15 text-success border-success/20 hover:bg-success/20"><Play className="w-3 h-3 mr-1" />Active</Badge>, color: "text-success" };
      case "paused": return { badge: <Badge className="bg-warning/15 text-warning border-warning/20 hover:bg-warning/20"><Pause className="w-3 h-3 mr-1" />Paused</Badge>, color: "text-warning" };
      case "expired": return { badge: <Badge variant="secondary">Expired</Badge>, color: "text-muted-foreground" };
      case "cancelled": return { badge: <Badge variant="destructive">Cancelled</Badge>, color: "text-destructive" };
      default: return { badge: <Badge variant="outline">{s}</Badge>, color: "text-muted-foreground" };
    }
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const days = differenceInDays(expiry, now);
    const hours = differenceInHours(expiry, now) % 24;
    if (days < 0) return null;
    if (days === 0) return `${hours}h remaining`;
    return `${days}d ${hours}h remaining`;
  };

  const getProgress = (startAt: string, expiresAt: string) => {
    const start = new Date(startAt).getTime();
    const end = new Date(expiresAt).getTime();
    const now = Date.now();
    const pct = ((now - start) / (end - start)) * 100;
    return Math.min(Math.max(pct, 0), 100);
  };

  const counts = {
    active: rentals?.items?.filter(r => r.status === "active").length ?? 0,
    paused: rentals?.items?.filter(r => r.status === "paused").length ?? 0,
    expired: rentals?.items?.filter(r => r.status === "expired").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Rentals</h2>
          <p className="text-muted-foreground text-sm">Manage your active AI agent subscriptions.</p>
        </div>
        <Link href="/agents">
          <Button className="w-full sm:w-auto">
            <Cpu className="mr-2 h-4 w-4" /> Rent New Agent
          </Button>
        </Link>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active", value: counts.active, color: "text-success" },
            { label: "Paused", value: counts.paused, color: "text-warning" },
            { label: "Expired", value: counts.expired, color: "text-muted-foreground" },
          ].map(s => (
            <Card key={s.label} className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rentals</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{rentals?.items?.length ?? 0} rental{(rentals?.items?.length ?? 0) !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-md" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : rentals?.items?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {rentals.items.map(rental => {
            const { badge } = getStatusConfig(rental.status);
            const progress = rental.startAt && rental.expiresAt ? getProgress(rental.startAt, rental.expiresAt) : 0;
            const remaining = rental.expiresAt ? getDaysRemaining(rental.expiresAt) : null;
            const isActive = rental.status === "active" || rental.status === "paused";

            return (
              <Card key={rental.id} className={cn("flex flex-col", rental.circuitBreakerTripped && "border-destructive/40 bg-destructive/5")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Cpu className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{rental.agentName}</CardTitle>
                        <p className="text-xs text-muted-foreground">{rental.durationDays}-day rental</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {badge}
                      {rental.circuitBreakerTripped && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertOctagon className="h-2.5 w-2.5 mr-1" />CB Tripped
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-3 pt-0">
                  {isActive && rental.startAt && rental.expiresAt && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{remaining ?? "Expired"}</span>
                        </div>
                        <span>{progress.toFixed(0)}% elapsed</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />Started
                      </p>
                      <p className="font-medium text-xs mt-0.5">
                        {rental.startAt ? format(new Date(rental.startAt), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />Expires
                      </p>
                      <p className="font-medium text-xs mt-0.5">
                        {rental.expiresAt ? format(new Date(rental.expiresAt), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="font-semibold font-mono-num text-xs mt-0.5">{fmt(rental.totalCost)}</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2">
                      <p className="text-xs text-muted-foreground">Failures</p>
                      <p className={cn("font-semibold text-xs mt-0.5", (rental.consecutiveFailures ?? 0) > 0 ? "text-destructive" : "")}>
                        {rental.consecutiveFailures ?? 0} consecutive
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="gap-2 pt-3">
                  <Link href={`/rentals/${rental.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Manage <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Link href={`/trades?rentalId=${rental.id}`}>
                    <Button variant="ghost" size="sm">
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Trades
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Cpu className="h-12 w-12 opacity-20" />
            <p className="font-medium">No rentals found</p>
            <p className="text-sm text-center">Start by renting an AI trading agent from the marketplace.</p>
            <Link href="/agents">
              <Button variant="default" className="mt-2">Browse Agents</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
