/**
 * Order export utilities
 * - exportOrdersToCSV  → downloads a CSV file
 * - exportOrdersToPDF  → downloads a branded PDF table
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Order } from "@/store/OrderApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCustomerName(order: Order): string {
  if (typeof order.customerId === "object" && order.customerId !== null) {
    return order.customerId.name ?? "—";
  }
  return "—";
}

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

/* ─── CSV Export ─────────────────────────────────────────────────────────── */

export function exportOrdersToCSV(orders: Order[], filename = "orders"): void {
  if (orders.length === 0) {
    alert("No orders to export.");
    return;
  }

  const headers = [
    "Order #",
    "Customer",
    "Event Name",
    "Event Date",
    "Venue",
    "Pax",
    "Status",
    "Payment Status",
    "Total Amount (₹)",
    "Amount Paid (₹)",
    "Amount Due (₹)",
    "Archived",
  ];

  const escapeCsv = (val: unknown): string => {
    const str = String(val ?? "");
    // Wrap in quotes if it contains comma, quote, or newline
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = orders.map((o) => [
    escapeCsv(o.orderNumber),
    escapeCsv(getCustomerName(o)),
    escapeCsv(o.eventName ?? ""),
    escapeCsv(formatDate(o.eventDate)),
    escapeCsv(o.venue),
    escapeCsv(o.pax),
    escapeCsv(o.status),
    escapeCsv(o.paymentStatus ?? "Pending"),
    escapeCsv(o.totalAmount),
    escapeCsv(o.amountPaid),
    escapeCsv(o.amountDue),
    escapeCsv(o.isArchived ? "Yes" : "No"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n"
  );

  // BOM for Excel to recognise UTF-8 (₹ symbol)
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

/* ─── PDF Export ─────────────────────────────────────────────────────────── */

// Brand colours
const BRAND_MAROON = [90, 20, 30] as [number, number, number];
const BRAND_GOLD = [196, 160, 80] as [number, number, number];
const LIGHT_GREY = [248, 248, 248] as [number, number, number];
const MID_GREY = [220, 220, 220] as [number, number, number];
const TEXT_DARK = [30, 30, 30] as [number, number, number];

export function exportOrdersToPDF(
  orders: Order[],
  title = "Order Report",
  filename = "orders"
): void {
  if (orders.length === 0) {
    alert("No orders to export.");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  /* ── Header banner ── */
  doc.setFillColor(...BRAND_MAROON);
  doc.rect(0, 0, pageW, 22, "F");

  // Logo / company name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("🌿 The Satvata Foods", 10, 13);

  // Report title on right
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, pageW - 10, 9, { align: "right" });
  doc.setFontSize(9);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-IN")}  |  Total Records: ${orders.length}`,
    pageW - 10,
    15,
    { align: "right" }
  );

  /* ── Gold underline ── */
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.8);
  doc.line(0, 22, pageW, 22);

  /* ── Summary strip ── */
  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount ?? 0), 0);
  const totalDue = orders.reduce((s, o) => s + (o.amountDue ?? 0), 0);
  const totalPaid = orders.reduce((s, o) => s + (o.amountPaid ?? 0), 0);

  doc.setFillColor(...LIGHT_GREY);
  doc.rect(0, 23, pageW, 14, "F");
  doc.setTextColor(...TEXT_DARK);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const summaryY = 31;
  doc.text(`Total Revenue: ${formatINR(totalRevenue)}`, 10, summaryY);
  doc.text(`Total Paid: ${formatINR(totalPaid)}`, 80, summaryY);
  doc.text(`Total Due: ${formatINR(totalDue)}`, 150, summaryY);
  doc.text(`Orders: ${orders.length}`, 220, summaryY);

  doc.setDrawColor(...MID_GREY);
  doc.setLineWidth(0.3);
  doc.line(0, 37, pageW, 37);

  /* ── Table ── */
  const tableStartY = 40;

  const head = [
    [
      "Order #",
      "Customer",
      "Event",
      "Event Date",
      "Venue",
      "Pax",
      "Status",
      "Payment",
      "Total",
      "Due",
    ],
  ];

  const body = orders.map((o) => [
    o.orderNumber,
    getCustomerName(o),
    o.eventName ?? "—",
    formatDate(o.eventDate),
    o.venue.length > 30 ? o.venue.slice(0, 28) + "…" : o.venue,
    String(o.pax),
    o.status,
    o.paymentStatus ?? "Pending",
    formatINR(o.totalAmount),
    formatINR(o.amountDue),
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head,
    body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: TEXT_DARK,
      lineColor: MID_GREY,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: BRAND_MAROON,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: LIGHT_GREY,
    },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 38 },
      5: { cellWidth: 12, halign: "center" },
      6: { cellWidth: 22, halign: "center" },
      7: { cellWidth: 20, halign: "center" },
      8: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      9: { cellWidth: 20, halign: "right" },
    },
    // Colour-code status column
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 6) {
        const val = data.cell.raw as string;
        if (val === "Cancelled") {
          data.cell.styles.textColor = [180, 40, 40];
          data.cell.styles.fontStyle = "bold";
        } else if (val === "Completed" || val === "Delivered") {
          data.cell.styles.textColor = [30, 120, 60];
          data.cell.styles.fontStyle = "bold";
        } else if (val === "In-Prep" || val === "Dispatched") {
          data.cell.styles.textColor = [160, 100, 10];
        }
      }
      // Red for non-zero due
      if (data.section === "body" && data.column.index === 9) {
        const raw = String(data.cell.raw ?? "");
        if (raw !== "₹0" && raw !== "—") {
          data.cell.styles.textColor = [160, 30, 30];
        }
      }
    },
  });

  /* ── Footer on every page ── */
  const totalPages = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND_MAROON);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(
      `The Satvata Foods — Catering Operations  |  Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 3,
      { align: "center" }
    );
  }

  doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ─── Single-order PDF (order detail receipt / delivery note) ─────────────── */

export function exportSingleOrderToPDF(order: Order): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  /* ── Header ── */
  doc.setFillColor(...BRAND_MAROON);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("The Satvata Foods", 10, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Satvik Catering & Events", 10, 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ORDER CONFIRMATION", pageW - 10, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(order.orderNumber, pageW - 10, 20, { align: "right" });

  /* ── Gold rule ── */
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(1);
  doc.line(0, 30, pageW, 30);

  /* ── Customer & Event info ── */
  const customerName = getCustomerName(order);
  const customer =
    typeof order.customerId === "object" && order.customerId !== null
      ? order.customerId
      : null;

  let y = 38;
  doc.setTextColor(...TEXT_DARK);

  // Left column
  const renderField = (label: string, value: string, lx: number, ly: number) => {
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(label.toUpperCase(), lx, ly);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_DARK);
    doc.text(value, lx, ly + 5);
  };

  const COL1 = 10;
  const COL2 = 110;

  renderField("Customer", customerName, COL1, y);
  if (customer?.phone) renderField("Phone", customer.phone, COL2, y);

  y += 14;
  renderField("Event Name", order.eventName ?? "—", COL1, y);
  renderField("Event Date", formatDate(order.eventDate), COL2, y);

  y += 14;
  renderField("Venue", order.venue, COL1, y);
  renderField("Headcount (Pax)", String(order.pax ?? "—"), COL2, y);

  y += 14;
  renderField("Status", order.status, COL1, y);
  renderField(
    "Delivery Date",
    order.deliveryDate ? formatDate(order.deliveryDate) : "—",
    COL2,
    y
  );

  y += 14;
  doc.setDrawColor(...MID_GREY);
  doc.setLineWidth(0.3);
  doc.line(10, y, pageW - 10, y);
  y += 6;

  /* ── Line Items Table ── */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Menu Items", 10, y);
  y += 4;

  const lineItemHead = [["#", "Item", "Qty", "Unit Price", "Amount"]];
  const lineItemBody = (order.lineItems ?? []).map((item, idx) => {
    const itemName =
      typeof item.menuItemId === "object" && item.menuItemId !== null
        ? (item.menuItemId as { name: string }).name ?? "—"
        : "—";
    const unitPrice = item.unitPrice || 0;
    const amount = unitPrice * (item.qty || 0);
    return [
      String(idx + 1),
      itemName,
      String(item.qty || 0),
      formatINR(unitPrice),
      formatINR(amount),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: lineItemHead,
    body: lineItemBody,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND_MAROON, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT_GREY },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 90 },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
  });

  /* ── Totals block ── */
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const renderTotal = (
    label: string,
    value: string,
    ty: number,
    bold = false,
    colour: [number, number, number] = TEXT_DARK
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 9.5);
    doc.setTextColor(...colour);
    doc.text(label, pageW - 60, ty);
    doc.text(value, pageW - 10, ty, { align: "right" });
  };

  let ty = finalY;
  renderTotal("Subtotal:", formatINR(order.totalAmount), ty);
  ty += 7;
  renderTotal("Amount Paid:", formatINR(order.amountPaid), ty, false, [30, 120, 60]);
  ty += 7;
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.5);
  doc.line(pageW - 70, ty, pageW - 10, ty);
  ty += 5;
  renderTotal("Balance Due:", formatINR(order.amountDue), ty, true, [160, 30, 30]);

  /* ── Notes ── */
  if (order.notes) {
    ty += 14;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("NOTES", 10, ty);
    ty += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_DARK);
    doc.setFontSize(9);
    doc.text(order.notes, 10, ty, { maxWidth: pageW - 80 });
  }

  /* ── Footer ── */
  doc.setFillColor(...BRAND_MAROON);
  doc.rect(0, pageH - 14, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Thank you for choosing The Satvata Foods!", pageW / 2, pageH - 8, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    "Satvik Catering & Events  |  info@satvatafoods.in",
    pageW / 2,
    pageH - 3,
    { align: "center" }
  );

  doc.save(`Order_${order.orderNumber}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
