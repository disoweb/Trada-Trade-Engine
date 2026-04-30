import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useGetAdminDashboard, getGetAdminDashboardQueryKey, AdminDashboardSystemHealth } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, AlertTriangle, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <AdminContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminContent() {
  const { data: dashboard, isLoading } = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getHealthBadge = (health?: AdminDashboardSystemHealth) => {
    switch(health) {
      case "healthy": return <Badge className="bg-success hover:bg-success"><ShieldCheck className="w-4 h-4 mr-1"/> Healthy</Badge>;
      case "degraded": return <Badge className="bg-warning hover:bg-warning"><AlertTriangle className="w-4 h-4 mr-1"/> Degraded</Badge>;
      case "critical": return <Badge className="bg-destructive hover:bg-destructive"><ShieldAlert className="w-4 h-4 mr-1"/> Critical</Badge>;
      default: return null;
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-48" /><div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Console</h2>
          <p className="text-muted-foreground">Platform health and high-level metrics.</p>
        </div>
        <div>
          {getHealthBadge(dashboard?.systemHealth)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <Link href="/admin/users" className="text-primary hover:underline">View all users</Link>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeRentals || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.pendingWithdrawals || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="font-mono">{formatCurrency(dashboard?.pendingWithdrawalAmount || 0)}</span> total
            </p>
          </CardContent>
        </Card>
        
        <Card className={(dashboard?.unresolvedAlerts || 0) > 0 ? "border-destructive/50 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Alerts</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${(dashboard?.unresolvedAlerts || 0) > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(dashboard?.unresolvedAlerts || 0) > 0 ? "text-destructive" : ""}`}>
              {dashboard?.unresolvedAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.circuitBreakersTripped || 0} circuit breakers tripped
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Trade Execution (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 border rounded-lg bg-muted/20">
                <span className="font-medium">Total Trades Attempted</span>
                <span className="text-xl font-bold font-mono-num">{dashboard?.totalTradesLast24h || 0}</span>
              </div>
              <div className="flex justify-between items-center p-4 border rounded-lg bg-destructive/10 border-destructive/20 text-destructive">
                <span className="font-medium">Failed Executions</span>
                <span className="text-xl font-bold font-mono-num">{dashboard?.failedTradesLast24h || 0}</span>
              </div>
              {((dashboard?.totalTradesLast24h || 0) > 0) && (
                <div className="text-sm text-center text-muted-foreground pt-2">
                  Failure rate: {(((dashboard?.failedTradesLast24h || 0) / (dashboard?.totalTradesLast24h || 1)) * 100).toFixed(2)}%
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest system anomalies</CardDescription>
            </div>
            <Link href="/admin/alerts" className="text-sm text-primary hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            {dashboard?.recentAlerts?.length ? (
              <div className="space-y-4">
                {dashboard.recentAlerts.slice(0,4).map(alert => (
                  <div key={alert.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                    {alert.severity === 'critical' ? (
                      <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    ) : alert.severity === 'warning' ? (
                      <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    ) : (
                      <Activity className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">{alert.title}</p>
                        <span className="text-xs text-muted-foreground">{format(new Date(alert.createdAt), "HH:mm")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                <p>No recent alerts.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
