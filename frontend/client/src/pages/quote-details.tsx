import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Send, Save, ArrowLeft, Loader2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useGetCustomersQuery } from "@/store/customerApi";
import { useGetMenuQuery } from "@/store/menuApi";
import { useCreateQuoteMutation, useUpdateQuoteMutation, useGetQuoteByIdQuery, useSendQuoteWhatsappMutation } from "@/store/quoteApi";

const quoteSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  eventName: z.string().min(1, "Event Name is required"),
  eventDate: z.string().min(1, "Event Date is required"),
  venue: z.string().min(1, "Venue is required"),
  pax: z.coerce.number().min(1, "Pax must be at least 1"),
  validUntil: z.string().min(1, "Expiry date is required"),
  status: z.enum(["Draft", "Sent", "Accepted", "Rejected", "Expired", "Converted"]),
  notes: z.string().optional(),
  taxRate: z.coerce.number().min(0),
  discountAmount: z.coerce.number().min(0),
  lineItems: z.array(z.object({
    menuItemId: z.string().min(1, "Item is required"),
    name: z.string(), // derived
    qty: z.coerce.number().min(1, "Qty must be at least 1"),
    unitPrice: z.coerce.number().min(0),
  })).min(1, "Add at least one item"),
});

type QuoteFormValues = z.infer<typeof quoteSchema>;

