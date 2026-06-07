import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  Send, 
  ShoppingCart, 
  Calendar, 
  MapPin, 
  Users, 
  ArrowRightLeft, 
  Loader2, 
  MessageSquare, 
  Filter,
  CheckCircle2,
  Edit2,
  MessageCircle,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { useGetQuotesQuery, useConvertQuoteToOrderMutation, useSendQuoteWhatsappMutation } from "@/store/quoteApi";
import { format } from "date-fns";

export default function Quotes() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertData, setConvertData] = useState({ date: "", venue: "", pax: 0 });

  const { data: quotesData, isLoading } = useGetQuotesQuery({ search: searchTerm });
  const [convertQuoteToOrder, { isLoading: isConverting }] = useConvertQuoteToOrderMutation();
  const [sendQuoteWhatsapp, { isLoading: isSendingWA }] = useSendQuoteWhatsappMutation();

  const quotes = quotesData?.data || [];

  const handleWhatsAppShare = async (quote: any) => {
    try {
      await sendQuoteWhatsapp(quote._id).unwrap();
      toast.success(`Quotation WhatsApp sent to ${quote.customerId?.name || 'customer'}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to send WhatsApp.");
    }
  };

  const handleConvert = async (data: any) => {
    try {
      if (!selectedQuote) return;
      const result = await convertQuoteToOrder({ 
        id: selectedQuote._id, 
        eventDate: data.deliveryDate,
        venue: data.venue,
        pax: data.pax
      }).unwrap();
      
      toast.success(result.message || "Quote converted to Order!");
      setIsConvertOpen(false);
      setLocation(`/orders/${result.data.order._id}`);
    } catch (err: any) {
        console.error("Conversion Error:", err);
      toast.error(err.data?.message || "Failed to convert quote");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft": return <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Draft</Badge>;
      case "Sent": return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Sent</Badge>;
      case "Accepted": return <Badge className="bg-emerald-600 hover:bg-emerald-600">Accepted</Badge>;
      case "Converted": return <Badge className="bg-primary hover:bg-primary">Converted</Badge>;
      case "Rejected": return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredQuotes = quotes.filter((q: any) => 
    q.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.customerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quotations</h1>
          <p className="text-muted-foreground mt-1">Estimates converted to production-ready catering orders.</p>
        </div>
        <Link href="/quotes/new">
          <Button className="gap-2 bg-[#5a141e] hover:bg-[#4a1018] shadow-lg shadow-[#5a141e]/20 h-11 px-6 font-bold">
            <Plus className="h-5 w-5" />
            New Quotation
          </Button>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card className="border-none shadow-xl">
          <CardHeader className="pb-3 border-b bg-gray-50/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-gray-800">All Quotations</CardTitle>
              <div className="flex items-center gap-4">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search Quote # or Customer..." 
                    className="pl-9 h-11 bg-white border-gray-200 shadow-sm focus-visible:ring-[#5a141e]" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="h-11 font-bold gap-2"><Filter className="h-4 w-4" /> Filter</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="h-10">
                    <TableHead className="font-bold text-gray-600 pl-4 w-[100px] text-[11px] uppercase tracking-wider">ID</TableHead>
                    <TableHead className="font-bold text-gray-600 px-1 text-[11px] uppercase tracking-wider">Customer Details</TableHead>
                    <TableHead className="font-bold text-gray-600 px-1 text-[11px] uppercase tracking-wider">Event Date</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right px-1 text-[11px] uppercase tracking-wider">Total</TableHead>
                    <TableHead className="font-bold text-gray-600 text-center px-1 text-[11px] uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-bold text-gray-600 text-right pr-4 text-[11px] uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredQuotes.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-bold">No quotes found. Create a new one to get started!</TableCell></TableRow>
                  ) : filteredQuotes.map((quote: any) => (
                    <TableRow key={quote._id} className="group hover:bg-emerald-50/20 transition-all border-b border-slate-100">
                      <TableCell 
                        className="font-mono text-[11px] font-black text-[#5a141e] cursor-pointer hover:underline py-2.5 pl-4" 
                        onClick={() => setLocation(`/quotes/${quote._id}`)}
                      >
                        {quote.quoteNumber || quote._id.slice(-6).toUpperCase()}
                      </TableCell>
                      <TableCell className="py-2 px-1">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 leading-none mb-0.5 text-sm">{quote.customerId?.name || quote.customerName || "—"}</span>
                          <span className="text-[9px] text-gray-500 font-medium">{quote.eventName || "General Catering"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-gray-600 px-1">
                        {quote.eventDate ? format(new Date(quote.eventDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right font-black text-[#5a141e] px-1 truncate max-w-[100px]">₹{(quote.totalAmount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-center px-1">{getStatusBadge(quote.status)}</TableCell>
                      <TableCell className="text-right pr-4 py-2">
                        <div className="flex justify-end gap-2">
                          {quote.status !== "Converted" ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white border-none font-bold shadow-sm h-8"
                                disabled={quote.status === "Rejected"}
                                onClick={() => {
                                  setSelectedQuote(quote);
                                  setIsConvertOpen(true);
                                }}
                              >
                                 <ArrowRightLeft className="h-3 w-3 mr-2" /> Convert
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#5a141e] bg-gray-50" onClick={() => setLocation(`/quotes/${quote._id}`)}><Edit2 className="h-4 w-4" /></Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-bold text-green-600 hover:bg-green-600 hover:text-white bg-gray-50 h-8 px-2"
                                onClick={() => handleWhatsAppShare(quote)}
                                disabled={isSendingWA}
                                title={quote.whatsappSent ? "Resend Quote via WhatsApp" : "Send Quote via WhatsApp"}
                              >
                                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                                {quote.whatsappSent ? "Resend WA" : "Send WA"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="font-bold text-blue-600 hover:bg-blue-600 hover:text-white bg-gray-50 h-8 px-2"
                                onClick={() => window.open(`/api/quotes/download/${quote._id}`, "_blank")}
                                title="Preview PDF"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1" />
                                Preview PDF
                              </Button>
                            </>
                          ) : (
                            <Link href={`/orders/${quote.convertedToOrderId?._id || quote.convertedToOrderId}`}>
                                <Button variant="link" size="sm" className="font-bold text-[#5a141e] hover:underline">View Order</Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#5a141e]">Convert Quotation</DialogTitle>
            <DialogDescription>This will lock the quote and create a production order.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
               <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-xs font-black uppercase text-gray-400">Date</label>
                  <Input 
                    type="date"
                    className="col-span-3 font-bold" 
                    defaultValue={selectedQuote?.eventDate ? new Date(selectedQuote.eventDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => setConvertData({ ...convertData, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-xs font-black uppercase text-gray-400">Venue</label>
                  <Input 
                    className="col-span-3 font-bold" 
                    defaultValue={selectedQuote?.venue}
                    onChange={(e) => setConvertData({ ...convertData, venue: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <label className="text-right text-xs font-black uppercase text-gray-400">Pax</label>
                  <Input 
                    type="number"
                    className="col-span-3 font-bold" 
                    defaultValue={selectedQuote?.pax}
                    onChange={(e) => setConvertData({ ...convertData, pax: parseInt(e.target.value) })}
                  />
                </div>
          </div>
          <DialogFooter>
            <Button className="w-full bg-[#5a141e] hover:bg-[#4a1018] text-white font-black h-12 shadow-lg" onClick={() => handleConvert({
                deliveryDate: convertData.date || selectedQuote?.eventDate,
                venue: convertData.venue || selectedQuote?.venue,
                pax: convertData.pax || selectedQuote?.pax
            })} disabled={isConverting}>
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm Conversion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

