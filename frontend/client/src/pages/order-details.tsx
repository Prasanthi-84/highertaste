import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Trash2, Plus, User, CheckCircle2, Save, MapPin, Download, Loader2, AlertCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { setOrderData, updateDeliveryField, addLineItem, removeLineItem, updateLineItemQty, setStatus } from "@/store/orderSlice";
import { useGetOrderByIdQuery, useUpdateOrderMutation, useSendOrderWhatsAppMutation } from "@/store/OrderApi";
import { useGetCustomersQuery } from "@/store/customerApi";
import { useGetMenuQuery } from "@/store/menuApi";
import { useCreatePaymentOrderMutation, useVerifyPaymentMutation, useCreatePaymentLinkMutation, useSharePaymentLinkWhatsappMutation } from "@/store/paymentApi";
import { useSendWhatsappMutation } from "@/store/notificationApi";
import { exportSingleOrderToPDF } from "@/lib/exportInvoices";
import { MessageSquare, CreditCard, ExternalLink, QrCode, Copy, Share2, RefreshCw } from "lucide-react";

// Add Razorpay type for TS
declare global {
  interface Window {
    Razorpay: any;
  }
}

const orderSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  eventDate: z.date({ required_error: "Delivery date is required" }),
  eventTime: z.string().min(1, "Delivery time is required"),
  venue: z.string().min(1, "Delivery address is required"),
  headcount: z.coerce.number().min(1, "Headcount must be at least 1"),
  status: z.string().default("Draft"),
  items: z.array(z.object({
    menuItemId: z.string().optional().nullable(),
    name: z.string().min(1, "Item name is required"),
    qty: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0),
    total: z.coerce.number().optional(),
  })).min(1, "Add at least one menu item"),
});

type OrderFormValues = z.infer<typeof orderSchema>;

const workflowStages = [
  { id: "Draft", label: "Quotation" },
  { id: "Confirmed", label: "Converted" },
  { id: "In-Preparation", label: "In Production" },
  { id: "Ready", label: "Ready for Pickup" },
  { id: "Dispatched", label: "Out for Delivery" },
  { id: "Delivered", label: "Delivered" }
];

const cleanPrice = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
};

// Check if string is a valid MongoDB ObjectId (24 char hex)
const isValidObjectId = (id?: string | null) => {
    if (!id) return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
};

