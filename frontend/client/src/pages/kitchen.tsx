import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  CheckCircle2, 
  ChefHat, 
  AlertTriangle, 
  Loader2, 
  ArrowRight,
  ClipboardList
} from "lucide-react";
import { Link } from "wouter";
import { useGetOrdersQuery, useUpdateOrderStatusMutation } from "@/store/OrderApi";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

export default function Kitchen() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filterMode, setFilterMode] = useState<"today" | "tomorrow">("today");

  const { 
    data: ordersResponse, 
    isLoading, 
    refetch 
  } = useGetOrdersQuery({}, {
    pollingInterval: 15000, 
  });

  const [updateStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const kitchenOrders = ordersResponse?.data?.filter(order => {
    const d = parseISO(order.eventDate);
    if (filterMode === "today" && isToday(d)) return true;
    if (filterMode === "tomorrow" && isTomorrow(d)) return true;
    return false;
  }) || [];

  const activeOrders = kitchenOrders.filter(o => 
    ["Confirmed", "In-Preparation", "Ready"].includes(o.status)
  );

  const handleStatusUpdate = async (id: string, currentStatus: string) => {
    let nextStatus: "In-Preparation" | "Ready" | "Dispatched" = "In-Preparation";
    if (currentStatus === "Confirmed") nextStatus = "In-Preparation";
    else if (currentStatus === "In-Preparation") nextStatus = "Ready";
    else if (currentStatus === "Ready") nextStatus = "Dispatched";

    try {
      await updateStatus({ id, status: nextStatus }).unwrap();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-[#5a141e]">
            <ChefHat className="h-8 w-8" /> Kitchen Display System
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Live view of upcoming food preparation tasks.</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 text-xs bg-green-50 text-green-700 border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-600 mr-2 animate-pulse"></span>
            Live
          </Badge>
          <div className="text-sm font-bold text-slate-400 tabular-nums">
            {format(currentTime, "hh:mm a")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {activeOrders.map((order) => (
          <Card key={order._id} className={cn(
             "shadow-sm border-l-[3px] overflow-hidden",
             order.status === "Confirmed" ? "border-l-blue-500" : "border-l-amber-500"
          )}>
            <CardHeader className="pb-3 border-b-0">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="secondary" className="px-3 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border-none rounded">
                    {format(parseISO(order.eventDate), "yyyy-MM-dd")}
                </Badge>
                <Badge className={cn(
                    "text-[10px] font-black uppercase tracking-tight py-0 hot rounded px-2",
                    order.status === "In-Preparation" ? "bg-amber-500" : "bg-blue-500"
                )}>
                  {order.status === "In-Preparation" ? "In-Prep" : order.status}
                </Badge>
              </div>
              <Link href={`/orders/${order._id}`}>
                <CardTitle className="text-xl font-bold mt-2 cursor-pointer hover:text-primary transition-colors text-slate-800">
                    {order.eventName || "Event Name"}
                </CardTitle>
              </Link>
              <CardDescription className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Clock className="h-3 w-3" /> Due: 12:00 PM (Mock Time)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-4">
                <div className="bg-slate-50/50 p-4 rounded-lg border border-slate-100 shadow-inner">
                   <div className="text-[11px] font-bold text-slate-400 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                      <ClipboardList className="h-3 w-3" /> Menu Items ({order.lineItems?.length || 0})
                   </div>
                   <ul className="space-y-2">
                     {(order.lineItems || []).map((item, idx) => (
                       <li key={idx} className="text-sm flex items-start gap-2 text-slate-700">
                         <span className="text-slate-300">•</span>
                         <span className="font-medium text-[13px]">{typeof item.menuItemId === 'object' && item.menuItemId !== null ? item.menuItemId.name : item.name}</span>
                       </li>
                     ))}
                   </ul>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Headcount:</span>
                   <span className="text-lg font-black text-slate-800 tabular-nums">{order.pax} <span className="text-xs text-slate-400 font-bold uppercase tracking-tight">Pax</span></span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-6 px-6">
              <Button 
                className={cn(
                    "w-full h-12 font-black uppercase tracking-[0.15em] text-[11px] rounded-md transition-all shadow-sm",
                    order.status === "In-Preparation" 
                      ? "bg-[#5a141e] hover:bg-[#4a1019] text-white" 
                      : "bg-[#f5f5f5] hover:bg-slate-200 text-[#5a141e]"
                )}
                disabled={isUpdating}
                onClick={() => handleStatusUpdate(order._id, order.status)}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    {order.status === "In-Preparation" ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Ready for Dispatch
                      </>
                    ) : (
                      "Start Preparation"
                    )}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}

        {activeOrders.length === 0 && (
          <Card className="border-dashed flex flex-col items-center justify-center p-8 text-center min-h-[350px] bg-slate-50/30 rounded-2xl group transition-all hover:bg-slate-50/50">
             <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-all border border-slate-100">
                <AlertTriangle className="h-8 w-8 opacity-20 text-slate-800" />
             </div>
             <p className="font-bold text-slate-600 text-sm">No more immediate orders for today.</p>
             <Link href="/kitchen">
                <Button variant="link" className="mt-2 text-primary font-black uppercase tracking-widest text-[10px]" onClick={() => setFilterMode("tomorrow")}>
                    View Tomorrow's Prep <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
             </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
