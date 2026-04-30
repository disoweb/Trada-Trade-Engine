import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListAdminAlerts, getListAdminAlertsQueryKey, useResolveAlert } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ShieldAlert, AlertTriangle, Activity, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminAlertsPage() {
  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <AdminAlertsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminAlertsContent() {
  const { data: alerts, isLoading, refetch } = useListAdminAlerts(
    { resolved: false }, 
    { query: { queryKey: getListAdminAlertsQueryKey({ resolved: false }) } }
  );

  const resolveMutation = useResolveAlert();
  const { toast } = useToast();

  const handleResolve = (id: string) => {
    resolveMutation.mutate(
      { alertId: id },
      {
        onSuccess: () => {
          toast({ title: "Resolved", description: "Alert marked as resolved." });
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message || "Failed to resolve alert", variant: "destructive" });
        }
      }
    );
  };

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'critical': return <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />;
      default: return <Activity className="h-5 w-5 text-primary mt-0.5" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">System Alerts</h2>
        <p className="text-muted-foreground">Unresolved system anomalies and execution failures.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6 flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : alerts?.items?.length ? (
          alerts.items.map((alert) => (
            <Card key={alert.id} className={alert.severity === 'critical' ? 'border-destructive/50 shadow-sm' : ''}>
              <CardContent className="p-6 flex gap-4 sm:items-start items-center flex-col sm:flex-row">
                <div className="shrink-0 hidden sm:block">
                  {getSeverityIcon(alert.severity)}
                </div>
                <div className="flex-1 w-full space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="sm:hidden">{getSeverityIcon(alert.severity)}</span>
                        <h3 className="font-semibold text-lg">{alert.title}</h3>
                        <Badge variant="outline" className="text-xs font-mono uppercase bg-muted/50">{alert.type.replace(/_/g, ' ')}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(alert.createdAt), "MMM dd, yyyy HH:mm:ss")}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolveMutation.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed">{alert.message}</p>
                  
                  {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                    <pre className="bg-muted/50 p-3 rounded-md text-xs font-mono border mt-3 overflow-x-auto">
                      {JSON.stringify(alert.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-12 flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 text-success mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-1">All clear</h3>
              <p>There are no unresolved alerts.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
