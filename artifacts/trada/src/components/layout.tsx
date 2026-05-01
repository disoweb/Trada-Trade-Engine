import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Wallet,
  Cpu,
  Repeat,
  History,
  Settings,
  ShieldAlert,
  Users,
  LogOut,
  Menu,
  Bell,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const logoutMutation = useLogout();

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        logout();
      },
    });
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Wallet", href: "/wallet", icon: Wallet },
    { label: "Agents", href: "/agents", icon: Cpu },
    { label: "Rentals", href: "/rentals", icon: Repeat },
    { label: "Trades", href: "/trades", icon: History },
    { label: "Portfolio", href: "/portfolio", icon: TrendingUp },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const adminItems = user?.role === "admin" ? [
    { label: "Overview", href: "/admin", icon: ShieldAlert },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Withdrawals", href: "/admin/withdrawals", icon: Wallet },
    { label: "Alerts", href: "/admin/alerts", icon: Bell },
  ] : [];

  const isActive = (href: string) => {
    if (href === "/admin") return location === "/admin";
    return location.startsWith(href);
  };

  const NavContent = () => (
    <div className="flex h-full flex-col gap-2 py-4">
      <div className="px-6 pb-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-bold tracking-tight">TRADA</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">AI Trading Platform</p>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-0.5 px-3">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}>
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </span>
            </Link>
          ))}
          {user?.role === "admin" && (
            <>
              <div className="mt-5 mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin</div>
              {adminItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <span className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </span>
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>
      <div className="px-3 border-t pt-3">
        <div className="flex items-center gap-3 rounded-md px-3 py-2.5 bg-muted/50 mb-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium leading-tight">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground" onClick={handleLogout} disabled={logoutMutation.isPending}>
          <LogOut className="h-4 w-4" />
          {logoutMutation.isPending ? "Signing out..." : "Sign out"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] bg-background">
      <aside className="hidden border-r bg-card md:block">
        <NavContent />
      </aside>
      <div className="flex flex-col min-w-0">
        <header className="flex h-14 items-center gap-3 border-b bg-card px-4 md:hidden shrink-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <TrendingUp className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-primary">TRADA</span>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-0 p-4 md:p-6 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
