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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
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
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const adminItems = user?.role === "admin" ? [
    { label: "Admin", href: "/admin", icon: ShieldAlert },
    { label: "Users", href: "/admin/users", icon: Users },
  ] : [];

  const NavContent = () => (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-6 pb-2">
        <h2 className="text-lg font-bold tracking-tight text-primary">TRADA</h2>
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
              <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                <item.icon className="h-4 w-4" />
                {item.label}
              </span>
            </Link>
          ))}
          {user?.role === "admin" && (
            <>
              <div className="mt-4 mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">Admin</div>
              {adminItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <span className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              ))}
            </>
          )}
        </nav>
      </div>
      <div className="mt-auto px-4">
        <div className="flex items-center gap-3 rounded-md px-3 py-3 bg-muted/50 mb-4">
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout} disabled={logoutMutation.isPending}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[240px_1fr] bg-background">
      <aside className="hidden border-r bg-card md:block">
        <NavContent />
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-4 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
          <div className="flex-1 font-bold text-primary">TRADA</div>
        </header>
        <main className="flex flex-1 flex-col p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
