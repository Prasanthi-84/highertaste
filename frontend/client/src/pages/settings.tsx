import { useState, useEffect } from "react";
import {
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} from "@/store/settingsApi";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useDeleteUserMutation,
} from "@/store/userApi";
import type { SettingsData } from "@/store/settingsApi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Smartphone,
  Palette,
  Bell,
  Loader2,
  Save,
  Shield,
  CheckCircle2,
  XCircle,
  CreditCard,
  MessageSquare,
  Eye,
  EyeOff,
  Users,
  UserPlus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { data: res, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateSettingsMutation();
  const { data: usersRes } = useGetUsersQuery();
  const [createUser, { isLoading: isCreatingUser }] = useCreateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const settings = res?.data;
  const users = usersRes?.data || [];

  // Manage Users form
  const [userModal, setUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "staff" });

  // Branding form
  const [branding, setBranding] = useState({
    businessName: "",
    gstin: "",
    address: "",
  });

  // Integration modal
  const [integrationModal, setIntegrationModal] = useState<"razorpay" | "whatsapp" | null>(null);
  const [razorpayForm, setRazorpayForm] = useState({ keyId: "", keySecret: "" });
  const [whatsappForm, setWhatsappForm] = useState({ token: "", connectedNumber: "", templateStatus: "" });
  const [testPhone, setTestPhone] = useState("");
  const [testingWA, setTestingWA] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  // Seed form state from API data
  useEffect(() => {
    if (settings) {
      setBranding({
        businessName: settings.businessName || "",
        gstin: settings.gstin || "",
        address: settings.address || "",
      });
      setRazorpayForm({
        keyId: settings.integrations?.razorpay?.keyId || "",
        keySecret: settings.integrations?.razorpay?.keySecret || "",
      });
      setWhatsappForm({
        token: settings.integrations?.flaxxaWapi?.token || "",
        connectedNumber: settings.integrations?.flaxxaWapi?.connectedNumber || "",
        templateStatus: settings.integrations?.flaxxaWapi?.templateStatus || "Pending",
      });
    }
  }, [settings]);

  // Helpers
  const mask = (val: string) => (val ? "••••" + val.slice(-4) : "Not set");

  const handleSaveBranding = async () => {
    try {
      await updateSettings(branding).unwrap();
      toast.success("Branding saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleSaveRazorpay = async () => {
    try {
      await updateSettings({
        integrations: {
          ...settings?.integrations,
          razorpay: { enabled: true, ...razorpayForm },
        } as SettingsData["integrations"],
      }).unwrap();
      toast.success("Razorpay configuration saved");
      setIntegrationModal(null);
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleSaveWhatsapp = async () => {
    try {
      await updateSettings({
        integrations: {
          ...settings?.integrations,
          flaxxaWapi: { enabled: true, ...whatsappForm },
        } as SettingsData["integrations"],
      }).unwrap();
      toast.success("WhatsApp configuration saved");
      setIntegrationModal(null);
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleTestWhatsapp = async () => {
    if (!testPhone) return toast.error("Enter a phone number to test");
    setTestingWA(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || '/api'}/notifications/whatsapp`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phone: testPhone, message: "Connection Test" })
      });
      const data = await res.json();
      if (data.success) toast.success("Test message triggered!");
      else toast.error(data.message || "Test failed");
    } catch {
      toast.error("Network error during test");
    } finally {
      setTestingWA(false);
    }
  };

  const handleToggleNotification = async (key: string, value: boolean) => {
    try {
      await updateSettings({
        notifications: {
          ...settings?.notifications,
          [key]: value,
        } as SettingsData["notifications"],
      }).unwrap();
      toast.success("Notification preference updated");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      await createUser(newUser).unwrap();
      toast.success("User created successfully");
      setUserModal(false);
      setNewUser({ name: "", email: "", password: "", role: "staff" });
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to create user");
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    if (role === 'admin') {
       toast.error("Cannot delete admin users from here");
       return;
    }
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteUser(id).unwrap();
        toast.success("User deleted");
      } catch {
        toast.error("Failed to delete user");
      }
    }
  };

  const razorpayConnected = settings?.integrations?.razorpay?.enabled;
  const whatsappConnected = settings?.integrations?.flaxxaWapi?.enabled;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#5a141e]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-[#5a141e] tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1 font-medium text-sm">Configure your Satvik catering operations and integrations.</p>
      </div>

      <div className="grid gap-6">
        {/* ─── Branding & Profile ─── */}
        <Card className="border border-slate-100 rounded-xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#5a141e]">
              <div className="p-1.5 bg-[#5a141e]/10 rounded-lg">
                <Palette className="h-4 w-4 text-[#5a141e]" />
              </div>
              Branding & Profile
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs font-medium">Configure how your business appears on invoices and quotes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Business Name</Label>
                <Input
                  value={branding.businessName}
                  onChange={(e) => setBranding({ ...branding, businessName: e.target.value })}
                  className="h-10 bg-slate-50 border-slate-200 focus-visible:ring-[#5a141e]/20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">GSTIN</Label>
                <Input
                  value={branding.gstin}
                  onChange={(e) => setBranding({ ...branding, gstin: e.target.value })}
                  className="h-10 bg-slate-50 border-slate-200 focus-visible:ring-[#5a141e]/20 font-mono"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Address</Label>
                <Input
                  value={branding.address}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  className="h-10 bg-slate-50 border-slate-200 focus-visible:ring-[#5a141e]/20"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="bg-[#5a141e] hover:bg-[#4a1018] text-white font-bold px-6"
              onClick={handleSaveBranding}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* ─── Integrations ─── */}
        <Card className="border border-slate-100 rounded-xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#5a141e]">
              <div className="p-1.5 bg-[#5a141e]/10 rounded-lg">
                <Smartphone className="h-4 w-4 text-[#5a141e]" />
              </div>
              Integrations
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs font-medium">Connect with third-party APIs for payments and messaging.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Razorpay */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Razorpay Gateway
                  <Badge className={cn(
                    "text-[10px] h-5 font-bold border-none shadow-none",
                    razorpayConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {razorpayConnected ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Process UPI and online payments. Key: {mask(settings?.integrations?.razorpay?.keyId || "")}
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-slate-200 font-bold" onClick={() => setIntegrationModal("razorpay")}>
                Configure
              </Button>
            </div>
            <Separator className="bg-slate-50" />
            {/* WhatsApp */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  FlaxxaWapi Automation
                  <Badge className={cn(
                    "text-[10px] h-5 font-bold border-none shadow-none",
                    whatsappConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                  )}>
                    {whatsappConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  Send automated order updates and payment links via FlaxxaWapi.
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-slate-200 font-bold" onClick={() => setIntegrationModal("whatsapp")}>
                Configure
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ─── Manage Users ─── */}
        <Card className="border border-slate-100 rounded-xl shadow-sm bg-white">
          <CardHeader className="flex flex-row items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-[#5a141e]">
                <div className="p-1.5 bg-[#5a141e]/10 rounded-lg">
                  <Users className="h-4 w-4 text-[#5a141e]" />
                </div>
                Manage Users
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">Add or remove staff and team members from the operations hub.</CardDescription>
            </div>
            <Button onClick={() => setUserModal(true)} size="sm" className="bg-[#5a141e] hover:bg-[#4a1018] text-white">
              <UserPlus className="h-4 w-4 mr-2" /> Add User
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {users.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">No users available</div>
            ) : (
              users.map((u: any) => (
                <div key={u.id || u._id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <div>
                    <div className="font-semibold text-sm text-slate-800">{u.name} <Badge variant="secondary" className="ml-2 text-[10px]">{u.role}</Badge></div>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  {u.role !== 'admin' && (
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id || u._id, u.role)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ─── Notifications ─── */}
        <Card className="border border-slate-100 rounded-xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#5a141e]">
              <div className="p-1.5 bg-[#5a141e]/10 rounded-lg">
                <Bell className="h-4 w-4 text-[#5a141e]" />
              </div>
              Notifications
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs font-medium">Choose when you and your customers get notified.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold text-slate-700">Customer Order Confirmations</Label>
                <p className="text-[11px] text-slate-400">Auto-send confirmation when order is placed.</p>
              </div>
              <Switch
                checked={settings?.notifications?.orderConfirmation ?? true}
                onCheckedChange={(v) => handleToggleNotification("orderConfirmation", v)}
              />
            </div>
            <Separator className="bg-slate-50" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold text-slate-700">Kitchen Prep Reminders (24h prior)</Label>
                <p className="text-[11px] text-slate-400">Notify kitchen team before upcoming orders.</p>
              </div>
              <Switch
                checked={settings?.notifications?.kitchenReminder ?? true}
                onCheckedChange={(v) => handleToggleNotification("kitchenReminder", v)}
              />
            </div>
            <Separator className="bg-slate-50" />
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold text-slate-700">Payment Due Alerts</Label>
                <p className="text-[11px] text-slate-400">Get notified when invoices are overdue.</p>
              </div>
              <Switch
                checked={settings?.notifications?.paymentAlerts ?? true}
                onCheckedChange={(v) => handleToggleNotification("paymentAlerts", v)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Razorpay Modal ─── */}
      <Dialog open={integrationModal === "razorpay"} onOpenChange={(o) => !o && setIntegrationModal(null)}>
        <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#5a141e] flex items-center gap-2">
              <Shield className="h-5 w-5" /> Razorpay Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Your credentials are encrypted and never exposed after saving.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">API Key ID</Label>
              <Input
                value={razorpayForm.keyId}
                onChange={(e) => setRazorpayForm({ ...razorpayForm, keyId: e.target.value })}
                placeholder="rzp_live_..."
                className="h-11 bg-slate-50 border-slate-200 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">API Key Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={razorpayForm.keySecret}
                  onChange={(e) => setRazorpayForm({ ...razorpayForm, keySecret: e.target.value })}
                  placeholder="••••••••"
                  className="h-11 bg-slate-50 border-slate-200 font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationModal(null)} className="font-bold">Cancel</Button>
            <Button className="bg-[#5a141e] hover:bg-[#4a1018] text-white font-bold" onClick={handleSaveRazorpay} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── WhatsApp Modal ─── */}
      <Dialog open={integrationModal === "whatsapp"} onOpenChange={(o) => !o && setIntegrationModal(null)}>
        <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#5a141e] flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> FlaxxaWapi Configuration
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Enter your FlaxxaWapi configuration to enable WhatsApp automation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">WAPI Token</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={whatsappForm.token}
                  onChange={(e) => setWhatsappForm({ ...whatsappForm, token: e.target.value })}
                  placeholder="212656387069d4dcc8aa..."
                  className="h-11 bg-slate-50 border-slate-200 font-mono text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Connected Number</Label>
              <Input
                value={whatsappForm.connectedNumber}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, connectedNumber: e.target.value })}
                placeholder="e.g. 919876543210"
                className="h-11 bg-slate-50 border-slate-200 font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Template Status</Label>
              <select
                className="flex h-11 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background font-mono"
                value={whatsappForm.templateStatus}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, templateStatus: e.target.value })}
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIntegrationModal(null)} className="font-bold">Cancel</Button>
            <Button className="bg-[#5a141e] hover:bg-[#4a1018] text-white font-bold" onClick={handleSaveWhatsapp} disabled={isSaving}>
              {isSaving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Add User Modal ─── */}
      <Dialog open={userModal} onOpenChange={setUserModal}>
        <DialogContent className="sm:max-w-[480px] border-none shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#5a141e] flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Add New User
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">Provide an email and password for the new staff member so they can log in.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Name</Label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="e.g. Rahul Kumar"
                className="h-10 bg-slate-50 border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Email Address</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="rahul@hkmvizag.org"
                className="h-10 bg-slate-50 border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Initial Password</Label>
              <Input
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Set a default password"
                className="h-10 bg-slate-50 border-slate-200 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Role</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-slate-50 px-3 py-2 text-sm ring-offset-background"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserModal(false)} className="font-bold">Cancel</Button>
            <Button className="bg-[#5a141e] hover:bg-[#4a1018] text-white font-bold" onClick={handleCreateUser} disabled={isCreatingUser}>
              {isCreatingUser ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
