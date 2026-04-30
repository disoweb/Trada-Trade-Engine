import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListTrades, ListTradesStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useSearch } from "wouter";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";

export default function TradesPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <TradesContent />
      </Layout>
    </ProtectedRoute>
  );
}

function TradesContent() {
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const initialRentalId = searchParams.get("rentalId") || undefined;
  
  const [status, setStatus] = useState<string>("all");
  
  const { data: trades, isLoading } = useListTrades({
    status: status !== "all" ? status as ListTradesStatus : undefined,
    rentalId: initialRentalId,
    limit: 50,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trades</h2>
          <p className="text-muted-foreground">Comprehensive history of all agent executions.</p>
          {initialRentalId && <p className="text-sm text-primary mt-1">Filtered by Rental ID: {initialRentalId.slice(0,8)}...</p>}
        </div>
        <div className="w-full sm:w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="executed">Executed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
                    <TableHead>Time</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">PnL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades?.items?.length ? (
                    trades.items.map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(trade.createdAt), "MMM dd, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium">{trade.agentName}</TableCell>
                        <TableCell className="font-bold">{trade.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={trade.side === 'buy' ? 'default' : trade.side === 'sell' ? 'destructive' : 'secondary'} className={trade.side === 'buy' ? 'bg-success hover:bg-success/80' : ''}>
                            {trade.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono-num">
                          {trade.entryPrice ? formatCurrency(trade.entryPrice) : '-'}
                        </TableCell>
                        <TableCell className={`text-right font-mono-num font-medium ${!trade.pnl ? '' : trade.pnl > 0 ? 'text-success' : 'text-destructive'}`}>
                          {trade.pnl ? `${trade.pnl > 0 ? '+' : ''}${formatCurrency(trade.pnl)}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={trade.status === 'executed' ? 'default' : trade.status === 'failed' ? 'destructive' : 'outline'} className={trade.status === 'executed' ? 'bg-primary' : ''}>
                            {trade.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/trades/${trade.id}`}>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        No trades found matching your criteria.
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
