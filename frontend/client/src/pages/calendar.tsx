import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MiniCalendar, CalendarLegend } from "@/components/ui/mini-calendar";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Clock,
  Calendar as CalendarIcon,
  Loader2,
  AlertCircle,
  Users,
  MapPin,
  ArrowRight,
  Package
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useGetOrdersQuery } from "@/store/OrderApi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  isSameMonth
} from "date-fns";
import { cn } from "@/lib/utils";

type CalendarView = "month" | "week" | "day";

export default function CalendarPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [view, setView] = useState<CalendarView>("month");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: ordersResponse, isLoading } = useGetOrdersQuery();
  const orders = ordersResponse?.data || [];

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter === "all") return ["Confirmed", "In-Preparation", "Draft", "Ready", "Dispatched", "Delivered"].includes(order.status);
      return order.status === statusFilter;
    });
  }, [orders, statusFilter]);

  const selectedDateOrders = useMemo(() => {
    return filteredOrders.filter(order => isSameDay(parseISO(order.eventDate), date));
  }, [filteredOrders, date]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-blue-600";
      case "In-Preparation": return "bg-orange-500";
      case "Ready": return "bg-emerald-600";
      default: return "bg-slate-400";
    }
  };

  const getLightStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed": return "bg-blue-50 text-blue-900 border-blue-500 shadow-blue-100";
      case "In-Preparation": return "bg-orange-50 text-orange-900 border-orange-400 shadow-orange-100";
      case "Ready": return "bg-emerald-50 text-emerald-900 border-emerald-500 shadow-emerald-100";
      default: return "bg-slate-50 text-slate-500 border-slate-200 shadow-slate-100";
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
    <div className="space-y-6 pb-20 px-2 lg:px-6 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-800">Events Calendar</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Schedule and manage upcoming catering events.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px] h-9 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:border-primary/50 transition-all bg-white">
              <Filter className="mr-2 h-3.5 w-3.5 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL ACTIVE</SelectItem>
              <SelectItem value="Confirmed">CONFIRMED</SelectItem>
              <SelectItem value="In-Preparation">IN-PREP</SelectItem>
              <SelectItem value="Ready">READY</SelectItem>
              <SelectItem value="Dispatched">DISPATCHED</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              className={cn(
                "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                view === "month" ? "bg-white text-[#5a141e] shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              className={cn(
                "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                view === "week" ? "bg-white text-[#5a141e] shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={cn(
                "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-[0.1em] transition-all",
                view === "day" ? "bg-white text-[#5a141e] shadow-sm" : "text-slate-400 hover:text-slate-600"
              )}
              onClick={() => setView("day")}
            >
              Day
            </button>
          </div>

          <Button
            className="h-9 text-[10px] font-black uppercase tracking-[0.2em] bg-[#5a141e] hover:bg-[#4a1019] px-5 text-white shadow-md shadow-primary/10 rounded-lg"
            onClick={() => { setDate(new Date()); setView("day"); }}
          >
            Today
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          {/* Mini Calendar Widget */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
              border: "1px solid #f1f5f9",
              overflow: "hidden",
            }}
          >
            <MiniCalendar
              selected={date}
              onSelect={(d) => setDate(d)}
              orders={filteredOrders}
            />
            <CalendarLegend />
          </div>
        </div>

        {/* Dynamic View Panel */}
        <Card className="lg:col-span-8 xl:col-span-9 border-none shadow-premium bg-white overflow-hidden min-h-[800px] flex flex-col rounded-3xl">
          <CardHeader className="border-b py-6 px-10 flex flex-row items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#5a141e]/5 flex items-center justify-center text-[#5a141e]">
                <CalendarIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-black text-slate-800 tracking-tight">
                  {format(date, view === "month" ? "MMMM yyyy" : "EEEE, MMMM d, yyyy")}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Operations Hub</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setDate(addDays(date, view === "month" ? -30 : view === "week" ? -7 : -1))} className="h-10 w-10 p-0 text-slate-400 hover:text-[#5a141e] hover:bg-[#5a141e]/10 rounded-2xl transition-all">
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDate(addDays(date, view === "month" ? 30 : view === "week" ? 7 : 1))} className="h-10 w-10 p-0 text-slate-400 hover:text-[#5a141e] hover:bg-[#5a141e]/10 rounded-2xl transition-all">
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin">
            {view === "day" && (
              <div className="divide-y divide-slate-50">
                {Array.from({ length: 15 }).map((_, i) => {
                  const hour = i + 7; // From 7 AM
                  const time = `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
                  const hourlyOrders = selectedDateOrders.filter((_, idx) => (idx + 7) === hour);

                  return (
                    <div key={i} className="flex min-h-[110px] group">
                      <div className="w-24 py-6 px-6 text-[11px] font-black text-slate-300 text-right tabular-nums uppercase tracking-tighter">
                        {time}
                      </div>
                      <div className="flex-1 p-4 relative flex gap-5 items-center overflow-x-auto border-l border-slate-100 group-hover:bg-slate-50/30 transition-all">
                        {hourlyOrders.length === 0 && (
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 flex items-center pl-10 transition-opacity">
                            <span className="text-[9px] font-black text-slate-200 tracking-[0.4em] uppercase">No Events Scheduled</span>
                          </div>
                        )}
                        {hourlyOrders.map((order) => (
                          <Link key={order._id} href={`/orders/${order._id}`}>
                            <div className={cn(
                              "flex-shrink-0 w-[350px] rounded-3xl border-l-[8px] p-6 cursor-pointer shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1",
                              getLightStatusColor(order.status)
                            )}>
                              <div className="flex justify-between items-start mb-3">
                                <Badge variant="outline" className="text-[9px] font-black py-0 h-5 px-2 uppercase tracking-tighter bg-white/60 border-black/5 rounded-lg border-b-2">
                                  {order.status}
                                </Badge>
                                <div className="text-[10px] font-black opacity-30 tabular-nums uppercase">#{order.orderNumber.slice(-3)}</div>
                              </div>
                              <div className="font-black text-lg text-slate-800 leading-tight mb-2 tracking-tight line-clamp-1">{order.eventName || "Premium Catering Event"}</div>
                              <div className="flex flex-col gap-2 pt-2 border-t border-black/5">
                                <div className="text-[10px] font-black flex items-center gap-2 opacity-70 uppercase tracking-widest text-slate-500">
                                  <Users className="h-3.5 w-3.5" /> {order.pax} Pax • {typeof order.customerId === 'object' && order.customerId !== null ? order.customerId.name : "VVIP Guest"}
                                </div>
                                <div className="text-[10px] font-black flex items-center gap-2 opacity-70 uppercase tracking-widest text-slate-500">
                                  <MapPin className="h-3.5 w-3.5" /> {order.venue}
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {view === "month" && (
              <div className="p-0 grid grid-cols-7 border-l border-t border-slate-100 h-full min-h-[700px]">
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
                  <div key={day} className="bg-slate-50/50 p-5 text-center text-[10px] font-black tracking-[0.3em] text-slate-400 border-r border-b border-slate-100 uppercase">
                    {day}
                  </div>
                ))}
                {(() => {
                  const start = startOfWeek(startOfMonth(date));
                  const end = endOfWeek(endOfMonth(date));
                  const days = eachDayOfInterval({ start, end });

                  return days.map((day, idx) => {
                    const isCurrentMonth = isSameMonth(day, date);
                    const isSelected = isSameDay(day, date);
                    const dayOrders = filteredOrders.filter(o => isSameDay(parseISO(o.eventDate), day));

                    return (
                      <div key={idx}
                        onClick={() => setDate(day)}
                        className={cn(
                          "min-h-[140px] p-4 border-r border-b border-slate-100 cursor-pointer transition-all relative overflow-hidden flex flex-col items-start gap-2",
                          isCurrentMonth ? "bg-white" : "bg-slate-50/40 opacity-40 grayscale",
                          isSelected ? "bg-[#5a141e]/5 ring-2 ring-[#5a141e]/20 ring-inset" : "hover:bg-slate-50/50"
                        )}>
                        <span className={cn(
                          "text-sm font-black tabular-nums transition-all border-b-2 pb-1 inline-block",
                          isSelected ? "text-[#5a141e] border-[#5a141e] scale-125" : "text-slate-300 border-transparent"
                        )}>{format(day, "d")}</span>

                        <div className="w-full space-y-1.5 mt-1">
                          {dayOrders.slice(0, 3).map((o, oIdx) => (
                            <div key={oIdx} className={cn(
                              "px-2 py-1 rounded-md text-[9px] font-black uppercase truncate tracking-tighter shadow-sm border-l-2",
                              getStatusColor(o.status),
                              "text-white border-white/20"
                            )}>
                              {o.eventName || "Event"}
                            </div>
                          ))}
                          {dayOrders.length > 3 && (
                            <div className="text-[8px] font-black text-slate-400 text-center uppercase tracking-widest pt-1 border-t border-slate-100">
                              +{dayOrders.length - 3} More Tasks
                            </div>
                          )}
                        </div>

                        {isSameDay(day, new Date()) && !isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200 animate-pulse"></div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {view === "week" && (
              <div className="divide-y divide-slate-100">
                {(() => {
                  const start = startOfWeek(date);
                  const days = eachDayOfInterval({ start, end: addDays(start, 6) });

                  return days.map((day, idx) => {
                    const dayOrders = filteredOrders.filter(o => isSameDay(parseISO(o.eventDate), day));
                    const isSelected = isSameDay(day, date);

                    return (
                      <div key={idx} className={cn(
                        "flex items-start p-10 group transition-all relative overflow-hidden",
                        isSelected ? "bg-[#5a141e]/5" : "hover:bg-slate-50/50"
                      )}>
                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#5a141e]"></div>}
                        <div className="w-64 flex flex-col gap-1">
                          <div className="text-[11px] font-black text-[#5a141e] uppercase tracking-[0.3em] opacity-40">{format(day, "EEEE")}</div>
                          <div className={cn(
                            "text-4xl font-black tabular-nums tracking-tighter",
                            isSelected ? "text-[#5a141e]" : "text-slate-800"
                          )}>{format(day, "MMM d")}</div>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8 pl-10 border-l border-slate-100">
                          {dayOrders.length === 0 ? (
                            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/30 opacity-50">
                              <AlertCircle className="h-8 w-8 text-slate-200 mb-3" />
                              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">No Events Recorded</p>
                            </div>
                          ) : dayOrders.map(o => (
                            <Link key={o._id} href={`/orders/${o._id}`}>
                              <div className={cn(
                                "p-6 rounded-3xl border-l-[8px] shadow-lg hover:shadow-2xl transition-all cursor-pointer hover:-translate-y-1 bg-white",
                                getLightStatusColor(o.status)
                              )}>
                                <div className="flex justify-between items-start mb-3">
                                  <Badge className="text-[8px] font-black bg-white/60 text-inherit border-none shadow-sm">{o.status}</Badge>
                                  <span className="text-[10px] font-black opacity-20 tabular-nums">#{o.orderNumber.slice(-3)}</span>
                                </div>
                                <div className="font-black text-base text-slate-800 tracking-tight truncate mb-2">{o.eventName || "Event"}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1.5 text-slate-500">
                                    <Users className="h-3 w-3" /> {o.pax} Participants
                                  </div>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
