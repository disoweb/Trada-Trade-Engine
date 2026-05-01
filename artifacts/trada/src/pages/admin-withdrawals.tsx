import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import {
  useListAdminWithdrawals,
  useApproveWithdrawal,
  useRejectWithdrawal,
  ListAdminWithdrawalsStatus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Wallet, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function AdminWithdrawalsPage() {
  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <AdminWithdrawalsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminWithdrawalsContent() {
  const [status, setStatus] = useState<string>("requested");
  const { data: withdrawals, isLoading, refetch } = useListAdminWithdrawals(
    status !== "all" ? { status: status as ListAdminWithdrawalsStatus } : undefined
  );

  const approveMutation = useApproveWithdrawal();
  const rejectMutation = useRejectWithdrawal();
  const { toast } = useToast();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "requested": return <Badge className="bg-warning/15 text-warning border-warning/20">Pending</Badge>;
      case "approved": return <Badge className="bg-primary/10 text-primary border-primary/20">Approved</Badge>;
      case "completed": return <Badge className="bg-success/15 text-success border-success/20">Completed</Badge>;
      case "failed": return <Badge variant="destructive">Failed</Badge>;
      case "rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">{s}</Badge>;
    }
  };

  const handleApprove = (withdrawalId: string) => {
    approveMutation.mutate({ withdrawalId }, {
      onSuccess: () => { toast({ title: "Approved", description: "Withdrawal approved." }); refetch(); },
      onError: (e: any) => { toast({ title: "Error", description: e?.data?.message || "Failed", variant: "destructive" }); }
    });
  };

  const handleReject = (withdrawalId: string) => {
    rejectMutation.mutate({ withdrawalId, data: { reason: rejectReason } }, {
      onSuccess: () => { toast({ title: "Rejected", description: "Withdrawal rejected." }); refetch(); setRejectId(null); setRejectReason(""); },
      onError: (e: any) => { toast({ title: "Error", description: e?.data?.message || "Failed", variant: "destructive" }); }
    });
  };

  const items = withdrawals?.items ?? [];
  const pendingCount = items.filter(w => w.status === "requested").length;
  const pendingTotal = items.filter(w => w.status === "requested").reduce((s, w) => s + w.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Withdrawals</h2>
          <p className="text-muted-foreground text-sm">Review and process withdrawal requests.</p>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-warning">{pendingCount} pending withdrawal{pendingCount !== 1 ? "s" : ""}</p>
            <p className="text-warning/80 mt-0.5">{fmt(pendingTotal)} total awaiting review.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="requested">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{items.length} request{items.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : items.length ? (
        <div className="space-y-3">
          {items.map(w => (
            <Card key={w.id} className={cn(w.status === "requested" && "border-warning/30")}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                      <Wallet className="h-5 w-5 text-warning" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold font-mono-num text-lg">{fmt(w.amount)}</span>
                        {getStatusBadge(w.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {w.network} · to <span className="font-mono">{w.address?.slice(0, 12)}…</span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(w.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  {w.status === "requested" && (
                    <div className="flex gap-2 sm:shrink-0">
                      <Button size="sm" onClick={() => handleApprove(w.id)} disabled={approveMutation.isPending} className="flex-1 sm:flex-none">
                        <Check className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Dialog open={rejectId === w.id} onOpenChange={open => { if (!open) { setRejectId(null); setRejectReason(""); } }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRejectId(w.id)}>
                            <X className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Withdrawal</DialogTitle>
                            <DialogDescription>Provide a reason for rejecting this {fmt(w.amount)} withdrawal request.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 py-2">
                            <Label>Reason</Label>
                            <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Suspicious activity detected" />
                          </div>
                          <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={() => handleReject(w.id)} disabled={!rejectReason || rejectMutation.isPending}>
                              {rejectMutation.isPending ? "Rejecting…" : "Confirm Reject"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Wallet className="h-12 w-12 opacity-20" />
            <p className="font-medium">No withdrawals found</p>
            <p className="text-sm">All clear — no pending requests.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
