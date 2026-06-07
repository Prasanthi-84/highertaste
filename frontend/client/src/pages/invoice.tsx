import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Printer, CheckCircle2, QrCode } from "lucide-react";
import { mockOrders } from "@/lib/mockData";
import { useParams } from "wouter";
import { Separator } from "@/components/ui/separator";
import logoImg from "@assets/HIgher_taste_logo_1771483400145.png";

import { exportSingleOrderToPDF } from "@/lib/exportInvoices";

export default function InvoicePage() {
  const { id } = useParams();
  const order = mockOrders.find(o => o.id === id) || mockOrders[0];
  
  const subtotal = order.totalAmount / 1.05;
  const gst = order.totalAmount - subtotal;
  const cgst = gst / 2;
  const sgst = gst / 2;

  const handleDownload = () => {
    exportSingleOrderToPDF(order);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-bold">Tax Invoice</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-12 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={logoImg} alt="Satvata Foods" className="h-16 w-auto" />
                <div>
                  <h1 className="text-3xl font-bold text-primary leading-none">The Satvata Foods</h1>
                  <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mt-1">Catering Services</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground max-w-xs">
                  Hare Krishna Hill, Sant Nagar, Main Road, East of Kailash, New Delhi, Delhi 110065
                </p>
                <p className="text-sm font-bold text-primary">GSTIN: 07AAATI1234A1Z1</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <h2 className="text-3xl font-light uppercase tracking-widest text-muted-foreground">Invoice</h2>
              <p className="font-mono text-sm">#{order.id.replace('ORD-', 'INV-')}</p>
              <p className="text-sm text-muted-foreground">Date: {new Date().toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <Separator />

          {/* Billing Info */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Bill To:</h3>
              <p className="font-bold text-lg">{order.customerName}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.venue}</p>
              {order.gstNumber && <p className="text-sm font-semibold">GSTIN: {order.gstNumber}</p>}
            </div>
            <div className="text-right space-y-2">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Event Details:</h3>
              <p className="text-sm">Date: <span className="font-medium">{order.eventDate}</span></p>
              <p className="text-sm">Headcount: <span className="font-medium">{order.headcount} Pax</span></p>
              <Badge className="mt-2 bg-primary">{order.status}</Badge>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-md border border-primary/20">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow>
                  <TableHead className="text-primary font-bold">Description</TableHead>
                  <TableHead className="text-right text-primary font-bold">Rate</TableHead>
                  <TableHead className="text-right text-primary font-bold">Qty</TableHead>
                  <TableHead className="text-right text-primary font-bold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item}</TableCell>
                    <TableCell className="text-right">₹{(order.totalAmount / order.items.length / 1.05).toFixed(2)}</TableCell>
                    <TableCell className="text-right">1</TableCell>
                    <TableCell className="text-right">₹{(order.totalAmount / order.items.length / 1.05).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-lg border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground italic">
                <span>CGST (2.5%)</span>
                <span>₹{cgst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground italic">
                <span>SGST (2.5%)</span>
                <span>₹{sgst.toFixed(2)}</span>
              </div>
              <Separator className="bg-primary/20" />
              <div className="flex justify-between font-bold text-xl text-primary">
                <span>Total</span>
                <span>₹{order.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-2 text-red-600">
                <span>Balance Due</span>
                <span>₹{order.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Footer/Payment */}
          <div className="grid grid-cols-2 gap-8 pt-12">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Payment Info:</h3>
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold">Razorpay Secure Integrated</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Payment Link sent via Meta WhatsApp Cloud API
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-right">
              <QrCode className="h-24 w-24 text-primary opacity-20" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Scan to Pay securely</p>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-primary/10">
            <p className="text-base font-bold text-primary italic">"Satvata Foods - Serving Satvik Excellence"</p>
            <p className="text-[10px] text-muted-foreground mt-2 italic">Computer generated invoice. ISKCON Delhi - Satvata Foods Unit.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
