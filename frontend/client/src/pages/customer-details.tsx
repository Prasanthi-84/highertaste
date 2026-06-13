import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Phone, Calendar, MapPin, IndianRupee, ArrowLeft, Edit, Loader2, Building2, Tag, FileText } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  useGetCustomerByIdQuery,
  useUpdateCustomerMutation,
  Customer,
} from "@/store/customerApi";

export default function CustomerDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});

  const { data, isLoading, isError } = useGetCustomerByIdQuery(id!, { skip: !id });
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  const customer = data?.data;

  // Populate form when customer loads or sheet opens
  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        phone: customer.phone || "",
        email: customer.email || "",
        company: customer.company || "",
        customerType: customer.customerType || "individual",
        gstin: customer.gstin || "",
        address: customer.address || { street: "", city: "", state: "", pincode: "" },
        notes: customer.notes || "",
      });
    }
  }, [customer]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.phone?.trim()) {
      return toast.error("Name and Phone are required.");
    }
    try {
      await updateCustomer({ id: id!, data: formData }).unwrap();
      toast.success("Customer updated successfully");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to update customer");
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-[#5a141e]" />
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────────────────────
  if (isError || !customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-gray-500 font-medium">Customer not found.</p>
        <Button variant="outline" onClick={() => setLocation("/customers")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Customers
        </Button>
      </div>
    );
  }

  const initials = customer.name.substring(0, 2).toUpperCase();
  const recentOrders = (customer as any).recentOrders || [];

  return (
    <div className="space-y-6 font-sans antialiased px-4 sm:px-6 lg:px-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")} className="rounded-full hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 text-[#5a141e]" />
          </Button>
          <div className="h-14 w-14 rounded-full bg-[#5a141e]/10 text-[#5a141e] flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#5a141e]">{customer.name}</h1>
            <p className="text-sm text-gray-500 font-medium">{customer.company || "Personal Client"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)} className="border-gray-200 text-gray-700 font-semibold gap-2">
            <Edit className="h-4 w-4" /> Edit Profile
          </Button>
          <Button onClick={() => setLocation("/orders/new")} className="bg-[#5a141e] hover:bg-[#4a1018] text-white font-semibold gap-2">
            New Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="md:col-span-1 border border-gray-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Mail className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="truncate">{customer.email || "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-gray-400 shrink-0" />
              <span>{customer.phone}</span>
            </div>
            {customer.company && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{customer.company}</span>
              </div>
            )}
            {customer.gstin && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="uppercase font-mono text-xs">{customer.gstin}</span>
              </div>
            )}
            {(customer.address?.city || customer.address?.state) && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                <span>{[customer.address?.city, customer.address?.state].filter(Boolean).join(", ")}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm font-semibold text-[#5a141e]">
              <IndianRupee className="h-4 w-4 shrink-0" />
              <span>Outstanding: ₹{Number(customer.outstandingBalance || 0).toLocaleString()}</span>
            </div>
            {customer.customerType && (
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                <Tag className="h-3 w-3 mr-1" />
                {customer.customerType}
              </Badge>
            )}
            {customer.notes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-600 leading-relaxed">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order History Card */}
        <Card className="md:col-span-2 border border-gray-200 shadow-sm rounded-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-800">Order History</CardTitle>
            <CardDescription>Showing {recentOrders.length} recent catering{recentOrders.length !== 1 ? "s" : ""}.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
                <Calendar className="h-10 w-10 opacity-30" />
                <p className="text-sm font-medium italic">No orders found for this customer yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div key={order._id} className="flex items-center justify-between border-b border-gray-50 pb-4 last:border-0 last:pb-0 hover:bg-gray-50/50 rounded-lg px-2 py-2 transition-colors">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm text-gray-800">{order.orderNumber || order._id}</div>
                      <div className="text-xs font-medium text-gray-500">{order.eventName}</div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        {order.eventDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.eventDate), "dd MMM yyyy")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize text-xs">{order.status}</Badge>
                      <div className="font-bold text-sm text-gray-900">₹{Number(order.totalAmount || 0).toLocaleString()}</div>
                      <Button variant="ghost" size="sm" className="text-[#5a141e] hover:bg-[#5a141e]/5 text-xs font-semibold" onClick={() => setLocation(`/orders/${order._id}`)}>
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg p-0 flex flex-col bg-white border-l shadow-2xl font-sans focus:outline-none">
          <div className="px-8 py-6 border-b border-gray-100 sticky top-0 bg-white z-10">
            <SheetTitle className="text-xl font-bold tracking-tight text-gray-900">Edit Customer</SheetTitle>
            <SheetDescription className="text-sm text-gray-500 italic mt-0.5">Modify {customer.name}'s profile details</SheetDescription>
          </div>

          <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name <span className="text-rose-500">*</span></Label>
                <Input value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold focus:ring-1 focus:ring-[#5a141e]" />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone <span className="text-rose-500">*</span></Label>
                  <Input value={formData.phone || ""} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</Label>
                  <Input type="email" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" />
                </div>
              </div>

              {/* Company & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</Label>
                  <Input value={formData.company || ""} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</Label>
                  <Select value={formData.customerType || "individual"} onValueChange={(v: any) => setFormData({ ...formData, customerType: v })}>
                    <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="temple">Temple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* GSTIN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GSTIN</Label>
                <Input value={formData.gstin || ""} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-mono uppercase" />
              </div>

              {/* Address */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Address</p>
                <Input placeholder="Street" value={formData.address?.street || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" />
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="City" value={formData.address?.city || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" />
                  <Input placeholder="State" value={formData.address?.state || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, state: e.target.value } })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" />
                </div>
                <Input placeholder="PIN Code" value={formData.address?.pincode || ""} onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, pincode: e.target.value } })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold w-1/2" />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</Label>
                <Textarea rows={3} value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold focus:ring-1 focus:ring-[#5a141e]" />
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 flex items-center gap-4 sticky bottom-0 bg-white z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="flex-1 font-semibold h-11 border-gray-200 text-gray-500">Cancel</Button>
              </SheetClose>
              <Button type="submit" disabled={isUpdating} className="flex-[2] bg-[#5a141e] hover:bg-[#4a1018] text-white font-semibold h-11 rounded-lg">
                {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
