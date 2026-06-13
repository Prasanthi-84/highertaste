import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Download, FileText, ArrowRight, Loader2, Filter, ExternalLink, PlusCircle, Trash2, CheckCircle2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { useGetOrdersQuery, useDeleteOrderMutation } from "@/store/OrderApi";
import { useGetQuotesQuery, useConvertQuoteToOrderMutation } from "@/store/quoteApi";
import { useCreateInvoiceMutation } from "@/store/invoiceApi";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Globe } from "lucide-react";
import { useCreatePaymentOrderMutation, useVerifyPaymentMutation, useCreatePaymentLinkMutation, useSharePaymentLinkWhatsappMutation } from "@/store/paymentApi";
import { 
  useSendOrderConfirmationMutation,
  useSendPaymentSuccessMutation,
  useSendOrderDispatchedMutation,
  useSendOrderDeliveredMutation
} from "@/store/whatsappApi";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Razorpay TS global
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Orders() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  
  // Convert Quote State
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [convertData, setConvertData] = useState({ venue: "", date: "", pax: 50 });

  const { data: ordersData, isLoading } = useGetOrdersQuery({ 
    search: searchTerm,
    status: (statusFilter === "all" || statusFilter === "Completed") ? undefined : statusFilter,
    isArchived: statusFilter === "Completed" ? true : false,
    paymentStatus: paymentFilter === "all" ? undefined : paymentFilter
  });
  
  const { data: quotesData } = useGetQuotesQuery({ status: "Accepted" });
  const [deleteOrder, { isLoading: isDeleting }] = useDeleteOrderMutation();
  const [convertQuote, { isLoading: isConverting }] = useConvertQuoteToOrderMutation();
  const [createInvoice, { isLoading: isCreatingInvoice }] = useCreateInvoiceMutation();
  
  // Razorpay
  const [createPaymentOrder, { isLoading: isCreatingRP }] = useCreatePaymentOrderMutation();
  const [verifyPayment] = useVerifyPaymentMutation();

  // WhatsApp API Mutations
  const [sendConfirmation] = useSendOrderConfirmationMutation();
  const [sendPaymentSuccess] = useSendPaymentSuccessMutation();
  const [sendDispatched] = useSendOrderDispatchedMutation();
  const [sendDelivered] = useSendOrderDeliveredMutation();
  // Payment Link flow (Razorpay)
  const [createPaymentLink] = useCreatePaymentLinkMutation();
  const [sharePaymentLinkWhatsapp] = useSharePaymentLinkWhatsappMutation();

  const handleSendWhatsApp = async (action: string, order: any) => {
    try {
      const payload = {
        phone: typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.phone : "",
        customerName: typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.name : "",
        orderId: order.orderNumber || order._id
      };

      if (!payload.phone) {
        toast({ title: "Error", description: "Customer phone number is missing.", variant: "destructive" });
        return;
      }

      switch (action) {
        case "confirmation":
          await sendConfirmation({
            ...payload,
            eventDate: order.eventDate ? format(new Date(order.eventDate), "dd MMM yyyy") : "N/A",
            venue: order.venue || "N/A",
            guests: order.pax || "N/A",
            totalAmount: order.totalAmount || 0
          }).unwrap();
          toast({ title: "WhatsApp Sent", description: "Order confirmation sent successfully." });
          break;
        case "payment_link":
          // If order already has a saved Razorpay link, just resend it via WhatsApp
          if (order.paymentLinkUrl) {
            await sharePaymentLinkWhatsapp(order._id).unwrap();
            toast({ title: "WhatsApp Sent", description: "Existing payment link resent successfully." });
          } else {
            // Generate a fresh Razorpay payment link and auto-send via WhatsApp
            const result = await createPaymentLink({ orderId: order._id }).unwrap();
            if (result.whatsappSent === false) {
              toast({ 
                title: "Payment Link Created — WhatsApp Failed", 
                description: `Razorpay link: ${result.data?.link}. WA error: ${result.whatsappError}`, 
                variant: "destructive" 
              });
            } else {
              toast({ title: "Payment Link Sent", description: "Razorpay payment link generated and sent via WhatsApp." });
            }
          }
          break;
        case "payment_success":
           await sendPaymentSuccess({
            ...payload,
            amount: order.amountPaid,
            paymentDate: new Date().toLocaleDateString()
          }).unwrap();
          toast({ title: "WhatsApp Sent", description: "Payment receipt sent successfully." });
          break;
        case "dispatched":
          const itemsStr = order.lineItems && order.lineItems.length > 0 
            ? order.lineItems.map((i: any) => i.name).join(", ") 
            : "Catering Items";
          await sendDispatched({
            ...payload,
            items: itemsStr,
            deliveryTime: order.deliveryDate ? format(new Date(order.deliveryDate), "hh:mm a") : "Soon",
            address: order.venue || "N/A"
          }).unwrap();
          toast({ title: "WhatsApp Sent", description: "Dispatch notification sent successfully." });
          break;
        case "delivered":
          await sendDelivered(payload).unwrap();
          toast({ title: "WhatsApp Sent", description: "Delivery confirmation sent successfully." });
          break;
      }
    } catch (err: any) {
      toast({ title: "WhatsApp Error", description: err?.data?.message || err?.message || "Failed to send WhatsApp.", variant: "destructive" });
    }
  };

  const orders = ordersData?.data || [];
  const acceptedQuotes = quotesData?.data || [];

  const handleExportCSV = () => {
    const headers = ["Order ID", "Customer", "Venue", "Amount", "Status", "Date"];
    const csvContent = [
      headers.join(","),
      ...orders.map((o: any) => [
        o.orderNumber || o._id,
        `"${o.customerId?.name || o.customerName || "-"}"`,
        `"${o.venue}"`,
        o.totalAmount,
        o.status,
        o.eventDate
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `HT_Orders_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this order?")) {
      try {
        await deleteOrder(id).unwrap();
        toast({ title: "Order Deleted", description: "The order has been removed successfully." });
      } catch (err) {
        toast({ title: "Error", description: "Failed to delete order.", variant: "destructive" });
      }
    }
  };

  const handleConvert = async () => {
    if (!selectedQuoteId) return;
    try {
      await convertQuote({ 
        id: selectedQuoteId,
        eventDate: convertData.date,
        venue: convertData.venue,
        pax: convertData.pax
      }).unwrap();
      setIsConvertOpen(false);
      toast({ title: "Order Created", description: "Quotation has been successfully converted to an active order." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to convert quote.", variant: "destructive" });
    }
  };

  const handleGenerateInvoice = async (orderId: string) => {
    try {
      const res = await createInvoice({ orderId }).unwrap();
      toast({ title: "Invoice Generated", description: "The invoice has been created and is ready for billing." });
      if (res.data?._id) {
          setLocation(`/invoices/${res.data._id}`);
      }
    } catch (err: any) {
      toast({ 
        title: "Generation Failed", 
        description: err?.data?.message || "Could not generate invoice. Maybe it already exists?", 
        variant: "destructive" 
      });
    }
  };


  const handlePayNow = async (order: any) => {
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
        toast({ title: "Error", description: "Razorpay SDK failed to load.", variant: "destructive" });
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
              toast({ title: "Payment Successful", description: `Recorded online payment of ₹${amount.toLocaleString()}` });
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "Draft": "bg-slate-100 text-slate-600 border-slate-200",
      "Confirmed": "bg-blue-50 text-blue-600 border-blue-200",
      "In-Preparation": "bg-amber-50 text-amber-600 border-amber-200",
      "Ready": "bg-emerald-50 text-emerald-600 border-emerald-200",
      "Dispatched": "bg-purple-50 text-purple-600 border-purple-200",
      "Delivered": "bg-indigo-50 text-indigo-600 border-indigo-200",
      "Completed": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "Cancelled": "bg-red-50 text-red-600 border-red-200",
    };

    return (
      <Badge variant="outline" className={cn("font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider", styles[status])}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Order Management</h1>
          <p className="text-muted-foreground mt-1 tracking-tight">Active catering productions from confirmed quotations.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="font-bold gap-2 h-11"><Download className="h-4 w-4" /> Export</Button>
          <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#5a141e] hover:bg-[#4a1018] h-11 px-6 font-bold shadow-lg shadow-[#5a141e]/20">
                <PlusCircle className="h-4 w-4" /> 
                Convert from Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[#5a141e]">Convert Quotation</DialogTitle>
                <DialogDescription>Select an accepted quote to convert into a production order.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400">Select Quotation</label>
                  <Select onValueChange={setSelectedQuoteId}>
                    <SelectTrigger className="font-bold border-gray-200"><SelectValue placeholder="Choose accepted quote..." /></SelectTrigger>
                    <SelectContent>
                      {acceptedQuotes.map(q => (
                        <SelectItem key={q._id} value={q._id}>{q.quoteNumber} - {typeof q.customerId === 'object' && q.customerId !== null ? q.customerId.name : q.customerId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-400">Event Date</label>
                    <Input type="date" value={convertData.date} onChange={e => setConvertData({...convertData, date: e.target.value})} className="font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-gray-400">Pax Count</label>
                    <Input type="number" value={convertData.pax} onChange={e => setConvertData({...convertData, pax: parseInt(e.target.value)})} className="font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-gray-400">Venue</label>
                  <Input placeholder="Enter final delivery venue..." value={convertData.venue} onChange={e => setConvertData({...convertData, venue: e.target.value})} className="font-bold" />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full bg-[#5a141e] hover:bg-[#4a1018] font-bold h-12" onClick={handleConvert} disabled={isConverting || !selectedQuoteId}>
                  {isConverting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Confirm & Create Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-none shadow-xl overflow-hidden bg-white">
        <CardHeader className="pb-3 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-[450px]">
              <TabsList className="bg-white border text-gray-500 font-bold p-1">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#5a141e] data-[state=active]:text-white px-6">Active</TabsTrigger>
                <TabsTrigger value="In-Preparation">Production</TabsTrigger>
                <TabsTrigger value="Completed">Archive</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Search Order # or Customer..." 
                      className="pl-9 h-11 bg-white border-gray-200 shadow-sm focus-visible:ring-[#5a141e]" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[140px] h-11 border-gray-200 font-bold bg-white text-gray-600"><SelectValue placeholder="Payment" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="PENDING">Due</SelectItem>
                  </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-gray-50/80">
              <TableRow className="h-10">
                <TableHead className="font-bold text-gray-600 pl-4 w-[140px] text-[11px] uppercase tracking-wider">ID</TableHead>
                <TableHead className="font-bold text-gray-600 pl-4 text-[11px] uppercase tracking-wider">Customer / Venue</TableHead>
                <TableHead className="font-bold text-gray-600 px-1 text-[11px] uppercase tracking-wider">Event Date</TableHead>
                <TableHead className="font-bold text-gray-600 text-right px-1 text-[11px] uppercase tracking-wider">Payment</TableHead>
                <TableHead className="font-bold text-gray-600 text-center px-1 text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-bold text-gray-600 text-right pr-4 text-[11px] uppercase tracking-wider">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
              ) : orders.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-bold">No active catering orders found.</TableCell></TableRow>
              ) : orders.map((order: any) => (
                <TableRow key={order._id} className="group hover:bg-emerald-50/20 transition-all border-b border-slate-100">
                  <TableCell 
                    className="font-mono text-[11px] font-black text-[#5a141e] cursor-pointer hover:underline py-2.5 pl-4"
                    onClick={() => setLocation(`/orders/${order._id}`)}
                   >
                    {order.orderNumber || order._id.slice(-6).toUpperCase()}
                  </TableCell>
                  <TableCell className="py-2 px-1">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 leading-none mb-0.5 text-sm">{typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.name : order.customerName || "-"}</span>
                      <span className="text-[9px] text-gray-500 font-medium truncate max-w-[180px]">{order.venue}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-600 px-1">
                    {order.eventDate ? format(new Date(order.eventDate), "dd MMM yyyy") : "â€”"}
                  </TableCell>
                  <TableCell className="text-right px-1">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-[#5a141e] text-sm">₹{(order.totalAmount || 0).toLocaleString()}</span>
                      {order.amountDue > 0 ? (
                        <span className="text-[9px] text-rose-600 font-bold uppercase tracking-tight">DUE: ₹{order.amountDue.toLocaleString()}</span>
                      ) : (
                        <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">PAID</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center px-1">{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right pr-4 py-2">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-bold text-[#5a141e] hover:bg-[#5a141e] hover:text-white bg-gray-50 h-8"
                        onClick={() => setLocation(`/orders/${order._id}`)}
                        title="View / Edit Order"
                      >
                         <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                       <Button 
                        variant="ghost" 
                        size="sm" 
                        className="font-bold text-emerald-600 hover:bg-emerald-600 hover:text-white bg-gray-50 h-8"
                        onClick={() => handleGenerateInvoice(order._id)}
                        disabled={isCreatingInvoice}
                        title="Generate GST Invoice"
                      >
                         <FileText className="h-3.5 w-3.5" />
                      </Button>
                      {(order.amountDue > 0 && order.status !== "Draft") && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className={cn(
                              "font-bold text-blue-600 hover:bg-[#5a141e] hover:text-white bg-gray-50 h-8 transition-colors",
                              isCreatingRP && "animate-pulse"
                          )}
                          onClick={() => handlePayNow(order)}
                          disabled={isCreatingRP}
                          title="Pay Pending Balance Online"
                        >
                           <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-gray-50"
                            title="Send WhatsApp Update"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 font-bold shadow-xl border-gray-100">
                          <DropdownMenuItem onClick={() => handleSendWhatsApp("confirmation", order)} className="cursor-pointer py-2">
                            Send Order Confirmation
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsApp("payment_link", order)} disabled={order.amountDue === 0} className="cursor-pointer py-2">
                            Send Payment Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsApp("payment_success", order)} disabled={order.amountPaid === 0} className="cursor-pointer py-2">
                            Send Payment Receipt
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsApp("dispatched", order)} className="cursor-pointer py-2">
                            Mark as Dispatched
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendWhatsApp("delivered", order)} className="cursor-pointer py-2">
                            Mark as Delivered
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDelete(order._id)}
                        title="Delete Order"
                       >
                         <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


