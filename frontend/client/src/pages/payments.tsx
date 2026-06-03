import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Download, 
  FileText, 
  ArrowUpRight, 
  Loader2, 
  TrendingUp, 
  Smartphone, 
  Clock,
  AlertCircle,
  MessageCircle
} from "lucide-react";
import { Link } from "wouter";
import { useGetPaymentsQuery, useGetSummaryQuery, useSharePaymentLinkWhatsappMutation } from "@/store/paymentApi";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Payments() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { data: paymentsData, isLoading: isLoadingPayments, error: paymentError } = useGetPaymentsQuery();
  const { data: summaryData, isLoading: isLoadingSummary } = useGetSummaryQuery();
  const [sharePaymentLinkWhatsapp, { isLoading: isSendingWA }] = useSharePaymentLinkWhatsappMutation();

  const handleSendPaymentLink = async (orderId: string) => {
    if (!orderId) { toast({ title: "No Order", description: "No order linked to this payment.", variant: "destructive" }); return; }
    try {
      await sharePaymentLinkWhatsapp(orderId).unwrap();
      toast({ title: "WhatsApp Sent", description: "Payment link sent via WhatsApp." });
    } catch (err: any) {
      toast({ title: "WhatsApp Error", description: err?.data?.message || "Failed to send payment link.", variant: "destructive" });
    }
  };

  const payments = paymentsData?.data || [];
  const summary = summaryData?.data || { totalCollected: 0, upiTotal: 0, pendingReconciliation: 0 };

  const filteredPayments = payments.filter(pay => {
    const custName = pay.customerId?.name || "";
    const orderNum = pay.orderId?.orderNumber || "";
    const transId = pay.transactionId || "";
    const ref = pay.reference || "";
    
    return (
      custName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ref.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleExport = () => {
    const headers = ["Transaction ID", "Date", "Order", "Customer", "Method", "Reference", "Amount", "Status"];
    const rows = filteredPayments.map(p => [
      p.transactionId,
      format(new Date(p.createdAt), "dd-MM-yyyy"),
      p.orderId?.orderNumber || "—",
      p.customerId?.name || "—",
      p.method,
      p.reference,
      p.amount,
      p.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HT_Payments_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoadingPayments || isLoadingSummary) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center gap-4">
        <AlertCircle className="h-12 w-12 text-destructive opacity-20" />
        <h2 className="text-xl font-semibold">Failed to load payments</h2>
        <p className="text-muted-foreground">Error fetching transaction history from server.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Payments Ledger</h1>
          <p className="text-muted-foreground mt-1">Track all incoming payments and transaction history.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, Customer, Ref..." 
              className="pl-9 h-11 border-primary/20 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 font-bold gap-2 shadow-sm" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-premium bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-gray-400 mb-1">Total Collected</p>
                <h3 className="text-3xl font-black text-[#5a141e]">₹{summary.totalCollected.toLocaleString()}</h3>
                <p className="text-[10px] text-emerald-600 font-bold mt-2 uppercase flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Life-time revenue
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-[#5a141e]/5 flex items-center justify-center">
                <TrendingUp className="h-7 w-7 text-[#5a141e]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-gray-400 mb-1">UPI Transactions</p>
                <h3 className="text-3xl font-black text-emerald-700">{summary.upiTotal.toLocaleString()}</h3>
                <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase">Digital Payments count</p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <Smartphone className="h-7 w-7 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-premium bg-white overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-gray-400 mb-1">Pending Rec.</p>
                <h3 className="text-3xl font-black text-rose-700">₹{summary.pendingReconciliation.toLocaleString()}</h3>
                <p className="text-[10px] text-rose-500 font-bold mt-2 uppercase flex items-center gap-1">
                   <Clock className="h-3 w-3" /> Awaiting Verification
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center">
                <Clock className="h-7 w-7 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Ledger Card */}
      <Card className="border-none shadow-premium bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b py-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-[#5a141e]">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="py-4 pl-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Txn ID</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Date</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Order Ref</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Method</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider">Ref ID</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 text-[11px] uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="py-4 pr-6 font-bold text-slate-700 text-[11px] uppercase tracking-wider text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center text-muted-foreground font-bold">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-5" />
                        No transactions recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((pay) => (
                    <TableRow key={pay._id} className="hover:bg-primary/5 transition-colors group">
                      <TableCell className="pl-6 font-mono text-[10px] font-black tracking-tighter text-[#5a141e]">
                        {pay.transactionId || pay._id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600">
                        {format(new Date(pay.createdAt), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-xs font-black text-slate-800">
                        <Link href={`/orders/${pay.orderId?._id}`} className="hover:text-primary hover:underline">
                           {pay.orderId?.orderNumber || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-700">
                        {pay.customerId?.name || "—"}
                      </TableCell>
                      <TableCell className="text-[10px] font-black uppercase tracking-tight">
                        <span className={cn(
                           "px-2 py-0.5 rounded text-white",
                           pay.method === 'Cash' ? "bg-emerald-500" :
                           pay.method === 'UPI' ? "bg-purple-500" :
                           "bg-blue-500"
                        )}>
                            {pay.method}
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono text-slate-400 font-bold">
                        {pay.reference || "N/A"}
                      </TableCell>
                      <TableCell className="text-right font-black text-[#5a141e]">
                         ₹{pay.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                         <Badge className={cn(
                             "text-[10px] uppercase font-black",
                             (pay.status === 'Completed' || pay.status === 'Succeeded') ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                             pay.status === 'Failed' ? "bg-rose-100 text-rose-800 border-rose-200" :
                             "bg-amber-100 text-amber-800 border-amber-200"
                         )}>
                            {pay.status || "Completed"}
                         </Badge>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <div className="flex justify-end gap-1">
                        {pay.invoiceId ? (
                            <Link href={`/invoices/${pay.invoiceId._id || pay.invoiceId}`}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-primary">
                                    <FileText className="h-4 w-4" />
                                </Button>
                            </Link>
                        ) : (
                            <span className="text-[9px] font-bold text-slate-300">N/A</span>
                        )}
                        {pay.orderId?._id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-green-500 hover:text-green-700"
                            onClick={() => handleSendPaymentLink(pay.orderId?._id || '')}
                            disabled={isSendingWA}
                            title="Send Payment Link via WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
