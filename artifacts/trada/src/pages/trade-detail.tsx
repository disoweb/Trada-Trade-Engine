import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useGetTrade, getGetTradeQueryKey } from "@workspace/api-client-react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { format } from "date-fns";

export default function TradeDetailPage() {
  const [match, params] = useRoute("/trades/:tradeId");
  
  return (
    <ProtectedRoute>
      <Layout>
        {match && params?.tradeId ? <TradeDetailContent tradeId={params.tradeId} /> : <div>Not found</div>}
      </Layout>
    </ProtectedRoute>
  );
}

function TradeDetailContent({ tradeId }: { tradeId: string }) {
  const { data: trade, isLoading } = useGetTrade(tradeId, { query: { enabled: !!tradeId, queryKey: getGetTradeQueryKey(tradeId) } });

  const formatCurrency = (value?: number | null) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: value < 1 ? 4 : 2,
    }).format(value);
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-32" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!trade) return <div>Trade not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/trades">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trade Details</h2>
          <p className="text-muted-foreground font-mono text-sm">{trade.id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  {trade.symbol} 
                  <Badge variant={trade.side === 'buy' ? 'default' : trade.side === 'sell' ? 'destructive' : 'secondary'} className={`text-sm ${trade.side === 'buy' ? 'bg-success hover:bg-success/80' : ''}`}>
                    {trade.side.toUpperCase()}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">Executed by {trade.agentName}</CardDescription>
              </div>
              <Badge variant={trade.status === 'executed' ? 'default' : trade.status === 'failed' ? 'destructive' : 'outline'} className="text-sm px-3 py-1">
                {trade.status === 'executed' && <CheckCircle2 className="w-4 h-4 mr-1" />}
                {trade.status === 'failed' && <XCircle className="w-4 h-4 mr-1" />}
                {trade.status === 'skipped' && <Info className="w-4 h-4 mr-1" />}
                {trade.status === 'pending' && <AlertCircle className="w-4 h-4 mr-1" />}
                {trade.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-muted/30 p-4 rounded-lg border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time</p>
                <p className="font-medium text-sm">{format(new Date(trade.createdAt), "MMM dd, yyyy HH:mm:ss")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Entry Price</p>
                <p className="font-medium font-mono-num">{formatCurrency(trade.entryPrice)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                <p className="font-medium font-mono-num">{trade.quantity || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Realized PnL</p>
                <p className={`font-medium font-mono-num ${!trade.pnl ? '' : trade.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                  {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${formatCurrency(trade.pnl)}` : '-'}
                </p>
              </div>
            </div>

            {trade.failureReason && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Execution Failed</h4>
                  <p className="text-sm mt-1">{trade.failureReason}</p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                AI Rationale 
                {trade.signalConfidence && (
                  <Badge variant="outline" className="text-xs font-normal ml-2">
                    Confidence: {(trade.signalConfidence * 100).toFixed(0)}%
                  </Badge>
                )}
              </h3>
              <div className="bg-card border p-4 rounded-lg text-sm leading-relaxed">
                {trade.signalRationale || "No rationale provided for this trade."}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Raw Signal Data</CardTitle>
              <CardDescription>Underlying AI model output</CardDescription>
            </CardHeader>
            <CardContent>
              {trade.rawSignal ? (
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[300px] border">
                  {JSON.stringify(trade.rawSignal, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Raw signal data not available.</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Exchange Response</CardTitle>
            </CardHeader>
            <CardContent>
              {trade.exchangeResponse ? (
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-[200px] border">
                  {JSON.stringify(trade.exchangeResponse, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">Exchange response not available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