export default function OrderDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const dispatch = useDispatch();
  
  const { data: orderData, isLoading: isOrderLoading, refetch } = useGetOrderByIdQuery(id as string, { skip: !id });
  const { data: customersData } = useGetCustomersQuery();
  const { data: menuData } = useGetMenuQuery();
  const [updateOrder, { isLoading: isUpdating }] = useUpdateOrderMutation();
  const [createPaymentOrder, { isLoading: isCreatingRP }] = useCreatePaymentOrderMutation();
  const [createPaymentLink, { isLoading: isCreatingLink }] = useCreatePaymentLinkMutation();
  const [sharePaymentLinkWhatsapp, { isLoading: isSharingLink }] = useSharePaymentLinkWhatsappMutation();
  const [verifyPayment] = useVerifyPaymentMutation();
  const [sendWhatsapp, { isLoading: isSendingLegacyWA }] = useSendWhatsappMutation();
  const [sendOrderWhatsApp, { isLoading: isSendingTemplateWA }] = useSendOrderWhatsAppMutation();

  const isSendingWA = isSendingLegacyWA || isSendingTemplateWA;

  const customers = customersData || [];
  const menuItems = menuData || [];
  
  const { lineItems, totals, status } = useSelector((state: RootState) => state.orderUI);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customerId: "",
      venue: "",
      headcount: 50,
      status: "Draft",
      eventTime: "12:00",
      items: [],
    },
  });

  const errors = form.formState.errors;

  useEffect(() => {
    if (orderData?.success && orderData.data) {
      dispatch(setOrderData(orderData.data));
      const q = orderData.data;
      
      const parsedDate = q.eventDate ? new Date(q.eventDate) : undefined;
      const isValidDate = parsedDate instanceof Date && !isNaN(parsedDate.getTime());

      form.reset({
        customerId: typeof q.customerId === 'object' && q.customerId !== null ? q.customerId._id : q.customerId,
        venue: q.venue || "",
        headcount: q.pax || 50,
        status: q.status || "Draft",
        eventDate: isValidDate ? parsedDate : undefined,
        eventTime: q.eventDate && q.eventDate.includes('T') ? q.eventDate.split('T')[1].slice(0, 5) : "12:00",
        items: q.lineItems?.map(item => {
            const mId = typeof item.menuItemId === 'object' 
                ? (item.menuItemId._id || (item.menuItemId as any).id) 
                : (isValidObjectId(item.menuItemId) ? item.menuItemId : null);
            return {
                menuItemId: mId,
                name: item.name,
                qty: item.qty || 1,
                unitPrice: cleanPrice(item.unitPrice),
                total: cleanPrice(item.total)
            };
        }) || [],
      });
    }
  }, [orderData, dispatch, form]);

  const handleAddMenuItem = (menuItemId: string) => {
    const item = menuItems.find((m: any) => ((m as any).id === menuItemId || (m as any)._id === menuItemId));
    if (item) {
      const id = String((item as any)._id || (item as any).id);
      const price = cleanPrice(item.price);
      const newLineItem = {
        menuItemId: id,
        name: item.name,
        qty: 1,
        unitPrice: price,
        total: price
      };
      dispatch(addLineItem(newLineItem as any));
      const currentItems = form.getValues("items") || [];
      form.setValue("items", [...currentItems, newLineItem], { shouldValidate: true });
    }
  };

  const handleUpdateQty = (index: number, qty: number) => {
    dispatch(updateLineItemQty({ index, qty }));
    const currentItems = [...form.getValues("items")];
    if (currentItems[index]) {
        currentItems[index].qty = qty;
        currentItems[index].total = currentItems[index].unitPrice * qty;
        form.setValue("items", currentItems, { shouldValidate: true });
    }
  };

  const handleRemoveItem = (index: number) => {
    dispatch(removeLineItem(index));
    const currentItems = [...form.getValues("items")];
    currentItems.splice(index, 1);
    form.setValue("items", currentItems, { shouldValidate: true });
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (!id) return;
    try {
        const payload = {
            id,
            venue: values.venue,
            pax: Number(values.headcount),
            eventDate: values.eventDate.toISOString().split('T')[0] + 'T' + values.eventTime,
            deliveryDate: (values.eventDate || new Date()).toISOString().split('T')[0] + 'T' + values.eventTime,
            lineItems: values.items.map(item => ({
                menuItemId: (isValidObjectId(item.menuItemId) ? item.menuItemId : "") as string,
                name: item.name,
                qty: Number(item.qty),
                unitPrice: Number(item.unitPrice),
                total: Number(item.unitPrice) * Number(item.qty)
            })),
            status: status as any,
        };
        await updateOrder(payload).unwrap();
        toast({ title: "Success", description: "Order updated successfully." });
        refetch();
    } catch (err) {
        console.error("Order Update Error Payload:", err);
        toast({ title: "Update Rejected", description: "Format or permission error. Check item details.", variant: "destructive" });
    }
  };

  const handleSaveClick = () => {
    form.handleSubmit(onSubmit, (errs) => {
        const errMsg = Object.entries(errs).map(([k, v]) => `${k}: ${v.message}`).join(", ") || "Validation issue.";
        toast({ title: "Validation Block", description: errMsg.slice(0, 80) + "...", variant: "destructive" });
    })();
  };

  const handleDownload = () => {
    if (orderData?.data) exportSingleOrderToPDF(orderData.data);
    else toast({ title: "Error", description: "No order data loaded for PDF generation." });
  };

  const handlePayNow = async () => {
    if (!orderData?.data) return;
    const order = orderData.data;

    try {
      // 1. Load Razorpay Script
      const loadScript = () => {
        return new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve(true);
          script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };

      const res = await loadScript();
      if (!res) {
        toast({ title: "Error", description: "Razorpay SDK failed to load. Check your internet connection.", variant: "destructive" });
        return;
      }

      // 2. Create Razorpay Order
      const amount = order.amountDue;
      const response = await createPaymentOrder({ orderId: order._id, amount }).unwrap();

      if (!response.success) {
        toast({ title: "Error", description: "Failed to initialize payment.", variant: "destructive" });
        return;
      }

      const { data: rpOrder, key } = response;

      // 3. Open Razorpay Checkout
      const options = {
        key: key,
        amount: rpOrder.amount,
        currency: rpOrder.currency,
        name: "HKM Catering",
        description: `Payment for Order #${order.orderNumber}`,
        order_id: rpOrder.id,
        handler: async function (response: any) {
          const verifyData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId: order._id,
            amount: amount,
          };

          try {
            const vRes = await verifyPayment(verifyData).unwrap();
            if (vRes.success) {
              toast({ title: "Payment Successful", description: "Your payment has been recorded." });
              refetch();
            } else {
              toast({ title: "Verification Failed", description: vRes.message, variant: "destructive" });
            }
          } catch (err: any) {
            toast({ title: "Error", description: err.data?.message || "Payment verification failed.", variant: "destructive" });
          }
        },
        prefill: {
          name: typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.name : "",
          email: typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.email : "",
          contact: typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.phone : "",
        },
        theme: {
          color: "#5a141e",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Payment link copied to clipboard." });
  };

  const handleSendWhatsapp = async (type: 'confirmation' | 'link' | 'status') => {
    if (!orderData?.data) return;
    const order = orderData.data;
    const phone = typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.phone : "";
    if (!phone) {
        toast({ title: "No Phone Number", description: "Customer has no phone number saved.", variant: "destructive" });
        return;
    }

    try {
        if (type === 'link') {
            if (!order.paymentLinkUrl) {
                // Generate new link if not exists
                await createPaymentLink({ orderId: order._id }).unwrap();
                toast({ title: "Link Created", description: "Payment link generated and sent via WhatsApp." });
            } else {
                // Reshare existing link
                await sharePaymentLinkWhatsapp(order._id).unwrap();
                toast({ title: "Link Shared", description: "Existing payment link sent via WhatsApp." });
            }
            refetch();
            return;
        }

        // New Template-based notification
        let template = 'order_created';
        if (type === 'confirmation') template = 'order_created';
        else if (type === 'status') {
             if (status === 'Dispatched') template = 'order_dispatched';
             else if (status === 'Delivered') template = 'order_delivered';
             else template = 'order_created';
        }

        await sendOrderWhatsApp({ id: order._id, template }).unwrap();
        toast({ title: "WhatsApp Sent", description: `Message "${template}" sent successfully.` });
    } catch (err: any) {
        toast({ title: "Error", description: err.data?.message || "Failed to process request.", variant: "destructive" });
    }
  };


  if (isOrderLoading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Order Management</h1>
          {Object.keys(errors).length > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-3 py-1 rounded-md border border-rose-100 shadow-sm">
                <AlertCircle className="h-4 w-4" /> 
                <span className="text-[11px] font-black uppercase tracking-tighter">Errors Detected</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload} className="gap-2 h-11 font-bold">
            <Download className="h-4 w-4" /> Export Invoice
          </Button>
          <Button variant="outline" className="h-11 font-bold" onClick={() => setLocation("/orders")}>Cancel</Button>
          <Button className="bg-[#5a141e] hover:bg-[#4a1018] h-11 px-6 font-bold shadow-lg" onClick={handleSaveClick} disabled={isUpdating}>
            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="bg-white border-primary/20 shadow-xl rounded-xl overflow-hidden p-8">
        <div className="flex items-center justify-between relative px-10">
          <div className="absolute top-[15px] left-10 right-10 h-0.5 bg-slate-100 z-0" />
          {workflowStages.map((stage, index) => {
            const stageIndex = workflowStages.findIndex(s => s.id === status);
            const isPast = index < stageIndex;
            const isCurrent = index === stageIndex;
            return (
              <div key={stage.id} className="relative z-10 flex flex-col items-center gap-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  isPast ? "bg-[#5a141e] border-[#5a141e] text-white" : 
                  isCurrent ? "bg-white border-[#5a141e] text-[#5a141e] ring-4 ring-[#5a141e]/10 scale-110" : 
                  "bg-white border-slate-200 text-slate-300"
                )}>
                  {isPast ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest text-center",
                  isCurrent ? "text-[#5a141e]" : isPast ? "text-slate-600" : "text-slate-300"
                )}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-premium">
                <CardHeader className="border-b bg-gray-50/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5 text-primary" /> Delivery Logistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase text-gray-400">Customer</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); dispatch(updateDeliveryField({ field: "customerId", value: val })) }} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={cn("font-bold border-gray-100", errors.customerId && "border-rose-400 bg-rose-50/10")}>
                                <SelectValue placeholder="Select customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((c: any) => <SelectItem key={c._id || c.id} value={c._id || c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="venue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-black uppercase text-gray-400">Delivery Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter full venue address" className={cn("font-bold border-gray-100", errors.venue && "border-rose-400 bg-rose-50/10")} {...field} onChange={e => { field.onChange(e); dispatch(updateDeliveryField({ field: "venue", value: e.target.value })) }} />
                        </FormControl>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="eventDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs font-black uppercase text-gray-400">Delivery Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant={"outline"} className={cn("w-full pl-3 text-left font-bold border-gray-100", !field.value && "text-muted-foreground", errors.eventDate && "border-rose-400 bg-rose-50/10")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={(val) => { field.onChange(val); dispatch(updateDeliveryField({ field: "eventDate", value: val?.toISOString() })) }} initialFocus />
                          </PopoverContent>
                        </Popover>
                        <FormMessage className="text-[10px] font-bold" />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase text-gray-400">Delivery Time</FormLabel>
                          <FormControl>
                            <Input type="time" className={cn("font-bold border-gray-100", errors.eventTime && "border-rose-400 bg-rose-50/10")} {...field} onChange={e => { field.onChange(e); dispatch(updateDeliveryField({ field: "eventTime", value: e.target.value })) }} />
                          </FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="headcount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-black uppercase text-gray-400">Headcount</FormLabel>
                          <FormControl><Input type="number" className={cn("font-bold border-gray-100", errors.headcount && "border-rose-400 bg-rose-50/10")} {...field} onChange={e => { field.onChange(e); dispatch(updateDeliveryField({ field: "headcount", value: parseInt(e.target.value) || 0 })) }} /></FormControl>
                          <FormMessage className="text-[10px] font-bold" />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-premium">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-primary" /> Menu & Production Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex gap-4 items-center border-b border-slate-50 pb-4 last:border-0">
                      <div className="flex-1">
                        <p className="font-black text-[#5a141e]">{item.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Price: ₹{Number(item.unitPrice).toLocaleString()}</p>
                      </div>
                      <div className="w-24">
                        <Input 
                            type="number" 
                            className="font-bold border-gray-100 h-9 text-center" 
                            value={item.qty} 
                            onChange={(e) => handleUpdateQty(index, parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="w-32 text-right">
                        <p className="font-black text-[#5a141e]">₹{(Number(item.unitPrice) * item.qty).toLocaleString()}</p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleRemoveItem(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="pt-4 flex items-center justify-between">
                     <Select onValueChange={handleAddMenuItem}>
                        <SelectTrigger className="w-[300px] font-bold border-emerald-100 text-emerald-700 bg-emerald-50/30">
                            <Plus className="h-4 w-4 mr-2" /> Add Item from Menu
                        </SelectTrigger>
                        <SelectContent>
                            {menuItems.map((m: any) => <SelectItem key={m.id || m._id} value={m.id || m._id}>{m.name} - ₹{m.price}</SelectItem>)}
                        </SelectContent>
                     </Select>
                     <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase">Production Total</p>
                        <p className="text-2xl font-black text-[#5a141e]">₹{totals.subtotal.toLocaleString()}</p>
                     </div>
                  </div>
                  {errors.items && <p className="text-rose-600 text-[10px] font-bold uppercase mt-2">* {errors.items.message}</p>}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-none shadow-premium bg-white overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#5a141e]">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <span>Line Total</span>
                        <span className="text-gray-900 font-bold">₹{totals.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <span>GST (18%)</span>
                        <span className="text-gray-900 font-bold">₹{(totals.subtotal * 0.18).toLocaleString()}</span>
                    </div>
                    <Separator className="bg-gray-100" />
                    <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                        <span>Total Amount</span>
                        <span className="text-gray-900 font-black">₹{orderData?.data?.totalAmount?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium text-emerald-600">
                        <span>Amount Paid</span>
                        <span className="font-black">₹{orderData?.data?.amountPaid?.toLocaleString()}</span>
                    </div>
                    <Separator className="bg-gray-100" />
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-gray-400">Balance Due</span>
                        <span className="text-2xl font-black text-[#5a141e]">₹{orderData?.data?.amountDue?.toLocaleString()}</span>
                    </div>
                    <div className="pt-4 space-y-3">
                         <div className={cn("p-4 rounded-xl border flex items-center justify-between transition-colors", orderData?.data?.amountDue === 0 ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800")}>
                            <div>
                                <p className="text-[9px] font-black uppercase opacity-60">Payment Status</p>
                                <p className="text-lg font-black uppercase">
                                    {orderData?.data?.amountDue === 0 ? "Paid" : "Due"}
                                </p>
                            </div>
                            <div className="text-right">
                                {orderData?.data?.amountDue! > 0 ? (
                                    <span className="text-[10px] font-black bg-rose-600 text-white px-2 py-0.5 rounded-full">ACTION REQUIRED</span>
                                ) : (
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                )}
                            </div>
                         </div>


                         {orderData?.data?.amountDue! > 0 && (
                            <Button 
                                onClick={handlePayNow} 
                                disabled={isCreatingRP}
                                className="w-full bg-[#5a141e] hover:bg-[#4a1018] h-12 rounded-xl text-white font-bold shadow-lg gap-2"
                            >
                                {isCreatingRP ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                                Pay Now Online
                            </Button>
                         )}

                        <Button 
                            variant="outline" 
                            onClick={handleDownload}
                            className="w-full border-gray-100 h-12 rounded-xl text-primary font-bold gap-2"
                        >
                            <Download className="h-4 w-4" /> View Invoice PDF
                        </Button>
                    </div>
                </CardContent>
              </Card>

              {orderData?.data?.paymentLinkUrl && (
                <Card className="border-none shadow-premium bg-gradient-to-br from-emerald-50 to-white overflow-hidden">
                  <CardHeader className="bg-emerald-100/30 border-b">
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-2">
                        <CreditCard className="h-3 w-3" /> Active Payment Link
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                      <div className="bg-white border-2 border-dashed border-emerald-100 p-4 rounded-xl flex items-center justify-between gap-4">
                          <div className="flex-1 overflow-hidden">
                              <p className="text-[10px] font-black uppercase text-gray-400 mb-1">Payment URL</p>
                              <p className="text-xs font-bold text-emerald-700 truncate">{orderData.data.paymentLinkUrl}</p>
                              {orderData.data.paymentLinkExpiresAt && (
                                <p className="text-[9px] text-gray-400 mt-1 italic">
                                  Expires: {new Date(orderData.data.paymentLinkExpiresAt).toLocaleString()}
                                </p>
                              )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                title="Regenerate Link"
                                className="h-9 w-9 border-rose-100 text-rose-600 hover:bg-rose-50"
                                onClick={async () => {
                                  try {
                                    await createPaymentLink({ orderId: orderData.data._id }).unwrap();
                                    toast({ title: "Link Regenerated", description: "A fresh 24h payment link was generated." });
                                    refetch();
                                  } catch (err: any) {
                                    toast({ title: "Error", description: err.data?.message || "Failed to regenerate link", variant: "destructive" });
                                  }
                                }}
                                disabled={isCreatingLink}
                              >
                                  {isCreatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleCopyLink(orderData.data.paymentLinkUrl!)}
                              >
                                  <Copy className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-9 w-9 border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => handleSendWhatsapp('link')}
                                disabled={isSharingLink}
                              >
                                  {isSharingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                              </Button>
                          </div>
                      </div>
                      <p className="text-[9px] text-center text-emerald-600 font-bold uppercase tracking-wider opacity-60">
                        Secure Razorpay Checkout Link
                      </p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-none shadow-premium">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-[#5a141e]">Communication</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                    <Button 
                        variant="outline" 
                        onClick={() => handleSendWhatsapp('confirmation')}
                        disabled={isSendingWA}
                        className="w-full justify-start h-11 border-gray-100 font-bold gap-3 px-4 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100"
                    >
                        <MessageSquare className="h-4 w-4" /> Send Confirmation
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleSendWhatsapp('link')}
                        disabled={isSendingWA}
                        className="w-full justify-start h-11 border-gray-100 font-bold gap-3 px-4 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-100"
                    >
                        <ExternalLink className="h-4 w-4" /> Send Payment Link
                    </Button>
                    <Button 
                        variant="outline" 
                        onClick={() => handleSendWhatsapp('status')}
                        disabled={isSendingWA}
                        className="w-full justify-start h-11 border-gray-100 font-bold gap-3 px-4 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100"
                    >
                        <MessageSquare className="h-4 w-4" /> Send Status Update
                    </Button>
                </CardContent>
              </Card>


              <Card className="border-none shadow-premium">
                <CardHeader className="bg-gray-50/50 border-b">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lifecycle Status</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <Select onValueChange={(val) => dispatch(setStatus(val as any))} value={status}>
                    <SelectTrigger className="font-bold h-12 border-emerald-100 text-[#5a141e] bg-emerald-50/20">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {workflowStages.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.label}</SelectItem>)}
                      <SelectItem value="Cancelled" className="font-bold text-rose-600">Cancel Order</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
