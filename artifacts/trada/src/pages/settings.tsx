import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { 
  useGetNotificationPreferences, 
  useUpdateNotificationPreferences, 
  getGetNotificationPreferencesQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <SettingsContent />
      </Layout>
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { data: prefs, isLoading, refetch } = useGetNotificationPreferences({ query: { queryKey: getGetNotificationPreferencesQueryKey() } });
  const updateMutation = useUpdateNotificationPreferences();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    emailEnabled: false,
    telegramEnabled: false,
    telegramChatId: "",
    notifyOnDeposit: false,
    notifyOnWithdrawal: false,
    notifyOnTradeExecuted: false,
    notifyOnTradeFailed: false,
    notifyOnRentalExpiry: false,
    notifyOnCircuitBreaker: false,
  });

  useEffect(() => {
    if (prefs) {
      setFormData({
        emailEnabled: prefs.emailEnabled ?? false,
        telegramEnabled: prefs.telegramEnabled ?? false,
        telegramChatId: prefs.telegramChatId || "",
        notifyOnDeposit: prefs.notifyOnDeposit ?? false,
        notifyOnWithdrawal: prefs.notifyOnWithdrawal ?? false,
        notifyOnTradeExecuted: prefs.notifyOnTradeExecuted ?? false,
        notifyOnTradeFailed: prefs.notifyOnTradeFailed ?? false,
        notifyOnRentalExpiry: prefs.notifyOnRentalExpiry ?? false,
        notifyOnCircuitBreaker: prefs.notifyOnCircuitBreaker ?? false,
      });
    }
  }, [prefs]);

  const handleSave = () => {
    updateMutation.mutate(
      { data: formData },
      {
        onSuccess: () => {
          toast({ title: "Settings Saved", description: "Notification preferences updated." });
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message || err?.message || "Failed to save settings", variant: "destructive" });
        }
      }
    );
  };

  const handleToggle = (field: keyof typeof formData) => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your account preferences and notifications.</p>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-6 space-y-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent></Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Methods</CardTitle>
              <CardDescription>How would you like to receive alerts?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive alerts at your registered email address.</p>
                </div>
                <Switch checked={formData.emailEnabled} onCheckedChange={handleToggle("emailEnabled")} />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Telegram Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive instant messages via Telegram bot.</p>
                  </div>
                  <Switch checked={formData.telegramEnabled} onCheckedChange={handleToggle("telegramEnabled")} />
                </div>
                
                {formData.telegramEnabled && (
                  <div className="pl-6 border-l-2 ml-2 space-y-2">
                    <Label htmlFor="chatId">Telegram Chat ID</Label>
                    <div className="flex max-w-sm gap-2">
                      <Input 
                        id="chatId" 
                        value={formData.telegramChatId} 
                        onChange={(e) => setFormData(prev => ({ ...prev, telegramChatId: e.target.value }))}
                        placeholder="e.g. 123456789"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Message @TradaBot and send /start to get your ID.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alert Events</CardTitle>
              <CardDescription>Select which events trigger a notification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <Label className="flex-1 cursor-pointer">Circuit Breaker Tripped</Label>
                <Switch checked={formData.notifyOnCircuitBreaker} onCheckedChange={handleToggle("notifyOnCircuitBreaker")} />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <Label className="flex-1 cursor-pointer">Trade Execution Failed</Label>
                <Switch checked={formData.notifyOnTradeFailed} onCheckedChange={handleToggle("notifyOnTradeFailed")} />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <Label className="flex-1 cursor-pointer">Trade Executed Successfully</Label>
                <Switch checked={formData.notifyOnTradeExecuted} onCheckedChange={handleToggle("notifyOnTradeExecuted")} />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <Label className="flex-1 cursor-pointer">Rental Expiry Warning</Label>
                <Switch checked={formData.notifyOnRentalExpiry} onCheckedChange={handleToggle("notifyOnRentalExpiry")} />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <Label className="flex-1 cursor-pointer">Deposits Confirmed</Label>
                <Switch checked={formData.notifyOnDeposit} onCheckedChange={handleToggle("notifyOnDeposit")} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex-1 cursor-pointer">Withdrawals Completed</Label>
                <Switch checked={formData.notifyOnWithdrawal} onCheckedChange={handleToggle("notifyOnWithdrawal")} />
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 py-4 px-6 flex justify-end">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
