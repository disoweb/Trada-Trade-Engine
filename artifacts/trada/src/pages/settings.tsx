import { ProtectedRoute } from "@/lib/auth";
import { Layout } from "@/components/layout";
import {
  useGetNotificationPreferences,
  useUpdateNotificationPreferences,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { User, Bell, Lock, Mail, MessageSquare, ShieldAlert } from "lucide-react";

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
  const { user } = useAuth();
  const { data: prefs, isLoading, refetch } = useGetNotificationPreferences();
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
          toast({ title: "Settings Saved", description: "Notification preferences updated successfully." });
          refetch();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.data?.message || "Failed to save settings", variant: "destructive" });
        }
      }
    );
  };

  const toggle = (field: keyof typeof formData) => (checked: boolean) => {
    setFormData(prev => ({ ...prev, [field]: checked }));
  };

  const NotifRow = ({ label, desc, field }: { label: string; desc?: string; field: keyof typeof formData }) => (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-b last:border-0">
      <div className="space-y-0.5 flex-1">
        <Label className="text-sm cursor-pointer">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={!!formData[field]} onCheckedChange={toggle(field)} />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your account and notifications.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Account Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="mt-1 text-xs">
                {user?.role === "admin" ? <ShieldAlert className="h-3 w-3 mr-1" /> : null}
                {user?.role}
              </Badge>
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm">Display Name</Label>
              <Input id="name" defaultValue={user?.name} disabled placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">Email Address</Label>
              <Input id="email" defaultValue={user?.email} disabled placeholder="your@email.com" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Profile editing coming soon. Contact support to update your details.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">Last changed: unknown</p>
            </div>
            <Button variant="outline" size="sm" disabled>Change Password</Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Notification Channels</CardTitle>
              </div>
              <CardDescription>Choose how you receive alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 divide-y">
              <div className="py-3 first:pt-0">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <Label className="text-sm cursor-pointer">Email</Label>
                      <p className="text-xs text-muted-foreground">Alerts sent to {user?.email}</p>
                    </div>
                  </div>
                  <Switch checked={formData.emailEnabled} onCheckedChange={toggle("emailEnabled")} />
                </div>
              </div>
              <div className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#229ED9]/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-[#229ED9]" />
                    </div>
                    <div>
                      <Label className="text-sm cursor-pointer">Telegram</Label>
                      <p className="text-xs text-muted-foreground">Instant messages via bot</p>
                    </div>
                  </div>
                  <Switch checked={formData.telegramEnabled} onCheckedChange={toggle("telegramEnabled")} />
                </div>
                {formData.telegramEnabled && (
                  <div className="mt-3 ml-11 space-y-1.5">
                    <Label htmlFor="chatId" className="text-xs">Telegram Chat ID</Label>
                    <Input
                      id="chatId"
                      value={formData.telegramChatId}
                      onChange={e => setFormData(prev => ({ ...prev, telegramChatId: e.target.value }))}
                      placeholder="e.g. 123456789"
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Message @TradaBot and send /start to get your ID.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Alert Events</CardTitle>
              </div>
              <CardDescription>Choose which events trigger a notification.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <NotifRow label="Circuit Breaker Tripped" desc="Notified when an agent's circuit breaker activates." field="notifyOnCircuitBreaker" />
              <NotifRow label="Trade Execution Failed" desc="Notified when a trade fails to execute." field="notifyOnTradeFailed" />
              <NotifRow label="Trade Executed" desc="Notified on every successful trade." field="notifyOnTradeExecuted" />
              <NotifRow label="Rental Expiry Warning" desc="Notified 3 days before a rental expires." field="notifyOnRentalExpiry" />
              <NotifRow label="Deposit Confirmed" desc="Notified when a deposit is credited." field="notifyOnDeposit" />
              <NotifRow label="Withdrawal Completed" desc="Notified when a withdrawal is processed." field="notifyOnWithdrawal" />
            </CardContent>
            <CardFooter className="flex justify-end bg-muted/30 rounded-b-lg py-3 px-6">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving…" : "Save Preferences"}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
