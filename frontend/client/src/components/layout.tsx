import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Receipt,
  PieChart,
  LayoutDashboard,
  Calendar,
  ShoppingBag,
  FileText,
  Users,
  ChefHat,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Menu as MenuIcon,
  MessageSquare
} from "lucide-react";

import logoImg from "@assets/HIgher_taste_logo_1771483400145.png";

import { useDispatch, useSelector } from "react-redux";
import { logOut, selectCurrentUser } from "@/store/authSlice";

export function Sidebar() {
  const [location] = useLocation();
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/orders", label: "Orders", icon: ShoppingBag },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/quotes", label: "Quotes", icon: FileText },
    { href: "/invoices", label: "Invoices", icon: FileText },
    { href: "/customers", label: "Customers", icon: Users },
    { href: "/menu", label: "Menu", icon: MenuIcon },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/reports", label: "Reports", icon: PieChart },
    { href: "/kitchen", label: "Kitchen View", icon: ChefHat },
    { href: "/feedback", label: "Feedback", icon: MessageSquare },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  const handleLogOut = () => {
    dispatch(logOut());
  };

  const getInitials = (name: string) => {
    return name?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "??";
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-20 items-center border-b border-sidebar-border px-4 py-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <img src={logoImg} alt="Satvata Foods" className="h-12 w-auto object-contain bg-white rounded p-1" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight">Satvata</span>
            <span className="font-bold text-lg leading-tight tracking-tight text-primary-foreground/80">Foods</span>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer",
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-4 border-primary pl-2" : "text-sidebar-foreground/70"
                  )}
                >
                  <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-primary")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 rounded-md bg-sidebar-accent/50 px-3 py-3">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {getInitials(user?.name || "User")}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{user?.name || "Arjun Das"}</p>
            <p className="truncate text-xs text-muted-foreground capitalize">{user?.role || "Admin"}</p>
          </div>
          <button 
            onClick={handleLogOut}
            className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/5"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