export default function QuoteDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const isEditMode = !!id;

  const { data: quoteData, isLoading: isLoadingQuote } = useGetQuoteByIdQuery(id!, { skip: !isEditMode });
  const { data: customers = [] } = useGetCustomersQuery();
  const { data: menu = [] } = useGetMenuQuery();
  
  const [createQuote, { isLoading: isCreating }] = useCreateQuoteMutation();
  const [updateQuote, { isLoading: isUpdating }] = useUpdateQuoteMutation();

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customerId: "",
      eventName: "",
      venue: "",
      pax: 50,
      status: "Draft",
      validUntil: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      eventDate: format(new Date(), "yyyy-MM-dd"),
      taxRate: 18,
      discountAmount: 0,
      lineItems: [{ menuItemId: "", qty: 10, unitPrice: 0, name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  // Load quote data if in edit mode
  useEffect(() => {
    if (quoteData?.success && quoteData.data) {
      const q = quoteData.data;
      form.reset({
        customerId: q.customerId?._id || q.customerId || "",
        eventName: q.eventName || "",
        eventDate: q.eventDate ? q.eventDate.split('T')[0] : "",
        venue: q.venue || "",
        pax: q.pax || 0,
        validUntil: q.validUntil ? q.validUntil.split('T')[0] : "",
        status: q.status as any,
        notes: q.notes || "",
        taxRate: q.taxRate || 18,
        discountAmount: q.discountAmount || 0,
        lineItems: q.lineItems?.map(item => ({
          menuItemId: item.menuItemId,
          name: item.name,
          qty: item.qty,
          unitPrice: item.unitPrice
        })) || []
      });
    }
  }, [quoteData, form]);

  const watchedItems = form.watch("lineItems");
  const watchTax = form.watch("taxRate");
  const watchDiscount = form.watch("discountAmount");

  const subtotal = watchedItems.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);
  const taxAmount = ((subtotal - watchDiscount) * watchTax) / 100;
  const total = subtotal - watchDiscount + taxAmount;

  const onSubmit = async (data: QuoteFormValues) => {
    try {
      // Ensure customerId is just the ID string if it's currently an object
      const cleanCustomerId = typeof data.customerId === 'object' && data.customerId !== null
        ? (data.customerId as any)._id 
        : data.customerId;

      const payload = {
        ...data,
        customerId: cleanCustomerId,
        subTotal: subtotal,
        taxAmount: taxAmount,
        totalAmount: total,
        lineItems: data.lineItems.map(item => ({
          ...item,
          total: item.qty * item.unitPrice,
        })),
      };


      if (isEditMode) {
        await updateQuote({ id: id!, data: payload as any }).unwrap();
        toast.success("Quotation updated successfully");
      } else {
        await createQuote(payload as any).unwrap();
        toast.success("New quotation created");
      }
      setLocation("/quotes");
    } catch (err: any) {
      const errorMsg = err.data?.message || err.message || "Failed to save quotation. Please check all fields.";
      toast.error(errorMsg);
    }
  };


  const [sendQuoteWhatsapp, { isLoading: isSendingWhatsApp }] = useSendQuoteWhatsappMutation();

  const handleWhatsAppShare = async () => {
    if (!id) {
      toast.error("Please save the quotation first before sending.");
      return;
    }

    try {
      await sendQuoteWhatsapp(id).unwrap();
      toast.success("WhatsApp quotation sent successfully via Meta Cloud API");
    } catch (err: any) {
      toast.error(err.data?.message || "Failed to send WhatsApp message");
    }
  };

  if (isLoadingQuote) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#5a141e]" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/quotes")}>
          <ArrowLeft className="h-4 w-4 text-[#5a141e]" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#5a141e]">{isEditMode ? "Update Quote" : "New Quotation"}</h1>
          <p className="text-muted-foreground">Provide a professional Satvik catering estimate.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="bg-gray-50/50 rounded-t-lg"><CardTitle className="text-lg">Event & Customer Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-500">Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl><SelectTrigger className="bg-gray-50 border-gray-100"><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {customers.map(c => <SelectItem key={c._id} value={c._id!}>{c.name} ({c.company || "Individual"})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="eventName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-500">Event Name *</FormLabel>
                        <FormControl><Input placeholder="e.g. Annual Feast 2024" className="bg-gray-50 border-gray-100" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-500">Event Date *</FormLabel>
                      <FormControl><Input type="date" className="bg-gray-50 border-gray-100" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="validUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-500">Quote Expiry Date *</FormLabel>
                      <FormControl><Input type="date" className="bg-gray-50 border-gray-100" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <div className="md:col-span-2 grid grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="venue"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-500">Venue *</FormLabel>
                            <FormControl><Input placeholder="Full Venue Address" className="bg-gray-50 border-gray-100" {...field} /></FormControl>
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="pax"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-gray-500">Guest Count (Pax) *</FormLabel>
                            <FormControl><Input type="number" className="bg-gray-50 border-gray-100" {...field} /></FormControl>
                        </FormItem>
                        )}
                    />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between bg-gray-50/50 rounded-t-lg">
                <CardTitle className="text-lg">Menu Selections</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ menuItemId: "", qty: 10, unitPrice: 0, name: "" })} className="border-gray-200 text-[#5a141e] hover:bg-[#5a141e]/5">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 pt-6 text-sm">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border-b pb-4 last:border-0">
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.menuItemId`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <Select 
                            onValueChange={(val) => {
                                field.onChange(val);
                                const selected = menu.find(m => m.id === val);
                                if (selected) {
                                    form.setValue(`lineItems.${index}.unitPrice`, Number(selected.price));
                                    form.setValue(`lineItems.${index}.name`, selected.name);
                                }
                            }} 
                            value={field.value || ""}
                          >
                            <FormControl><SelectTrigger className="bg-gray-50 border-gray-100"><SelectValue placeholder="Select menu item" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {menu.map(m => <SelectItem key={m.id} value={m.id!}>{m.name} (₹{Number(m.price).toLocaleString()})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`lineItems.${index}.qty`}
                      render={({ field }) => (
                        <FormItem className="w-24">
                          <FormControl><Input type="number" className="bg-gray-50 border-gray-100" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="w-32 pt-2.5 font-bold text-primary flex justify-end">
                        ₹{Number(watchedItems[index]?.unitPrice * watchedItems[index]?.qty || 0).toLocaleString()}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="hover:bg-rose-50" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-rose-600" /></Button>
                  </div>
                ))}
                {fields.length === 0 && <p className="text-center py-4 text-gray-400 italic">No items added yet. Click "Add Item" to start your quotation.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-sm bg-white">
              <CardHeader className="border-b bg-gray-50/30">
                <CardTitle className="text-lg font-bold">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                  <span>Subtotal</span>
                  <span className="text-gray-900">₹{subtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Tax ({watchTax}%)</span>
                    <Input 
                      type="number" 
                      className="h-7 w-16 text-right px-1 bg-gray-50 border-gray-100 text-[11px]" 
                      {...form.register("taxRate")}
                    />
                  </div>
                  <span className="text-gray-900">₹{taxAmount.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>Discount (₹)</span>
                    <Input 
                      type="number" 
                      className="h-7 w-20 text-right px-1 bg-gray-50 border-gray-100 text-[11px]" 
                      {...form.register("discountAmount")}
                    />
                  </div>
                  <span className="text-rose-600">-₹{Number(watchDiscount).toLocaleString()}</span>
                </div>
                
                <Separator className="bg-gray-100" />
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-black text-[#5a141e]">₹{total.toLocaleString()}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pb-8 pt-2">
                <Button 
                    type="submit"
                    disabled={isCreating || isUpdating}
                    className="w-full bg-[#5a141e] hover:bg-[#4a1018] text-white font-bold h-11 flex items-center justify-center gap-2" 
                >
                    {isCreating || isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isEditMode ? "Update Quotation" : "Save Draft"}
                </Button>
                <Button 
                    type="button"
                    variant="outline" 
                    className="w-full border-[#0070f3]/20 text-[#0070f3] hover:bg-[#0070f3]/5 font-bold h-11 flex items-center justify-center gap-2"
                    onClick={handleWhatsAppShare}
                    disabled={isSendingWhatsApp}
                >
                    {isSendingWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {quoteData?.data?.whatsappSent ? "Resend via WhatsApp" : "Send Quote via WhatsApp"}
                </Button>
                {isEditMode && (
                  <Button 
                      type="button"
                      variant="outline"
                      className="w-full font-bold h-11"
                      onClick={() => window.open(`/api/quotes/download/${id}`, "_blank")}
                  >
                      Preview PDF
                  </Button>
                )}
              </CardFooter>
            </Card>

            {/* WA Status Card */}
            {isEditMode && (
              <Card className="border-none shadow-sm mb-6 bg-white">
                 <CardHeader className="bg-gray-50/50 rounded-t-lg pb-3"><CardTitle className="text-xs uppercase tracking-widest text-gray-400">WhatsApp Delivery</CardTitle></CardHeader>
                 <CardContent className="pt-4 space-y-3">
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">Template Sent:</span>
                     <span className="font-bold">{quoteData?.data?.whatsappSent ? "✅ Yes" : "❌ No"}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                     <span className="text-gray-500">PDF Sent:</span>
                     <span className="font-bold">{quoteData?.data?.pdfSent ? "✅ Yes" : "❌ No"}</span>
                   </div>
                   {quoteData?.data?.whatsappSentAt && (
                     <div className="flex justify-between text-sm">
                       <span className="text-gray-500">Last Sent:</span>
                       <span className="font-bold text-[#5a141e] text-xs">
                         {format(new Date(quoteData.data.whatsappSentAt), "dd MMM yyyy, hh:mm a")}
                       </span>
                     </div>
                   )}
                 </CardContent>
              </Card>
            )}

            <Card className="border-none shadow-sm bg-gray-50/50">
               <CardHeader className="bg-gray-50/50 rounded-t-lg"><CardTitle className="text-xs uppercase tracking-widest text-gray-400">Status & Options</CardTitle></CardHeader>
               <CardContent>
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                    <FormItem>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl><SelectTrigger className="bg-white border-gray-100 font-bold"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="Draft">Draft (Internal)</SelectItem>
                                <SelectItem value="Sent">Sent to Client</SelectItem>
                                <SelectItem value="Accepted">Accepted / Approved</SelectItem>
                                <SelectItem value="Rejected">Rejected</SelectItem>
                                <SelectItem value="Expired">Expired</SelectItem>
                                <SelectItem value="Converted">Converted to Order</SelectItem>
                            </SelectContent>
                        </Select>
                    </FormItem>
                    )}
                />
                <p className="text-[10px] text-gray-400 mt-4 leading-relaxed italic">
                  * Draft status stays internal. Sent status activates WhatsApp reminders.
                </p>
               </CardContent>
             </Card>
          </div>

        </form>
      </Form>
    </div>
  );
}

