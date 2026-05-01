import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import {
  useGetRental,
  getGetRentalQueryKey,
  useRenewRental,
  useCancelRental,
  usePauseRental,
  useResumeRental,
  useResetCircuitBreaker
} from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Pause, AlertOctagon, RefreshCw, XCircle, ShieldAlert, Calendar, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "wouter";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RentalDetailPage() {
  const [match, params] = useRoute("/rentals/:rentalId");

  return (
    <ProtectedRoute>
      <Layout>
        {match && params?.rentalId ? <RentalDetailContent rentalId={params.rentalId} /> : <div>Not found</div>}
      </Layout>
    </ProtectedRoute>
  );
}

function RentalDetailContent({ rentalId }: { rentalId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: rental, isLoading, refetch } = useGetRental(rentalId, { query: { enabled: !!rentalId, queryKey: getGetRentalQueryKey(rentalId) } });

  const pauseMutation = usePauseRental();
  const resumeMutation = useResumeRental();
  const cancelMutation = useCancelRental();
  const resetMutation = useResetCircuitBreaker();
  const renewMutation = useRenewRental();

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDuration, setRenewDuration] = useState<"7" | "30" | "90">("30");

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const act = (mutation: any, name: string, payload?: any) => {
    mutation.mutate(payload ?? { rentalId }, {
      onSuccess: () => {
        toast({ title: "Success", description: `Rental ${name} successfully.` });
        refetch();
        if (name === "renewed") setRenewOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.data?.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  const getStatusBadge = (s?: string) => {
    switch (s) {
      case "active": return <Badge className="bg-success/15 text-success border-success/20"><Play className="w-3 h-3 mr-1" />Active</Badge>;
      case "paused": return <Badge className="bg-warning/15 text-warning border-warning/20"><Pause className="w-3 h-3 mr-1" />Paused</Badge>;
      case "expired": return <Badge variant="secondary">Expired</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return null;
    }
  };

  const getProgress = () => {
    if (!rental?.startAt || !rental?.expiresAt) return 0;
    const s = new Date(rental.startAt).getTime();
    const e = new Date(rental.expiresAt).getTime();
    return Math.min(Math.max(((Date.now() - s) / (e - s)) * 100, 0), 100);
  };

  const getDaysRemaining = () => {
    if (!rental?.expiresAt) return null;
    const d = differenceInDays(new Date(rental.expiresAt), new Date());
    const h = differenceInHours(new Date(rental.expiresAt), new Date()) % 24;
    if (d < 0) return "Expired";
    if (d === 0) return `${h}h remaining`;
    return `${d}d ${h}h remaining`;
  };

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-40" />
      <div className="grid md:grid-cols-3 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
    </div>
  );

  if (!rental) return <div className="text-muted-foreground py-12 text-center">Rental not found</div>;

  const tradePnl = rental.recentTrades?.reduce((s, t) => s + (t.pnl ?? 0), 0) ?? 0;
  const tradeWins = rental.recentTrades?.filter(t => (t.pnl ?? 0) > 0).length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/rentals">
          <Button variant="outline" size="icon" className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{rental.agentName}</h2>
            {getStatusBadge(rental.status)}
            {rental.circuitBreakerTripped && (
              <Badge variant="destructive"><AlertOctagon className="w-3 h-3 mr-1" />CB Tripped</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rental.durationDays}-day rental · started {rental.startAt ? format(new Date(rental.startAt), "MMM d, yyyy") : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {rental.circuitBreakerTripped && (
          <Button variant="destructive" size="sm" onClick={() => act(resetMutation, "reset")} disabled={resetMutation.isPending}>
            <ShieldAlert className="mr-1.5 h-4 w-4" />Reset Breaker
          </Button>
        )}
        {rental.status === "active" && (
          <Button variant="outline" size="sm" onClick={() => act(pauseMutation, "paused")} disabled={pauseMutation.isPending}>
            <Pause className="mr-1.5 h-4 w-4" />Pause
          </Button>
        )}
        {rental.status === "paused" && (
          <Button variant="outline" size="sm" onClick={() => act(resumeMutation, "resumed")} disabled={resumeMutation.isPending}>
            <Play className="mr-1.5 h-4 w-4" />Resume
          </Button>
        )}
        <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
          <DialogTrigger asChild>
            <Button variant="default" size="sm" disabled={rental.status === "cancelled"}>
              <RefreshCw className="mr-1.5 h-4 w-4" />Renew
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Renew Rental</DialogTitle>
              <DialogDescription>Extend your {rental.agentName} rental.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <RadioGroup value={renewDuration} onValueChange={v => setRenewDuration(v as any)} className="space-y-3">
                {(["7", "30", "90"] as const).map(d => (
                  <div key={d} className={cn("flex items-center gap-3 border p-3.5 rounded-lg cursor-pointer transition-colors", renewDuration === d ? "border-primary bg-primary/5" : "")}>
                    <RadioGroupItem value={d} id={`d-${d}`} />
                    <Label htmlFor={`d-${d}`} className="flex-1 cursor-pointer font-medium">{d} Days</Label>
                    <span className="font-bold font-mono-num text-sm">{fmt(rental.agent.rentalPricePerDay * Number(d))}</span>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
              <Button onClick={() => act(renewMutation, "renewed", { rentalId, data: { durationDays: Number(renewDuration) } })} disabled={renewMutation.isPending}>
                {renewMutation.isPending ? "Processing…" : "Confirm Renewal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {(rental.status === "active" || rental.status === "paused") && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => act(cancelMutation, "cancelled")} disabled={cancelMutation.isPending}>
            <XCircle className="mr-1.5 h-4 w-4" />Cancel
          </Button>
        )}
      </div>

      {rental.circuitBreakerTripped && (
        <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">Circuit Breaker Active</p>
            <p className="mt-0.5 text-destructive/80">Agent paused after {rental.consecutiveFailures} consecutive failed trades. Review the trade history below and reset the breaker when ready.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total PnL</p>
            <p className={cn("text-lg font-bold font-mono-num mt-1", tradePnl >= 0 ? "text-success" : "text-destructive")}>
              {tradePnl > 0 ? "+" : ""}{fmt(tradePnl)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Trade Count</p>
            <p className="text-lg font-bold mt-1">{rental.recentTrades?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Wins</p>
            <p className="text-lg font-bold text-success mt-1">{tradeWins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Rental Cost</p>
            <p className="text-lg font-bold font-mono-num mt-1">{fmt(rental.totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      {rental.startAt && rental.expiresAt && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {format(new Date(rental.startAt), "MMM d")} → {format(new Date(rental.expiresAt), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{getDaysRemaining()}</span>
              </div>
            </div>
            <Progress value={getProgress()} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1.5">{getProgress().toFixed(0)}% of rental period elapsed</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Trades</CardTitle>
            <CardDescription>Latest trades from this rental</CardDescription>
          </div>
          {(rental.recentTrades?.length ?? 0) > 0 && (
            <Link href={`/trades?rentalId=${rental.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {rental.recentTrades?.length ? (
            <div className="space-y-2">
              {rental.recentTrades.map(trade => (
                <div key={trade.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    (trade.pnl ?? 0) > 0 ? "bg-success/10" : (trade.pnl ?? 0) < 0 ? "bg-destructive/10" : "bg-muted"
                  )}>
                    {(trade.pnl ?? 0) > 0 ? <TrendingUp className="h-3.5 w-3.5 text-success" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        "text-xs",
                        trade.side === "buy" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                      )}>
                        {trade.side.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium">{trade.symbol}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">{trade.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(trade.createdAt), "MMM d, HH:mm")}</p>
                  </div>
                  <div className={cn(
                    "text-sm font-bold font-mono-num shrink-0",
                    (trade.pnl ?? 0) > 0 ? "text-success" : (trade.pnl ?? 0) < 0 ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {trade.pnl != null ? `${trade.pnl > 0 ? "+" : ""}${fmt(trade.pnl)}` : "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">No trades executed yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
