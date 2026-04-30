import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { useRequestWithdrawal, WithdrawalRequestBodyNetwork } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const withdrawSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be at least 0.01"),
  address: z.string().min(5, "Please enter a valid address"),
  network: z.enum(["ETH", "BTC", "USDT"] as const),
  memo: z.string().optional(),
});

type WithdrawFormValues = z.infer<typeof withdrawSchema>;

export default function WithdrawPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <WithdrawContent />
      </Layout>
    </ProtectedRoute>
  );
}

function WithdrawContent() {
  const [, setLocation] = useLocation();
  const withdrawMutation = useRequestWithdrawal();
  const { toast } = useToast();

  const form = useForm<WithdrawFormValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      amount: 0,
      address: "",
      network: "ETH",
      memo: "",
    },
  });

  const onSubmit = (data: WithdrawFormValues) => {
    withdrawMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal requested", description: "Your withdrawal request has been submitted." });
          setLocation("/wallet");
        },
        onError: (err: any) => {
          toast({ 
            title: "Error", 
            description: err?.data?.message || err?.data?.error || "Failed to request withdrawal", 
            variant: "destructive" 
          });
        }
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/wallet">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Request Withdrawal</h2>
          <p className="text-muted-foreground">Withdraw funds from your TRADA wallet.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Withdrawal Details</CardTitle>
            <CardDescription>Enter the destination address and amount.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Network</Label>
              <Select onValueChange={(val) => form.setValue("network", val as any)} defaultValue={form.getValues("network")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">Ethereum (ERC20)</SelectItem>
                  <SelectItem value="BTC">Bitcoin</SelectItem>
                  <SelectItem value="USDT">Tether (ERC20)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Destination Address</Label>
              <Input id="address" placeholder="0x..." {...form.register("address")} />
              {form.formState.errors.address && (
                <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input id="amount" type="number" step="0.01" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">Memo / Tag (Optional)</Label>
              <Input id="memo" {...form.register("memo")} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Link href="/wallet">
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={withdrawMutation.isPending}>
              {withdrawMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
