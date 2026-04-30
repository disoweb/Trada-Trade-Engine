import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListAgents, getListAgentsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ShieldAlert, Zap, Cpu, Activity } from "lucide-react";

export default function AgentsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <AgentsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function AgentsContent() {
  const { data: agents, isLoading } = useListAgents({ query: { queryKey: getListAgentsQueryKey() } });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "low": return <Badge variant="secondary" className="bg-success/10 text-success hover:bg-success/20"><ShieldAlert className="w-3 h-3 mr-1"/> Low Risk</Badge>;
      case "medium": return <Badge variant="secondary" className="bg-warning/10 text-warning hover:bg-warning/20"><Activity className="w-3 h-3 mr-1"/> Medium Risk</Badge>;
      case "high": return <Badge variant="secondary" className="bg-destructive/10 text-destructive hover:bg-destructive/20"><Zap className="w-3 h-3 mr-1"/> High Risk</Badge>;
      default: return <Badge variant="secondary">{level}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Agents</h2>
        <p className="text-muted-foreground">Browse and rent intelligent trading agents.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : agents?.items?.length ? (
          agents.items.map(agent => (
            <Card key={agent.id} className="flex flex-col h-full">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Cpu className="h-5 w-5 text-primary" />
                      {agent.name}
                    </CardTitle>
                    <CardDescription>{agent.symbol} • {agent.strategy}</CardDescription>
                  </div>
                  {getRiskBadge(agent.riskLevel)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{agent.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                  <div>
                    <p className="text-muted-foreground">Win Rate</p>
                    <p className="font-semibold font-mono-num">{(agent.winRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Return</p>
                    <p className={`font-semibold font-mono-num ${agent.avgReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {agent.avgReturn >= 0 ? '+' : ''}{(agent.avgReturn * 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Trades</p>
                    <p className="font-semibold font-mono-num">{agent.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price/Day</p>
                    <p className="font-semibold font-mono-num">{formatCurrency(agent.rentalPricePerDay)}</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href={`/agents/${agent.id}`} className="w-full">
                  <Button className="w-full" variant="default">View Agent</Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No agents available at the moment.
          </div>
        )}
      </div>
    </div>
  );
}
