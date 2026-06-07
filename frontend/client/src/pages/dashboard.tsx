import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  ArrowRight,
  ChevronRight,
  Package,
  IndianRupee,
  Calendar,
  CreditCard,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Truck
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetDashboardFinancialQuery, useGetDashboardStatsQuery } from "@/store/dashboardApi";

export default function Dashboard() {
  const { data: financialResponse, isLoading: isLoadingFin, error: financialError } = useGetDashboardFinancialQuery();
  const { data: statsResponse, isLoading: isLoadingStats } = useGetDashboardStatsQuery();
  
  const financialData = financialResponse?.data;
  const statsData = statsResponse?.data;
  
  const summary = financialData?.summary || { totalRevenue: 0, totalOrders: 0, pendingPayments: 0, totalExpenses: 0 };
  const recentOrders = financialData?.recentOrders || [];
  const recentPayments = financialData?.recentPayments || [];

  const todayWorkList = statsData?.todayWorkList || [];
  const tomorrowPrep = statsData?.tomorrowPrep || [];
  const nextWeekForecast = statsData?.nextWeekForecast || [];

  const StatCard = ({ title, value, icon: Icon, change, trend = "up", href }: any) => (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-all border-none shadow-sm cursor-pointer group bg-white overflow-hidden relative">
        <div className={cn(
          "absolute top-0 left-0 w-1 h-full",
          title.includes("Revenue") ? "bg-emerald-500" :
          title.includes("Orders") ? "bg-[#5a141e]" :
          title.includes("Pending") ? "bg-amber-500" : "bg-rose-500"
        )}></div>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 pt-6">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <div className="p-3 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <Icon size={20} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black tracking-tighter flex items-baseline gap-1 text-slate-800">
            {title.includes("₹") || title.includes("Payments") || title.includes("Revenue") || title.includes("Expenses") ? "₹" : ""}
            {value.toLocaleString()}
          </div>
          <p className={cn(
            "text-[10px] font-black mt-3 flex items-center gap-1 uppercase tracking-widest",
            trend === "up" ? "text-emerald-600" : "text-rose-600"
          )}>
            <TrendingUp size={12} className={trend === "down" ? "rotate-180" : ""} /> {change}
          </p>
        </CardContent>
      </Card>
    </Link>
  );

  const ForecastCard = ({ title, date, count, items, icon: Icon, color, footerLink, footerText }: any) => (
    <Card className={cn("border-none shadow-premium bg-white overflow-hidden flex flex-col relative", `border-l-4 ${color}`)}>
      <div className={cn("absolute top-0 left-0 w-1 h-full", color.replace('border-l-', 'bg-'))}></div>
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Icon className={cn("h-5 w-5", color.replace('border-l-', 'text-'))} />
             <CardTitle className="text-xl font-bold text-slate-800">{title}</CardTitle>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{date}</p>
        </div>
        <Badge className={cn("text-[10px] font-black min-w-[24px] flex items-center justify-center h-6", color.replace('border-l-', 'bg-'))}>{count}</Badge>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-2">
           {items.length === 0 ? (
             <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-50 rounded-xl">
                 <p className="text-sm italic text-slate-300 font-bold">{title === "Today's Orders" ? "No orders for today" : title === "Tomorrow's Prep" ? "Clean slate for tomorrow" : "No large events confirmed"}</p>
             </div>
           ) : items.map((item: any, idx: number) => (
             <Link key={idx} href={`/orders/${item.id || item._id}`}>
               <div className="flex items-center justify-between p-3 rounded-xl border border-slate-50 hover:border-primary/20 hover:bg-slate-50/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 group-hover:text-primary">
                        {item.orderNumber?.slice(-3) || (idx + 1).toString().padStart(3, '0')}
                     </div>
                     <div>
                        <p className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{item.customerName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight flex items-center gap-1">
                            <Package className="h-2.5 w-2.5" /> {item.itemsCount || 0} items • ₹{(item.value || 0).toLocaleString()}
                        </p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <Badge variant="outline" className="text-[8px] font-black px-1.5 h-4 border-slate-200">DRAFT</Badge>
                     <ChevronRight className="h-3 w-3 text-slate-300 group-hover:translate-x-1 transition-all" />
                  </div>
               </div>
             </Link>
           ))}
        </div>
      </CardContent>
      <div className="p-4 pt-0 text-center">
         <Link href={footerLink}>
            <div className={cn("text-[10px] font-black uppercase tracking-widest cursor-pointer hover:underline flex items-center justify-center gap-2", color.replace('border-l-', 'text-'))}>
                {footerText} <ArrowRight className="h-3 w-3" />
            </div>
         </Link>
      </div>
    </Card>
  );

  if (isLoadingFin || isLoadingStats) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-muted-foreground animate-pulse">Synchronizing Operations Hub...</p>
        </div>
      </div>
    );
  }

  if (financialError || (statsResponse && statsResponse.success === false)) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center gap-4">
        <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Connection Failed</h2>
          <p className="text-muted-foreground max-w-md mt-2">We couldn't fetch real-time data from the server. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#5a141e]">Operations Hub</h1>
          <p className="text-muted-foreground mt-2 text-lg font-medium">Hare Krishna! Welcome to The Satvata Foods central management.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
           <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Server Live</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={summary.totalRevenue} 
          icon={TrendingUp} 
          change="+12% GROWTH" 
          href="/payments"
          trend="up"
        />
        <StatCard 
          title="Total Orders" 
          value={summary.totalOrders} 
          icon={Package} 
          change="LAST 30 DAYS"
          href="/orders"
          trend="up"
        />
        <StatCard 
          title="Pending Payments" 
          value={summary.pendingPayments} 
          icon={IndianRupee} 
          change="CURRENT RECEIVABLES"
          trend="down"
          href="/invoices"
        />
        <StatCard 
          title="Total Expenses" 
          value={summary.totalExpenses} 
          icon={ArrowDownCircle} 
          change="COST OF OPERATIONS"
          trend="down"
          href="/expenses"
        />
      </div>

      {/* Forecast & Capacity Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <ForecastCard 
            title="Today's Orders" 
            date={format(new Date(), "MMM dd")} 
            count={todayWorkList.length} 
            items={todayWorkList.slice(0, 2)}
            icon={CheckCircle2}
            color="border-l-[#5a141e]"
            footerLink="/orders"
            footerText="View All Today's Work"
         />
         <ForecastCard 
            title="Tomorrow's Prep" 
            date={format(addDays(new Date(), 1), "MMM dd")} 
            count={tomorrowPrep.length} 
            items={tomorrowPrep.slice(0, 2)}
            icon={Truck}
            color="border-l-amber-500"
            footerLink="/kitchen"
            footerText="Check Kitchen Schedule"
         />
         <ForecastCard 
            title="Next Week Forecast" 
            date={`${format(addDays(new Date(), 2), "MMM dd")} - ${format(addDays(new Date(), 8), "MMM dd")}`} 
            count={nextWeekForecast.length} 
            items={nextWeekForecast.slice(0, 2)}
            icon={Calendar}
            color="border-l-blue-500"
            footerLink="/calendar"
            footerText="Open Full Calendar"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Orders Section */}
        <Card className="border-none shadow-premium bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800">Recent Orders</CardTitle>
            </div>
            <Link href="/orders">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/5">
                    View All <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground font-bold">No recent orders found.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentOrders.map((order) => (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="flex items-center justify-between p-4 hover:bg-slate-50 transition-all cursor-pointer group">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                           {order.orderNumber?.slice(-3) || "ORD"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-primary transition-colors">{order.customerName}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            <Calendar className="h-3 w-3" /> {format(new Date(order.date), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="font-black text-slate-800">₹{order.amount.toLocaleString()}</p>
                           <Badge variant="outline" className={cn(
                               "text-[8px] font-black uppercase tracking-tighter py-0 h-4",
                               order.status === 'Completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-primary/5 text-primary border-primary/10"
                           )}>
                                {order.status}
                           </Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments Section */}
        <Card className="border-none shadow-premium bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-[#5a141e]">Recent Payments</CardTitle>
            </div>
            <Link href="/payments">
                <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary tracking-widest hover:bg-primary/5">
                    View Ledger <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayments.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground font-bold">No payments recorded yet.</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentPayments.map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between p-4 hover:bg-emerald-50/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center font-black text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                         <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{pay.customerName}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          <span className="text-emerald-600 font-black">{pay.method}</span> • {pay.transactionId}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-[#5a141e]">₹{pay.amount.toLocaleString()}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(pay.date), "dd MMM HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

// Re-using a simple button component locally for cleaner isolation if needed
function Button({ className, variant, size, children, ...props }: any) {
  const variants = {
    ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };
  const sizes = {
    sm: "h-8 px-3 rounded-md",
    default: "h-10 px-4 py-2"
  };
  return (
    <button className={cn("inline-flex items-center justify-center text-sm font-medium transition-colors focus-visible:outline-none disabled:opacity-50", variants[variant as keyof typeof variants], sizes[size as keyof typeof sizes], className)} {...props}>
      {children}
    </button>
  );
}
