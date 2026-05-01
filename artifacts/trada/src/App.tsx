import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";

import Index from "@/pages/index";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import WalletPage from "@/pages/wallet";
import WithdrawPage from "@/pages/wallet-withdraw";
import AgentsPage from "@/pages/agents";
import AgentDetailPage from "@/pages/agent-detail";
import RentalsPage from "@/pages/rentals";
import RentalDetailPage from "@/pages/rental-detail";
import TradesPage from "@/pages/trades";
import TradeDetailPage from "@/pages/trade-detail";
import PortfolioPage from "@/pages/portfolio";
import SettingsPage from "@/pages/settings";
import AdminDashboardPage from "@/pages/admin";
import AdminUsersPage from "@/pages/admin-users";
import AdminWithdrawalsPage from "@/pages/admin-withdrawals";
import AdminAlertsPage from "@/pages/admin-alerts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Index} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/wallet/withdraw" component={WithdrawPage} />
      <Route path="/agents" component={AgentsPage} />
      <Route path="/agents/:agentId" component={AgentDetailPage} />
      <Route path="/rentals" component={RentalsPage} />
      <Route path="/rentals/:rentalId" component={RentalDetailPage} />
      <Route path="/trades" component={TradesPage} />
      <Route path="/trades/:tradeId" component={TradeDetailPage} />
      <Route path="/portfolio" component={PortfolioPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/admin" component={AdminDashboardPage} />
      <Route path="/admin/users" component={AdminUsersPage} />
      <Route path="/admin/withdrawals" component={AdminWithdrawalsPage} />
      <Route path="/admin/alerts" component={AdminAlertsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
