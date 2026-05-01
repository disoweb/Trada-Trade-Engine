import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListAdminUsers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format, formatDistanceToNow } from "date-fns";
import { Users, Search, Wallet, Cpu, History } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

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
  const { data: usersData, isLoading } = useListAdminUsers({ limit: 100 });
  const [search, setSearch] = useState("");
  const fmt = (v: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

  const users = useMemo(() => {
    const all = usersData?.items ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [usersData, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground text-sm">{usersData?.items?.length ?? 0} registered users</p>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-3">
        {[
          { label: "Total", value: usersData?.items?.length ?? 0, icon: Users },
          { label: "Active Rentals", value: usersData?.items?.reduce((s, u) => s + u.activeRentals, 0) ?? 0, icon: Cpu },
          { label: "Total Trades", value: usersData?.items?.reduce((s, u) => s + u.totalTrades, 0) ?? 0, icon: History },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Users</CardTitle>
          <CardDescription>Platform user accounts and balances</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : users.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">User</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Joined</th>
                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Role</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3">Balance</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Rentals</th>
                    <th className="text-right font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{u.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{u.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                        {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"} className="text-xs">
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-mono-num font-semibold whitespace-nowrap">
                        {fmt(u.walletBalance)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className={cn(u.activeRentals > 0 ? "text-success font-semibold" : "text-muted-foreground")}>
                          {u.activeRentals}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden md:table-cell">
                        {u.totalTrades}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto h-10 w-10 mb-3 opacity-20" />
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
