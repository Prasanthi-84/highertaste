import { useState, useMemo } from "react";
import { 
  useGetFeedbackQuery, 
  useAddFeedbackMutation, 
  useDeleteFeedbackMutation 
} from "@/store/feedbackApi";
import { 
  Search, 
  Star, 
  Filter, 
  MessageSquare, 
  Calendar as CalendarIcon, 
  User, 
  Loader2, 
  Download, 
  Plus, 
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const TAGS_OPTIONS = ["Quality", "Service", "Punctuality"];

export default function FeedbackPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { data: response, isLoading } = useGetFeedbackQuery();
  const [addFeedback, { isLoading: isSubmitting }] = useAddFeedbackMutation();
  const [deleteFeedback] = useDeleteFeedbackMutation();

  // Form State
  const [formData, setFormData] = useState({
    orderId: "",
    customerId: "",
    customerName: "",
    rating: 5,
    comment: "",
    tags: [] as string[]
  });

  const feedbackList = response?.data || [];

  const filteredFeedback = useMemo(() => {
    return feedbackList.filter(fb => 
      (fb.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fb.comment || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fb.orderId || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [feedbackList, searchTerm]);

  // Analytics Calculations
  const stats = useMemo(() => {
    if (feedbackList.length === 0) return { avg: "0.0", quality: "0.0", timeliness: "0.0", service: "0.0", count: 0 };

    // Defensive: coerce rating to a number, default 0 if missing
    const safeRating = (r: any) => (isNaN(Number(r)) ? 0 : Number(r));

    const avg = feedbackList.reduce((acc, curr) => acc + safeRating(curr.rating), 0) / feedbackList.length;

    const qualityFb = feedbackList.filter(f => Array.isArray(f.tags) && f.tags.includes("Quality"));
    const serviceFb = feedbackList.filter(f => Array.isArray(f.tags) && f.tags.includes("Service"));
    const punctualityFb = feedbackList.filter(f => Array.isArray(f.tags) && f.tags.includes("Punctuality"));

    const getAvg = (list: typeof feedbackList) =>
      list.length > 0
        ? list.reduce((a, c) => a + safeRating(c.rating), 0) / list.length
        : avg;

    return {
      avg: avg.toFixed(1),
      quality: getAvg(qualityFb).toFixed(1),
      timeliness: getAvg(punctualityFb).toFixed(1),
      service: getAvg(serviceFb).toFixed(1),
      count: feedbackList.length
    };
  }, [feedbackList]);

  const handleExportCSV = () => {
    if (filteredFeedback.length === 0) return;
    const headers = ["Order ID,Customer Name,Rating,Comment,Date,Tags"];
    const rows = filteredFeedback.map(fb => [
      fb.orderId,
      fb.customerName,
      fb.rating,
      `"${fb.comment.replace(/"/g, '""')}"`,
      format(parseISO(fb.createdAt), "yyyy-MM-dd"),
      fb.tags.join("; ")
    ].join(","));
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Feedback_Report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success("Feedback report exported");
  };

  const handleSubmitFeedback = async () => {
    if (!formData.orderId || !formData.customerName || !formData.comment) {
      toast.error("Please provide all details");
      return;
    }
    try {
      await addFeedback({
        ...formData,
        tags: formData.tags as ("Quality" | "Service" | "Punctuality")[]
      }).unwrap();
      toast.success("Feedback submitted successfully");
      setIsAddModalOpen(false);
      setFormData({ orderId: "", customerId: "", customerName: "", rating: 5, comment: "", tags: [] });
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to submit feedback");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this feedback?")) return;
    try {
      await deleteFeedback(id).unwrap();
      toast.success("Feedback deleted");
    } catch (err: any) {
      toast.error(err?.data?.message || err.message || "Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#5a141e]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-[#5a141e] tracking-tight">Customer Satisfaction</h1>
          <p className="text-slate-500 mt-2 font-medium">Analyzing feedback from completed catering events.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-11 border-slate-200 text-slate-600 font-bold px-5 bg-white shadow-sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export Report
          </Button>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="h-11 bg-[#5a141e] hover:bg-[#4a1018] text-white font-bold px-5 shadow-premium">
                <Plus className="mr-2 h-5 w-5" /> Submit Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-[#5a141e] flex items-center gap-2">
                   <div className="p-2 bg-[#5a141e]/10 rounded-lg">
                    <MessageSquare size={18} />
                   </div>
                   Post-Event Feedback
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-400">Record customer response for a completed order.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Order #</Label>
                    <Input 
                      placeholder="ORD-101" 
                      value={formData.orderId}
                      onChange={e => setFormData({...formData, orderId: e.target.value})}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-[#5a141e]/10 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Customer Name</Label>
                    <Input 
                      placeholder="e.g. Ramesh Kumar" 
                      value={formData.customerName}
                      onChange={e => setFormData({...formData, customerName: e.target.value})}
                      className="h-12 bg-slate-50 border-slate-100 rounded-xl focus-visible:ring-[#5a141e]/10 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 text-center block">Rating (1-5 Stars)</Label>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button 
                        key={star} 
                        onClick={() => setFormData({...formData, rating: star})}
                        className="transition-transform active:scale-90"
                      >
                        <Star className={cn("h-8 w-8", star <= formData.rating ? "fill-amber-400 text-amber-400" : "text-slate-200")} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Comment</Label>
                  <textarea 
                    rows={3}
                    placeholder="Tell us what the customer said..." 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-[#5a141e]/10 outline-none text-sm font-medium transition-all"
                    value={formData.comment}
                    onChange={e => setFormData({...formData, comment: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {TAGS_OPTIONS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          const newTags = formData.tags.includes(tag) 
                            ? formData.tags.filter(t => t !== tag) 
                            : [...formData.tags, tag];
                          setFormData({...formData, tags: newTags});
                        }}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          formData.tags.includes(tag) 
                            ? "bg-[#5a141e] text-white border-[#5a141e]" 
                            : "bg-white text-slate-400 border-slate-100 hover:border-[#5a141e]/30"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full h-14 bg-[#5a141e] hover:bg-[#4a1018] text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl" onClick={handleSubmitFeedback} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : "Save Feedback Record"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none bg-[#FDF1F2] rounded-[30px] border-l-4 border-l-[#5a141e] shadow-sm">
          <CardContent className="p-8">
            <p className="text-[#5a141e]/40 font-black text-[10px] uppercase tracking-widest mb-1">Overall Avg Rating</p>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-[#5a141e] tracking-tighter">{stats.avg}</span>
               <span className="text-xl font-bold text-[#5a141e]/30">/ 5.0</span>
            </div>
            <p className="text-[10px] font-bold text-[#5a141e]/50 mt-2 uppercase tracking-tighter">Verified from {stats.count} responses</p>
          </CardContent>
        </Card>

        <Card className="border-none bg-emerald-50 rounded-[30px] border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-8">
            <p className="text-emerald-500/40 font-black text-[10px] uppercase tracking-widest mb-1">Food Quality Score</p>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-emerald-700 tracking-tighter">{stats.quality}</span>
               <span className="text-xl font-bold text-emerald-700/30">/ 5.0</span>
            </div>
            <div className="h-1.5 w-full bg-emerald-100 rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-emerald-500" style={{ width: `${(Number(stats.quality)/5)*100}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-amber-50 rounded-[30px] border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-8">
            <p className="text-amber-500/40 font-black text-[10px] uppercase tracking-widest mb-1">Timeliness Index</p>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-amber-700 tracking-tighter">{stats.timeliness}</span>
               <span className="text-xl font-bold text-amber-700/30">/ 5.0</span>
            </div>
            <div className="h-1.5 w-full bg-amber-100 rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-amber-500" style={{ width: `${(Number(stats.timeliness)/5)*100}%` }}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-blue-50 rounded-[30px] border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-8">
            <p className="text-blue-500/40 font-black text-[10px] uppercase tracking-widest mb-1">Service Excellence</p>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-blue-700 tracking-tighter">{stats.service}</span>
               <span className="text-xl font-bold text-blue-700/30">/ 5.0</span>
            </div>
            <div className="h-1.5 w-full bg-blue-100 rounded-full mt-3 overflow-hidden">
               <div className="h-full bg-blue-500" style={{ width: `${(Number(stats.service)/5)*100}%` }}></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border border-slate-100 bg-white rounded-[40px] shadow-premium overflow-hidden">
        <CardHeader className="p-10 border-b border-slate-50 bg-slate-50/20">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-[#5a141e]/5 flex items-center justify-center text-[#5a141e]"> 
                  <CheckCircle2 className="h-6 w-6" />
               </div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Recent Feedback</h2>
            </div>
            <div className="relative w-full lg:w-[400px] group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-[#5a141e] transition-colors" />
              <Input
                placeholder="Search by customer name or comments..."
                className="pl-12 h-14 bg-white border-slate-100 rounded-3xl text-sm font-medium focus-visible:ring-[#5a141e]/5 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow className="border-none h-16">
                <TableHead className="px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Rating</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comment</TableHead>
                <TableHead className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</TableHead>
                <TableHead className="px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeedback.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-80 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 py-20 grayscale opacity-40">
                         <AlertCircle className="h-12 w-12" />
                         <div className="space-y-1">
                            <p className="text-xl font-black text-slate-800 tracking-tight">No Responses Yet</p>
                            <p className="text-sm font-medium">Record customer feedback to see analytics here.</p>
                         </div>
                      </div>
                   </TableCell>
                </TableRow>
              ) : (
                filteredFeedback.map((fb) => (
                  <TableRow key={fb._id} className="hover:bg-[#5a141e]/5 h-24 border-b border-slate-50 group transition-all">
                    <TableCell className="px-10 font-black text-[#5a141e] text-xs">
                       {fb.orderNumber || fb.orderId}
                    </TableCell>
                    <TableCell className="min-w-[150px]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-black">
                           {(fb.customerName || "U").split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-bold text-slate-800 text-sm">{fb.customerName || "Anonymous"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={cn("h-4 w-4", star <= fb.rating ? "fill-amber-400 text-amber-400" : "text-slate-100")} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[400px]">
                      <div className="flex items-start gap-3 italic text-sm text-slate-500 font-medium">
                        <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 opacity-20" />
                        <span className="line-clamp-2">"{fb.comment || "No comment provided"}"</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 font-bold uppercase tracking-tight">
                        {fb.createdAt ? format(parseISO(fb.createdAt), "dd MMM yyyy") : "N/A"}
                    </TableCell>
                    <TableCell className="px-10">
                      <div className="flex flex-wrap gap-1.5">
                        {fb.tags.map(tag => (
                          <Badge key={tag} className={cn(
                            "text-[8px] px-2 py-0.5 h-5 font-black uppercase tracking-widest border-none shadow-none",
                            tag === "Quality" ? "bg-emerald-100 text-emerald-700" :
                            tag === "Service" ? "bg-blue-100 text-blue-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-6 opacity-0 group-hover:opacity-100 transition-opacity">
                       <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300">
                                <MoreVertical size={16} />
                             </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl border-slate-100 shadow-2xl">
                             <DropdownMenuItem className="text-rose-600 font-bold cursor-pointer hover:bg-rose-50" onClick={() => handleDelete(fb._id)}>
                                <Trash2 className="h-4 w-4 mr-2" /> Delete feedback
                             </DropdownMenuItem>
                          </DropdownMenuContent>
                       </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
