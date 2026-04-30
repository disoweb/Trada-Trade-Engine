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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Pause, AlertOctagon, RefreshCw, XCircle, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusBadge = (s?: string) => {
    switch (s) {
      case "active": return <Badge variant="default" className="bg-success text-success-foreground"><Play className="w-3 h-3 mr-1"/> Active</Badge>;
      case "paused": return <Badge variant="secondary" className="bg-warning text-warning-foreground"><Pause className="w-3 h-3 mr-1"/> Paused</Badge>;
      case "pending": return <Badge variant="outline">Pending</Badge>;
      case "expired": return <Badge variant="secondary">Expired</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return null;
    }
  };

  const handleAction = (mutation: any, actionName: string, payload?: any) => {
    mutation.mutate(payload || { rentalId }, {
      onSuccess: () => {
        toast({ title: `Success`, description: `Rental ${actionName} successfully.` });
        refetch();
        if (actionName === "renewed") setRenewOpen(false);
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.data?.message || err?.message || "An error occurred", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-32" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!rental) return <div>Rental not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/rentals">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold tracking-tight">{rental.agentName}</h2>
            {getStatusBadge(rental.status)}
          </div>
          <div className="flex gap-2">
            {rental.circuitBreakerTripped && (
              <Button variant="destructive" onClick={() => handleAction(resetMutation, "reset")} disabled={resetMutation.isPending}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Reset Breaker
              </Button>
            )}
            
            {rental.status === "active" && (
              <Button variant="outline" onClick={() => handleAction(pauseMutation, "paused")} disabled={pauseMutation.isPending}>
                <Pause className="mr-2 h-4 w-4" /> Pause
              </Button>
            )}
            
            {rental.status === "paused" && (
              <Button variant="outline" onClick={() => handleAction(resumeMutation, "resumed")} disabled={resumeMutation.isPending}>
                <Play className="mr-2 h-4 w-4" /> Resume
              </Button>
            )}
            
            <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
              <DialogTrigger asChild>
                <Button variant="default" disabled={rental.status === "cancelled"}><RefreshCw className="mr-2 h-4 w-4" /> Renew</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Renew Rental</DialogTitle>
                  <DialogDescription>Extend your rental duration for {rental.agentName}.</DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <RadioGroup value={renewDuration} onValueChange={(v) => setRenewDuration(v as any)} className="space-y-4">
                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer">
                      <RadioGroupItem value="7" id="r1" />
                      <Label htmlFor="r1" className="flex-1 cursor-pointer">7 Days</Label>
                      <div className="font-mono-num font-bold">{formatCurrency(rental.agent.rentalPricePerDay * 7)}</div>
                    </div>
                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer">
                      <RadioGroupItem value="30" id="r2" />
                      <Label htmlFor="r2" className="flex-1 cursor-pointer">30 Days</Label>
                      <div className="font-mono-num font-bold">{formatCurrency(rental.agent.rentalPricePerDay * 30)}</div>
                    </div>
                  </RadioGroup>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRenewOpen(false)}>Cancel</Button>
                  <Button onClick={() => handleAction(renewMutation, "renewed", { rentalId, data: { durationDays: parseInt(renewDuration) } })} disabled={renewMutation.isPending}>
                    Confirm Renewal
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {(rental.status === "active" || rental.status === "paused") && (
              <Button variant="destructive" onClick={() => handleAction(cancelMutation, "cancelled")} disabled={cancelMutation.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Rental Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {rental.circuitBreakerTripped && (
              <div className="flex items-center p-3 bg-destructive/10 text-destructive rounded-md mb-4 border border-destructive/20">
                <AlertOctagon className="w-5 h-5 mr-3 shrink-0" />
                <div className="text-sm">
                  <strong>Circuit Breaker Active</strong>
                  <p>Agent paused due to {rental.consecutiveFailures} consecutive failed trades.</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <p className="font-medium capitalize">{rental.status}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Duration</p>
                <p className="font-medium">{rental.durationDays} Days</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Start Date</p>
                <p className="font-medium">{rental.startAt ? format(new Date(rental.startAt), "MMM dd, yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Expiry Date</p>
                <p className="font-medium">{rental.expiresAt ? format(new Date(rental.expiresAt), "MMM dd, yyyy") : "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total Cost</p>
                <p className="font-medium font-mono-num">{formatCurrency(rental.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
            <CardDescription>Trades executed by this agent during this rental.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rental.recentTrades?.length ? (
                    rental.recentTrades.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(trade.createdAt), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'buy' ? 'default' : trade.side === 'sell' ? 'destructive' : 'secondary'} className={trade.side === 'buy' ? 'bg-success hover:bg-success/80' : ''}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{trade.status}</TableCell>
                        <TableCell className={`text-right font-mono-num font-medium ${!trade.pnl ? '' : trade.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                          {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${formatCurrency(trade.pnl)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        No trades executed yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {rental.recentTrades?.length > 0 && (
              <div className="mt-4 text-center">
                <Link href={`/trades?rentalId=${rental.id}`}>
                  <Button variant="link">View all trades for this rental</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
