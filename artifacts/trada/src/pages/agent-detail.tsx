import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useGetAgent, useCreateRental, getGetAgentQueryKey, CreateRentalBodyDurationDays } from "@workspace/api-client-react";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShieldAlert, Activity, Zap, Cpu } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function AgentDetailPage() {
  const [match, params] = useRoute("/agents/:agentId");
  
  return (
    <ProtectedRoute>
      <Layout>
        {match && params?.agentId ? <AgentDetailContent agentId={params.agentId} /> : <div>Not found</div>}
      </Layout>
    </ProtectedRoute>
  );
}

function AgentDetailContent({ agentId }: { agentId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: agent, isLoading } = useGetAgent(agentId, { query: { enabled: !!agentId, queryKey: getGetAgentQueryKey(agentId) } });
  const rentMutation = useCreateRental();
  const [duration, setDuration] = useState<"7" | "30" | "90">("30");
  const [open, setOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getRiskBadge = (level?: string) => {
    switch (level) {
      case "low": return <Badge variant="secondary" className="bg-success/10 text-success"><ShieldAlert className="w-3 h-3 mr-1"/> Low Risk</Badge>;
      case "medium": return <Badge variant="secondary" className="bg-warning/10 text-warning"><Activity className="w-3 h-3 mr-1"/> Medium Risk</Badge>;
      case "high": return <Badge variant="secondary" className="bg-destructive/10 text-destructive"><Zap className="w-3 h-3 mr-1"/> High Risk</Badge>;
      default: return null;
    }
  };

  const handleRent = () => {
    rentMutation.mutate(
      { data: { agentId, durationDays: parseInt(duration) as any } },
      {
        onSuccess: (res) => {
          toast({ title: "Agent Rented successfully!", description: "View your rental details now." });
          setOpen(false);
          setLocation(`/rentals/${res.id}`);
        },
        onError: (err: any) => {
          toast({
            title: "Error renting agent",
            description: err?.data?.message || err?.data?.error || "An error occurred",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!agent) return <div>Agent not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/agents">
          <Button variant="outline" size="icon" className="shrink-0 mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 min-w-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Cpu className="h-6 w-6 text-primary shrink-0" /> <span className="truncate">{agent.name}</span>
            </h2>
            <p className="text-muted-foreground text-sm">{agent.symbol} · {agent.strategy}</p>
          </div>
          <div className="shrink-0">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="default" className="w-full sm:w-auto">Rent Agent</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rent {agent.name}</DialogTitle>
                  <DialogDescription>Choose a rental duration. The fee will be deducted from your wallet balance.</DialogDescription>
                </DialogHeader>
                <div className="py-6">
                  <RadioGroup value={duration} onValueChange={(v) => setDuration(v as any)} className="space-y-4">
                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="7" id="r1" />
                      <Label htmlFor="r1" className="flex-1 cursor-pointer">
                        <div className="font-semibold">7 Days</div>
                        <div className="text-sm text-muted-foreground">Short-term trial</div>
                      </Label>
                      <div className="font-mono-num font-bold">{formatCurrency(agent.rentalPricePerDay * 7)}</div>
                    </div>
                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="30" id="r2" />
                      <Label htmlFor="r2" className="flex-1 cursor-pointer">
                        <div className="font-semibold">30 Days</div>
                        <div className="text-sm text-muted-foreground">Standard engagement</div>
                      </Label>
                      <div className="font-mono-num font-bold">{formatCurrency(agent.rentalPricePerDay * 30)}</div>
                    </div>
                    <div className="flex items-center space-x-2 border p-4 rounded-lg cursor-pointer hover:border-primary">
                      <RadioGroupItem value="90" id="r3" />
                      <Label htmlFor="r3" className="flex-1 cursor-pointer">
                        <div className="font-semibold">90 Days</div>
                        <div className="text-sm text-muted-foreground">Long-term commitment</div>
                      </Label>
                      <div className="font-mono-num font-bold">{formatCurrency(agent.rentalPricePerDay * 90)}</div>
                    </div>
                  </RadioGroup>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleRent} disabled={rentMutation.isPending}>
                    {rentMutation.isPending ? "Processing..." : "Confirm Rental"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Performance History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {agent.recentPerformance?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={agent.recentPerformance} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => format(new Date(value), "MMM dd")}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                      labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                    />
                    <Line
                      type="monotone"
                      dataKey="pnl"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No performance data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Risk Profile</p>
                {getRiskBadge(agent.riskLevel)}
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm leading-relaxed">{agent.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-2xl font-bold font-mono-num">{(agent.winRate * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Return</p>
                  <p className={`text-2xl font-bold font-mono-num ${agent.avgReturn >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {agent.avgReturn >= 0 ? '+' : ''}{(agent.avgReturn * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-2xl font-bold font-mono-num">{agent.totalTrades}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Price / Day</p>
                  <p className="text-2xl font-bold font-mono-num">{formatCurrency(agent.rentalPricePerDay)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
