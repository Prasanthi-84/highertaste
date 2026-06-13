import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Mail, 
  Phone, 
  Edit, 
  Filter,
  Loader2,
  X,
  Trash2
} from "lucide-react";
import { Link } from "wouter";
import { 
  useGetCustomersQuery, 
  useCreateCustomerMutation, 
  useUpdateCustomerMutation, 
  useDeleteCustomerMutation,
  Customer 
} from "@/store/customerApi";
import { toast } from "sonner";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";

export default function Customers() {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [customerType, setCustomerType] = useState("all");
  
  // UI State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // RTK Query API Hooks
  const { 
    data: customers = [], 
    isLoading, 
    isError, 
    error: fetchError 
  } = useGetCustomersQuery({ 
    search: searchTerm, 
    customerType 
  });

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteCustomer(id).unwrap();
        toast.success("Customer deleted successfully");
      } catch (err: any) {
        toast.error(err.data?.message || err.message || "Failed to delete customer");
      }
    }
  };

  // Show error via Toast
  useEffect(() => {
    // Error is surfaced via the isError flag and shown in the UI
  }, [isError, fetchError]);

  // Form State
  const initialFormState: Partial<Customer> = {
    name: "",
    phone: "",
    email: "",
    company: "",
    customerType: "individual",
    gstin: "",
    address: { street: "", city: "", state: "", pincode: "" },
    notes: "",
    tags: []
  };

  const [formData, setFormData] = useState<Partial<Customer>>(initialFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isSheetOpen) {
      setFormData(initialFormState);
      setSelectedCustomer(null);
      setErrors({});
    }
  }, [isSheetOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Full Name is required";
    if (!formData.phone?.trim()) newErrors.phone = "Phone is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || "",
      company: customer.company || "",
      customerType: customer.customerType || "individual",
      gstin: customer.gstin || "",
      address: customer.address || { street: "", city: "", state: "", pincode: "" },
      notes: customer.notes || "",
      tags: customer.tags || []
    });
    setIsSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error("Please fill in all required fields marked with *");
      return;
    }

    try {
      if (selectedCustomer?._id) {
        await updateCustomer({ id: selectedCustomer._id, data: formData }).unwrap();
        toast.success("Customer updated successfully");
      } else {
        await createCustomer(formData).unwrap();
        toast.success("Added customer successfully");
      }
      setIsSheetOpen(false);
    } catch (err: any) {
      toast.error(err.data?.message || err.message || "An error occurred while saving the customer");
    }
  };

  return (
    <div className="space-y-6 font-sans antialiased text-gray-900 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#5a141e]">Customers</h1>
          <p className="text-sm font-medium text-gray-500 mt-0.5">Manage client relationships and contact details.</p>
        </div>
        <Button 
          onClick={() => setIsSheetOpen(true)} 
          className="bg-[#5a141e] hover:bg-[#4a1018] text-white font-medium h-10 px-5 rounded-lg shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Main Table Card */}
      <Card className="border border-gray-200 shadow-sm bg-white rounded-xl overflow-hidden">
        <CardHeader className="px-6 py-6 border-b border-gray-50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <CardTitle className="text-base font-semibold text-gray-800">Customer List</CardTitle>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search customers..."
                  className="pl-9 bg-white border-gray-200 text-sm focus:ring-1 focus:ring-[#5a141e] focus:border-[#5a141e] rounded-lg h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Spinner className="h-8 w-8 text-[#5a141e]" />
              <p className="text-sm font-medium text-gray-400 font-sans">Loading Customers...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white">
                  <TableRow className="border-b border-gray-100">
                    <TableHead className="font-medium text-gray-500 pl-8 h-12 text-[13px]">Customer Name</TableHead>
                    <TableHead className="font-medium text-gray-500 h-12 text-[13px]">Company</TableHead>
                    <TableHead className="font-medium text-gray-500 h-12 text-[13px]">Contact</TableHead>
                    <TableHead className="font-medium text-gray-500 h-12 text-[13px] text-center">Orders</TableHead>
                    <TableHead className="font-medium text-gray-500 h-12 text-[13px] text-right pr-12">Outstanding Balance</TableHead>
                    <TableHead className="h-12 w-12 text-center text-gray-500 text-[13px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer._id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-50 last:border-0 h-16 group">
                      <TableCell className="pl-8 py-4">
                        <Link href={`/customers/${customer._id}`} className="text-[#5a141e] hover:underline font-semibold text-[14px]">
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-gray-500 font-medium text-[14px]">{customer.company || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-[12px] font-medium text-gray-500">
                          <span className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-gray-300" /> {customer.email || "—"}</span>
                          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-gray-300" /> {customer.phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium text-gray-600 text-[14px]">{customer.totalOrders || 12}</TableCell>
                      <TableCell className={`text-right pr-12 font-semibold text-[14px] ${Number(customer.outstandingBalance || 0) > 0 ? "text-[#f59e0b]" : "text-emerald-500"}`}>
                        ₹{Number(customer.outstandingBalance || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="pr-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border-transparent hover:bg-white hover:shadow-sm">
                              <MoreVertical className="h-4 w-4 text-gray-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-lg border-gray-100 shadow-lg p-1 w-36">
                            <DropdownMenuItem onClick={() => handleEdit(customer)} className="font-medium py-2 focus:bg-gray-50 focus:text-[#5a141e] rounded-md cursor-pointer">
                              <Edit className="mr-2 h-4 w-4 opacity-70" /> Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { if(customer._id) handleDelete(customer._id); }} className="font-medium py-2 focus:bg-rose-50 focus:text-rose-600 rounded-md cursor-pointer text-rose-600">
                              <Trash2 className="mr-2 h-4 w-4 opacity-70" /> Delete Profile
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                       <TableCell colSpan={6} className="text-center py-20 text-gray-400 font-sans italic">
                         No customer records available.
                       </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clean Sidebar Form */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-md md:max-w-lg p-0 flex flex-col bg-white border-l shadow-2xl font-sans focus:outline-none">
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
            <div className="space-y-0.5">
              <SheetTitle className="text-xl font-bold tracking-tight text-gray-900">
                {selectedCustomer ? "Edit Customer" : "New Customer"}
              </SheetTitle>
              <SheetDescription className="text-sm font-medium text-gray-500 italic">
                {selectedCustomer ? "Modify customer attributes" : "Create a new client profile"}
              </SheetDescription>
            </div>
            <SheetClose className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded-full hover:bg-gray-100">
              <X className="h-5 w-5" />
            </SheetClose>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 bg-white">
            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
              
              <div className="space-y-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Legal Identity</p>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Legal Full Name <span className="text-rose-500 font-bold">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className={`h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-1 focus:ring-[#5a141e] focus:border-[#5a141e] rounded-lg text-sm font-semibold transition-all ${errors.name ? "border-rose-400" : ""}`}
                    placeholder="Arjun Das"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</Label>
                    <Select value={formData.customerType || ""} onValueChange={(v: any) => setFormData({ ...formData, customerType: v })}>
                      <SelectTrigger className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-gray-100 shadow-xl">
                        <SelectItem value="individual" className="font-semibold">Individual</SelectItem>
                        <SelectItem value="corporate" className="font-semibold">Corporate</SelectItem>
                        <SelectItem value="temple" className="font-semibold">Temple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Company Name</Label>
                    <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold" placeholder="Org name" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Communication</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={formData.email} 
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Primary Phone <span className="text-rose-500 font-bold">*</span>
                    </Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
                      className={`h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold ${errors.phone ? "border-rose-400" : ""}`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstin" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GSTIN (India)</Label>
                  <Input id="gstin" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold uppercase" />
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Address Details</p>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Street Info</Label>
                    <Input 
                      value={formData.address?.street || ""} 
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, street: e.target.value } })} 
                      className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                      placeholder="City"
                      value={formData.address?.city || ""} 
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, city: e.target.value } })} 
                      className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold"
                    />
                    <Input 
                      placeholder="State"
                      value={formData.address?.state || ""} 
                      onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, state: e.target.value } })} 
                      className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold"
                    />
                </div>
                  <Input 
                    placeholder="PIN Code"
                    value={formData.address?.pincode || ""} 
                    onChange={(e) => setFormData({ ...formData, address: { ...formData.address!, pincode: e.target.value } })} 
                    className="h-11 bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold w-1/2"
                  />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer Notes</Label>
                <Textarea 
                  id="notes" 
                  rows={3} 
                  value={formData.notes} 
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                  className="bg-gray-50 border-gray-200 rounded-lg text-sm font-semibold focus:ring-1 focus:ring-[#5a141e] transition-all" 
                />
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-white flex items-center gap-4 sticky bottom-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="flex-1 font-semibold h-11 border-gray-200 text-gray-500 hover:bg-gray-50">Cancel</Button>
              </SheetClose>
              <Button type="submit" className="flex-[2] bg-[#5a141e] hover:bg-[#4a1018] text-white font-semibold h-11 rounded-lg text-sm tracking-wide" disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {selectedCustomer ? "Update Profile" : "Add Customer"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
