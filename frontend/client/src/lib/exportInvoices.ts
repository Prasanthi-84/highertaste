import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Invoice } from "@/store/invoiceApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatINR(amount?: number): string {
  if (amount === undefined || amount === null) return "₹0";
  return "₹" + amount.toLocaleString("en-IN");
}

// PDF-safe version: jsPDF default Helvetica can't render ₹ glyph
function formatINRPDF(amount?: number): string {
  if (amount === undefined || amount === null) return "Rs.0";
  return "Rs." + amount.toLocaleString("en-IN");
}

// Brand colours
const BRAND_MAROON = [90, 20, 30] as [number, number, number];
const BRAND_GOLD = [196, 160, 80] as [number, number, number];
const LIGHT_GREY = [248, 248, 248] as [number, number, number];
const MID_GREY = [220, 220, 220] as [number, number, number];
const TEXT_DARK = [30, 30, 30] as [number, number, number];

/* ─── CSV Export ─────────────────────────────────────────────────────────── */

export function exportInvoicesToCSV(invoices: Invoice[], filename = "invoices"): void {
  if (invoices.length === 0) {
    alert("No invoices to export.");
    return;
  }

  const headers = [
    "Invoice #",
    "Order Ref",
    "Customer",
    "Date",
    "Amount (₹)",
    "Paid (₹)",
    "Due (₹)",
    "Status"
  ];

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = invoices.map((inv) => [
    escapeCsv(inv.invoiceNumber),
    escapeCsv(inv.orderId?.orderNumber || inv.orderNumber),
    escapeCsv(inv.customerId?.name || inv.customerName),
    escapeCsv(formatDate(inv.date)),
    escapeCsv(inv.totalAmount),
    escapeCsv(inv.amountPaid),
    escapeCsv(inv.balance),
    escapeCsv(inv.status),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ─── Single Invoice PDF Export ─────────────────────────────────────────── */

export function exportSingleInvoiceToPDF(invoice: Invoice): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const MAROON_TEXT = [90, 20, 30] as [number, number, number];
  const LIGHT_TEXT = [100, 100, 100] as [number, number, number];

  // ─── Header ───────────────────────────────────────
  // Left side: Company Info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...MAROON_TEXT);
  doc.text("The Satvata Foods", 20, 25);
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("CATERING SERVICES", 20, 30, { charSpace: 1 });

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT_TEXT);
  let headerY = 38;
  doc.text("Hare Krishna Hill, Sant Nagar, Main Road, East", 20, headerY);
  doc.text("of Kailash, New Delhi, Delhi 110065", 20, headerY + 4);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MAROON_TEXT);
  doc.text(`GSTIN: 07AAATI1234A1Z1`, 20, headerY + 9);

  // Right side: Invoice ID
  doc.setFont("helvetica", "normal");
  doc.setFontSize(24);
  doc.setTextColor(200, 200, 200);
  doc.text("INVOICE", pageW - 20, 25, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...MAROON_TEXT);
  doc.text(`#${String(invoice.invoiceNumber)}`, pageW - 20, 32, { align: "right" });
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text(`Date: ${formatDate(invoice.date)}`, pageW - 20, 37, { align: "right" });

  // ─── Customer & Event Sections ────────────────────
  let infoY = 65;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("BILL TO:", 20, infoY);
  doc.text("EVENT DETAILS:", pageW - 65, infoY);

  infoY += 6;
  doc.setFontSize(12);
  doc.setTextColor(...MAROON_TEXT);
  doc.text(String(invoice.customerId?.name || invoice.customerName || '—'), 20, infoY);
  
  doc.setFontSize(9);
  doc.setTextColor(...MAROON_TEXT);
  doc.text(`Date: ${formatDate(invoice.date)}`, pageW - 65, infoY, { align: "left" });

  infoY += 5;
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("Main Temple Hall, ISKCON Chowpatty", 20, infoY);
  doc.text(`Headcount: 500 Pax`, pageW - 65, infoY);
  
  infoY += 5;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MAROON_TEXT);
  doc.text(`GSTIN: 27AAACI1234A1Z1`, 20, infoY);
  
  doc.setFillColor(...MAROON_TEXT);
  doc.roundedRect(pageW - 65, infoY - 3, 20, 5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.text("Confirmed", pageW - 65 + 10, infoY + 0.5, { align: "center" });

  // ─── Items Table ──────────────────────────────────
  const tableY = infoY + 15;
  const head = [["Description", "Rate", "Qty", "Amount"]];
  const body = (invoice.lineItems || []).map(item => [
    String(item.name || '—'),
    formatINR(item.unitPrice),
    String(item.qty || 0),
    formatINR(item.total)
  ]);

  autoTable(doc, {
    startY: tableY,
    head,
    body,
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 3, textColor: [50, 50, 50] },
    headStyles: { 
      fillColor: [245, 235, 235], 
      textColor: MAROON_TEXT, 
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [220, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 30, halign: "right" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 35, halign: "right", fontStyle: "bold", textColor: MAROON_TEXT }
    },
    alternateRowStyles: { fillColor: [252, 252, 252] }
  });

  // ─── Totals ───────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  let totalY = finalY;
  const colX = pageW - 20;
  const labelX = pageW - 60;

  const drawRow = (label: string, value: string, yPos: number, isBig = false, isBold = false) => {
    doc.setFontSize(isBig ? 14 : 8);
    doc.setFont("helvetica", isBold || isBig ? "bold" : "normal");
    doc.setTextColor(isBig ? MAROON_TEXT[0] : 100, isBig ? MAROON_TEXT[1] : 100, isBig ? MAROON_TEXT[2] : 100);
    doc.text(String(label), labelX, yPos);
    doc.text(String(value), colX, yPos, { align: "right" });
  };

  doc.setFillColor(252, 250, 250);
  doc.rect(labelX - 10, totalY - 5, 60, 40, "F");

  drawRow("Subtotal", formatINR(invoice.subTotal), totalY);
  drawRow("CGST (2.5%)", formatINR(invoice.taxAmount / 2), totalY + 5);
  drawRow("SGST (2.5%)", formatINR(invoice.taxAmount / 2), totalY + 10);
  
  totalY += 20;
  drawRow("Total", formatINR(invoice.totalAmount), totalY, true);
  
  totalY += 10;
  doc.setTextColor(200, 0, 0);
  drawRow("Balance Due", formatINR(invoice.balance), totalY, false, true);

  // ─── Footer ───────────────────────────────────────
  const footerY = pageH - 40;
  
  doc.setFontSize(8);
  doc.setTextColor(...MAROON_TEXT);
  doc.setFont("helvetica", "bold");
  doc.text("PAYMENT INFO:", 20, footerY);
  
  doc.setFontSize(8);
  doc.setTextColor(30, 150, 30);
  doc.text("Razorpay Secure Integrated", 25, footerY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("Payment link sent via Meta WhatsApp Cloud API", 20, footerY + 11);

  // Bottom Center Text
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(10);
  doc.setTextColor(...MAROON_TEXT);
  doc.text("\"Satvata Foods - Serving Satvik Excellence\"", pageW/2, pageH - 18, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("Computer generated invoice. ISKCON Delhi - Satvata Foods Unit.", pageW/2, pageH - 13, { align: "center" });

  doc.save(`${invoice.invoiceNumber}.pdf`);
}

/* ─── Bulk PDF Report Export ───────────────────────────────────────────── */

export function exportInvoicesToPDF(invoices: Invoice[], title = "Invoice Summary Report"): void {
  if (invoices.length === 0) {
    alert("No invoices to export.");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(...BRAND_MAROON);
  doc.rect(0, 0, pageW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("The Satvata Foods — Invoice Report", 10, 12);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(String(title), pageW - 10, 12, { align: "right" });

  const head = [["Invoice #", "Order", "Customer", "Date", "Status", "Amount", "Paid", "Due"]];
  const body = invoices.map(inv => [
    String(inv.invoiceNumber || "—"),
    String(inv.orderId?.orderNumber || inv.orderNumber || "—"),
    String(inv.customerId?.name || inv.customerName || "—"),
    formatDate(inv.date),
    String(inv.status || "—"),
    formatINR(inv.totalAmount),
    formatINR(inv.amountPaid),
    formatINR(inv.balance)
  ]);

  autoTable(doc, {
    startY: 25,
    head,
    body,
    theme: "grid",
    styles: { fontSize: 8 },
    headStyles: { fillColor: BRAND_MAROON }
  });

  doc.save(`Invoice_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ─── Single Order PDF Export ─────────────────────────────────────────── */

export function exportSingleOrderToPDF(order: any): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const MAROON_TEXT = [90, 20, 30] as [number, number, number];
  const LIGHT_TEXT = [100, 100, 100] as [number, number, number];

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...MAROON_TEXT);
  doc.text("The Satvata Foods", 20, 25);
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("CATERING SERVICES", 20, 30, { charSpace: 1 });

  doc.setFontSize(24);
  doc.setTextColor(230, 230, 230);
  doc.text("ORDER SUMMARY", pageW - 20, 25, { align: "right" });
  doc.setFontSize(10);
  doc.setTextColor(...MAROON_TEXT);
  doc.text(`#${String(order.orderNumber || order.id)}`, pageW - 20, 32, { align: "right" });

  // Customer Info
  let currentY = 55;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("CUSTOMER:", 20, currentY);
  doc.text("ORDER DETAILS:", pageW - 80, currentY);

  currentY += 6;
  doc.setFontSize(11);
  doc.setTextColor(...MAROON_TEXT);
  doc.text(String(order.customerId?.name || order.customerName || "—"), 20, currentY);
  doc.setFontSize(9);
  doc.text(`Date: ${new Date(order.deliveryDate || order.eventDate).toLocaleDateString('en-IN')}`, pageW - 80, currentY);

  currentY += 5;
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text(String(order.venue || "—"), 20, currentY, { maxWidth: 80 });
  doc.text(`Status: ${order.status}`, pageW - 80, currentY);

  // Items Table
  const tableY = currentY + 20;
  const head = [["Item Description", "Qty", "Price", "Total"]];
  const body = (order.lineItems || []).map((item: any) => [
    item.name || (typeof item.menuItemId === 'object' ? item.menuItemId.name : "Item"),
    String(item.qty || 0),
    formatINRPDF(item.unitPrice),
    formatINRPDF(item.total || (item.qty * item.unitPrice))
  ]);

  autoTable(doc, {
    startY: tableY,
    head,
    body,
    theme: "grid",
    headStyles: { fillColor: BRAND_MAROON },
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary rows
  const labelX = 120;
  const valueX = pageW - 20;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("Subtotal:", labelX, finalY);
  doc.text(formatINRPDF(order.subTotal || order.totalAmount), valueX, finalY, { align: "right" });

  if (order.taxAmount) {
    doc.text(`GST (${order.taxRate || 18}%):`, labelX, finalY + 6);
    doc.text(formatINRPDF(order.taxAmount), valueX, finalY + 6, { align: "right" });
  }
  if (order.discountAmount && order.discountAmount > 0) {
    doc.text("Discount:", labelX, finalY + 12);
    doc.text(`-${formatINRPDF(order.discountAmount)}`, valueX, finalY + 12, { align: "right" });
  }

  // Divider
  const divY = order.taxAmount ? finalY + 16 : finalY + 10;
  doc.setDrawColor(...MAROON_TEXT);
  doc.line(labelX, divY, pageW - 15, divY);

  // Total — big prominent text
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...MAROON_TEXT);
  doc.text("Total Amount:", labelX, divY + 8);
  doc.text(formatINRPDF(order.totalAmount), valueX, divY + 8, { align: "right" });

  if (order.amountPaid !== undefined) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 150, 30);
    doc.text(`Paid: ${formatINRPDF(order.amountPaid)}`, labelX, divY + 16);
    if (order.amountDue > 0) {
      doc.setTextColor(200, 0, 0);
      doc.text(`Due: ${formatINRPDF(order.amountDue)}`, valueX, divY + 16, { align: "right" });
    }
  }

  doc.save(`Order_${order.orderNumber || order.id}.pdf`);
}
