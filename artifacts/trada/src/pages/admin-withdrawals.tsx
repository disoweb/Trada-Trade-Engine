import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { 
  useListAdminWithdrawals, 
  useApproveWithdrawal, 
  useRejectWithdrawal,
  ListAdminWithdrawalsStatus
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "requested": return <Badge variant="secondary" className="bg-warning/20 text-warning hover:bg-warning/20">Pending Approval</Badge>;
      case "approved": return <Badge variant="outline" className="text-primary">Approved</Badge>;
      case "broadcasted": return <Badge variant="outline">Broadcasted</Badge>;
      case "completed": return <Badge variant="default" className="bg-success text-success-foreground">Completed</Badge>;
      case "failed": 
      case "rejected": return <Badge variant="destructive" className="capitalize">{s}</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(
      { withdrawalId: id },
      {
        onSuccess: () => {
          toast({ title: "Approved", description: "Withdrawal approved successfully." });
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message || "Failed to approve", variant: "destructive" });
        }
      }
    );
  };

  const handleReject = () => {
    if (!rejectId) return;
    rejectMutation.mutate(
      { withdrawalId: rejectId, data: { reason: rejectReason || "Rejected by admin" } },
      {
        onSuccess: () => {
          toast({ title: "Rejected", description: "Withdrawal rejected." });
          setRejectId(null);
          setRejectReason("");
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message || "Failed to reject", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Withdrawals</h2>
          <p className="text-muted-foreground">Review and process user withdrawal requests.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="requested">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Network / Address</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals?.items?.length ? (
                    withdrawals.items.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {format(new Date(req.createdAt), "MMM dd, HH:mm")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{req.userId.slice(0,8)}...</TableCell>
                        <TableCell>
                          <div className="font-bold text-xs">{req.network}</div>
                          <div className="font-mono text-xs text-muted-foreground truncate max-w-[150px] lg:max-w-[250px]" title={req.address}>
                            {req.address}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono-num font-medium text-destructive">
                          -{formatCurrency(req.amount)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(req.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          {req.status === 'requested' && (
                            <div className="flex justify-end gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8 text-success hover:bg-success hover:text-success-foreground" onClick={() => handleApprove(req.id)} disabled={approveMutation.isPending}>
                                <Check className="h-4 w-4" />
                              </Button>
                              
                              <Dialog open={rejectId === req.id} onOpenChange={(open) => !open && setRejectId(null)}>
                                <DialogTrigger asChild>
                                  <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setRejectId(req.id)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Reject Withdrawal</DialogTitle>
                                    <DialogDescription>Please provide a reason for rejecting this withdrawal.</DialogDescription>
                                  </DialogHeader>
                                  <div className="py-4">
                                    <Label htmlFor="reason">Reason</Label>
                                    <Input id="reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Invalid address format" />
                                  </div>
                                  <DialogFooter>
                                    <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending || !rejectReason}>Reject</Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No withdrawals found.
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
  );
}
