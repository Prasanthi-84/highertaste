import { useParams, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { 
  useGetInvoiceByIdQuery, 
  useMarkAsPaidMutation 
} from "@/store/invoiceApi";
import { 
  ArrowLeft, 
  Download, 
  Printer, 
  CreditCard,
  Loader2,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { exportSingleInvoiceToPDF } from "@/lib/exportInvoices";
import { toast as toastSonner } from "sonner";
import { useCreatePaymentMutation } from "@/store/paymentApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Smartphone, Building2, Globe } from "lucide-react";
import { useCreatePaymentOrderMutation, useVerifyPaymentMutation } from "@/store/paymentApi";

// Add Razorpay type for TS
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function InvoiceDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: response, isLoading } = useGetInvoiceByIdQuery(id!);
  const [markAsPaid, { isLoading: isPaying }] = useMarkAsPaidMutation();

  const invoice = response?.data;
  const [createPayment, { isLoading: isCreatingPayment }] = useCreatePaymentMutation();

  // Razorpay mutations
  const [createPaymentOrder, { isLoading: isCreatingRP }] = useCreatePaymentOrderMutation();
  const [verifyPaymentMutation] = useVerifyPaymentMutation();

  // Payment form state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "GPay" | "PhonePe" | "Cash" | "Card" | "Bank Transfer" | "Cheque" | "Online">("UPI");
  const [paymentRef, setPaymentRef] = useState("");

  // Update amount when modal opens or invoice loads
  useEffect(() => {
    if (invoice) {
      setPaymentAmount(invoice.balance || 0);
    }
  }, [invoice, isPaymentModalOpen]);

  const handleAddPayment = async () => {
    if (paymentAmount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    if (!invoice?.orderId) {
       toast({ title: "Order data missing", variant: "destructive" });
       return;
    }

    try {
      if (paymentMethod === "Online") {
          await handlePayOnline();
          return;
      }

      await createPayment({
        orderId: invoice.orderId._id,
        invoiceId: id!,
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentRef || "Direct Payment"
      }).unwrap();

      toast({
        title: "Payment Recorded",
        description: `Successfully added ₹${paymentAmount.toLocaleString()} payment.`
      });
      setIsPaymentModalOpen(false);
      setPaymentRef("");
    } catch (err: any) {
      toast({
        title: "Payment Failed",
        description: err?.data?.message || "Internal server error",
        variant: "destructive"
      });
    }
  };

  const handlePayOnline = async () => {
    if (!invoice || !invoice.orderId) return;

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
      const amount = paymentAmount;
      const response = await createPaymentOrder({ 
        orderId: typeof invoice.orderId === 'object' && invoice.orderId !== null ? invoice.orderId._id : invoice.orderId, 
        amount 
      }).unwrap();

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
        description: `Payment for Invoice #${invoice.invoiceNumber}`,
        order_id: rpOrder.id,
        handler: async function (response: any) {
          const verifyData = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            orderId: typeof invoice.orderId === 'object' && invoice.orderId !== null ? invoice.orderId._id : invoice.orderId,
            invoiceId: id!,
            amount: amount,
          };

          try {
            const vRes = await verifyPaymentMutation(verifyData).unwrap();
            if (vRes.success) {
              toast({ title: "Payment Successful", description: `Recorded online payment of ₹${amount.toLocaleString()}` });
              setIsPaymentModalOpen(false);
            } else {
              toast({ title: "Verification Failed", description: vRes.message, variant: "destructive" });
            }
          } catch (err: any) {
            toast({ title: "Error", description: err.data?.message || "Payment verification failed.", variant: "destructive" });
          }
        },
        prefill: {
          name: invoice.customerId?.name || "",
          email: invoice.customerId?.email || "",
          contact: invoice.customerId?.phone || "",
        },
        theme: {
          color: "#5a141e",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Something went wrong with Razorpay initialization.", variant: "destructive" });
    }
  };

  const handleMarkAsPaid = async () => {
    if (!invoice || invoice.balance <= 0) return;

    try {
      // 1. Create a formal payment record for the remaining balance
      await createPayment({
        orderId: invoice.orderId._id,
        invoiceId: id!,
        amount: invoice.balance,
        method: "Cash", // Assume cash for bulk marking
        reference: "Manual Reconciliation",
        notes: "Marked as fully paid from details page"
      }).unwrap();

      toast({
        title: "Success",
        description: `Full payment of ₹${invoice.balance.toLocaleString()} recorded and invoice marked as Paid.`,
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.data?.message || "Failed to finalize payment.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 text-xs">Paid</Badge>;
      case "Partially Paid":
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 text-xs">Partially Paid</Badge>;
      case "Sent":
        return <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-3 py-1 text-xs">Sent</Badge>;
      default:
        return <Badge variant="outline" className="px-3 py-1 text-xs">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center gap-4">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-semibold">Invoice not found</h2>
        <Button variant="outline" onClick={() => setLocation("/invoices")}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2 text-slate-600 hover:bg-slate-100" onClick={() => setLocation("/invoices")}>
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="shadow-sm"
            onClick={() => exportSingleInvoiceToPDF(invoice)}
          >
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="shadow-sm"
            onClick={() => {
              exportSingleInvoiceToPDF(invoice);
              toastSonner.info("Invoice generated for printing");
            }}
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          {invoice.status !== "Paid" && (
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  <CreditCard className="h-4 w-4" /> Add Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] border-emerald-100">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-emerald-800">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                       <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    Record Payment
                  </DialogTitle>
                  <DialogDescription>
                    Recording payment for {invoice.invoiceNumber}. This will update the balance due.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount" className="text-slate-600 font-bold uppercase text-[10px]">Amount Received (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      className="text-lg font-bold border-emerald-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="method" className="text-slate-600 font-bold uppercase text-[10px]">Payment Method</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={(v: any) => setPaymentMethod(v)}
                    >
                      <SelectTrigger className="border-emerald-200">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UPI">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-purple-600" /> UPI / PhonePe / GPay
                          </div>
                        </SelectItem>
                        <SelectItem value="Cash">
                          <div className="flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-emerald-600" /> Cash Payment
                          </div>
                        </SelectItem>
                        <SelectItem value="Bank">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-blue-600" /> Bank Transfer
                          </div>
                        </SelectItem>
                        <SelectItem value="Online">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-[#5a141e]" /> Online Payment (Razorpay)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ref" className="text-slate-600 font-bold uppercase text-[10px]">Reference / Transaction ID</Label>
                    <Input
                      id="ref"
                      placeholder="TXN-123456"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      className="border-emerald-200 focus-visible:ring-emerald-500"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    className={cn(
                        "w-full font-bold h-12 shadow-lg gap-2",
                        paymentMethod === "Online" ? "bg-[#5a141e] hover:bg-[#4a1018]" : "bg-emerald-600 hover:bg-emerald-700"
                    )}
                    onClick={handleAddPayment}
                    disabled={isCreatingPayment || isCreatingRP}
                  >
                    {isCreatingPayment || isCreatingRP ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {paymentMethod === "Online" ? "Proceed to Checkout" : "Confirm Payment Received"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {invoice.status !== "Paid" && (
            <Button size="sm" variant="outline" className="shadow-sm gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleMarkAsPaid} disabled={isPaying}>
               Mark as Fully Paid
            </Button>
          )}
        </div>
      </div>

      {/* Main Invoice Card */}
      <Card className="border-primary/10 shadow-2xl overflow-hidden relative">
        {/* Zebra Stripe Design Element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
        
        <CardHeader className="bg-slate-50/50 p-8 md:p-12">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                 <p className="text-xs font-bold text-primary uppercase tracking-widest">Digital Invoice</p>
                 <h1 className="text-4xl font-black tracking-tight text-slate-800">{invoice.invoiceNumber}</h1>
                 <div className="flex items-center gap-3 mt-4">
                    {getStatusBadge(invoice.status)}
                    <span className="text-xs text-slate-400 font-medium">Order Ref: {invoice.orderId?.orderNumber || "N/A"}</span>
                 </div>
              </div>
              <div className="pt-4 space-y-1">
                <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Customer Details</p>
                <p className="text-2xl font-bold text-slate-800">{invoice.customerId?.name || "Unknown Business"}</p>
              </div>
            </div>
            
            <div className="text-right space-y-6 md:w-64">
               {/* Brand info / Date */}
               <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-500">Date Issued</p>
                  <p className="text-lg font-bold text-slate-700">
                    {invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    }) : '—'}
                  </p>
               </div>
               
               <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 inline-block w-full">
                  <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1 text-center">Amount Due</p>
                  <p className="text-3xl font-black text-primary text-center">₹{(invoice.balance ?? 0).toLocaleString('en-IN')}</p>
               </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 md:p-12 space-y-12">
          {/* Event Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-inner">
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Calendar className="h-3 w-3" /> Event Details
                </p>
                <p className="text-sm font-bold border-l-2 border-primary pl-2">{invoice.notes || "Official Catering Event"}</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Users className="h-3 w-3 text-emerald-400" /> Pax / Volume
                </p>
                <p className="text-sm font-bold border-l-2 border-emerald-400 pl-2">Client Reference Order</p>
             </div>
             <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle2 className="h-3 w-3 text-primary" /> Payment Method
                </p>
                <p className="text-sm font-bold border-l-2 border-primary pl-2">General Ledger</p>
             </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-4">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Requirement Summary</h3>
             <Separator className="bg-primary/10 h-[2px]" />
             <div className="space-y-3">
                {(invoice.lineItems || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between py-2 group">
                    <div className="space-y-0.5">
                       <p className="font-bold text-slate-800 text-lg group-hover:text-primary transition-colors underline decoration-dotted decoration-primary/20 underline-offset-4">{item.name}</p>
                       <p className="text-sm text-slate-500 font-medium">{item.qty} units × ₹{(item.unitPrice ?? 0).toLocaleString('en-IN')}</p>
                    </div>
                    <p className="text-xl font-bold text-slate-800 transition-all group-hover:scale-105 origin-right">₹{(item.total ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                ))}
             </div>
             <Separator className="bg-primary/10 h-[2px] mt-4" />
          </div>

          {/* Totals Section */}
          <div className="flex flex-col items-end">
             <div className="w-full md:w-80 space-y-3">
                <div className="flex justify-between text-slate-600 font-medium">
                   <span>Subtotal</span>
                   <span>₹{(invoice.subTotal ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                   <span>Tax Rate</span>
                   <span>{invoice.taxRate ?? 0}%</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs italic">
                   <span>GST Amount</span>
                   <span>₹{(invoice.taxAmount ?? 0).toLocaleString('en-IN')}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-2xl font-black text-slate-800 py-2">
                   <span>Total</span>
                   <span className="text-primary font-mono tracking-tighter">₹{(invoice.totalAmount ?? 0).toLocaleString('en-IN')}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-4">
                    <div className="bg-emerald-50 p-2 rounded border border-emerald-100 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Paid</span>
                        <span className="text-sm font-black text-emerald-800">₹{(invoice.amountPaid ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-rose-50 p-2 rounded border border-rose-100 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-rose-600 uppercase">Due</span>
                        <span className="text-sm font-black text-rose-800">₹{(invoice.balance ?? 0).toLocaleString('en-IN')}</span>
                    </div>
                </div>
             </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/50 p-8 border-t border-slate-200">
           <div className="flex flex-col md:flex-row justify-between items-center w-full gap-4 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
              <span>The Satvata Foods | Satvik Catering</span>
              <span className="text-primary">Official GST Compliant Document</span>
              <span>Electronic Receipt Generated</span>
           </div>
        </CardFooter>
      </Card>
    </div>
  );
}
