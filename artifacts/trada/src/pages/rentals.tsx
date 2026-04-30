import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useListRentals, ListRentalsStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { useState } from "react";
import { format } from "date-fns";
import { Play, Pause, AlertOctagon } from "lucide-react";

export default function RentalsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <RentalsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function RentalsContent() {
  const [status, setStatus] = useState<string>("all");
  const { data: rentals, isLoading } = useListRentals(
    status !== "all" ? { status: status as ListRentalsStatus } : undefined
  );

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "active": return <Badge variant="default" className="bg-success text-success-foreground"><Play className="w-3 h-3 mr-1"/> Active</Badge>;
      case "paused": return <Badge variant="secondary" className="bg-warning text-warning-foreground"><Pause className="w-3 h-3 mr-1"/> Paused</Badge>;
      case "pending": return <Badge variant="outline">Pending</Badge>;
      case "expired": return <Badge variant="secondary">Expired</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{s}</Badge>;
    }
  };

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
          <h2 className="text-3xl font-bold tracking-tight">Rentals</h2>
          <p className="text-muted-foreground">Manage your active and past agent rentals.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rentals</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : rentals?.items?.length ? (
          rentals.items.map(rental => (
            <Card key={rental.id} className={`flex flex-col h-full ${rental.circuitBreakerTripped ? 'border-destructive' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{rental.agentName}</CardTitle>
                  {getStatusBadge(rental.status)}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4 pt-0">
                {rental.circuitBreakerTripped && (
                  <div className="flex items-center text-destructive text-sm font-medium bg-destructive/10 p-2 rounded-md">
                    <AlertOctagon className="w-4 h-4 mr-2" />
                    Circuit Breaker Tripped
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Duration</p>
                    <p className="font-medium">{rental.durationDays} Days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Total Cost</p>
                    <p className="font-medium font-mono-num">{formatCurrency(rental.totalCost)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Start Date</p>
                    <p className="font-medium">
                      {rental.startAt ? format(new Date(rental.startAt), "MMM dd, yyyy") : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Expires</p>
                    <p className="font-medium">
                      {rental.expiresAt ? format(new Date(rental.expiresAt), "MMM dd, yyyy") : "-"}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3">
                <Link href={`/rentals/${rental.id}`} className="w-full">
                  <Button className="w-full" variant={rental.status === 'active' ? "default" : "outline"}>
                    Manage Rental
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            No rentals found.
          </div>
        )}
      </div>
    </div>
  );
}
