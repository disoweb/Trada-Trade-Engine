import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListAdminUsers, getListAdminUsersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function AdminUsersPage() {
  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <AdminUsersContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AdminUsersContent() {
  const { data: usersData, isLoading } = useListAdminUsers({ limit: 50 }, { query: { queryKey: getListAdminUsersQueryKey({ limit: 50 }) } });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <p className="text-muted-foreground">Manage platform users and view balances.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="rounded-md border-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>Joined</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Active Rentals</TableHead>
                    <TableHead className="text-right">Total Trades</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData?.items?.length ? (
                    usersData.items.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(user.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono-num font-medium">
                          {formatCurrency(user.walletBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.activeRentals}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {user.totalTrades}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No users found.
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
