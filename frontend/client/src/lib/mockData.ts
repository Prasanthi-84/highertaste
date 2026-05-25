export interface Order {
  id: string;
  customerName: string;
  eventDate: string;
  status: 'Draft' | 'Confirmed' | 'In-Prep' | 'Dispatched' | 'Delivered' | 'Completed' | 'Cancelled';
  totalAmount: number;
  balanceDue: number;
  items: string[];
  venue: string;
  headcount: number;
  gstNumber?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isVeg: boolean;
  image?: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  gstNumber?: string;
  totalOrders: number;
  outstandingBalance: number;
}

export interface Feedback {
  id: string;
  orderId: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  tags: string[];
}

export const mockOrders: Order[] = [
  {
    id: "ORD-HT-001",
    customerName: "Radha Krishna Temple Feast",
    eventDate: "2024-10-25",
    status: "Confirmed",
    totalAmount: 125000,
    balanceDue: 50000,
    items: ["Satvik Thali", "Kheer Prasad", "Fruit Salad"],
    venue: "Main Temple Hall, ISKCON Chowpatty",
    headcount: 500,
    gstNumber: "27AAACI1234A1Z1"
  },
  {
    id: "ORD-HT-002",
    customerName: "Reliance Satvik Lunch",
    eventDate: "2026-02-20",
    status: "In-Prep",
    totalAmount: 45000,
    balanceDue: 0,
    items: ["Executive Satvik Meal", "Masala Lassi"],
    venue: "Reliance Corporate Park, Ghansoli",
    headcount: 100
  },
  {
    id: "ORD-HT-003",
    customerName: "Sharma Family Wedding",
    eventDate: "2026-02-21",
    status: "Confirmed",
    totalAmount: 850000,
    balanceDue: 850000,
    items: ["Maha Prasad", "56 Bhog Selection"],
    venue: "The Leela Palace, Udaipur",
    headcount: 2000
  },
  {
    id: "ORD-HT-004",
    customerName: "Amit Goenka Office Puja",
    eventDate: "2026-02-25",
    status: "Draft",
    totalAmount: 15000,
    balanceDue: 15000,
    items: ["Satvik Snacks", "Masala Tea"],
    venue: "Goenka Group HQ, Nariman Point",
    headcount: 30
  }
];

export const mockMenu: MenuItem[] = [
  { id: "V-001", name: "Paneer Butter Masala (No Onion Garlic)", category: "Main Course", price: 350, isVeg: true },
  { id: "V-002", name: "Satvik Mixed Veg Handi", category: "Main Course", price: 280, isVeg: true },
  { id: "V-003", name: "Dal Maharani (Slow Cooked)", category: "Main Course", price: 250, isVeg: true },
  { id: "V-004", name: "Butter Naan (Whole Wheat, Eggless)", category: "Breads", price: 60, isVeg: true },
  { id: "V-005", name: "Saffron Vegetable Pulao", category: "Rice", price: 220, isVeg: true },
  { id: "V-006", name: "Rabri with Malpua", category: "Desserts", price: 180, isVeg: true },
  { id: "V-007", name: "Kheer Prasad (Rich Rice Pudding)", category: "Desserts", price: 100, isVeg: true },
  { id: "V-008", name: "Crispy Bhindi Jaipuri", category: "Sides", price: 180, isVeg: true },
  { id: "V-009", name: "Aloo Gobhi Adraki", category: "Main Course", price: 240, isVeg: true },
  { id: "V-010", name: "Moong Dal Halwa (Desi Ghee)", category: "Desserts", price: 150, isVeg: true },
];

export const mockCustomers: Customer[] = [
  { id: "C-001", name: "Rajesh Malhotra", email: "rajesh@malhotra.in", phone: "+91 98200 12345", gstNumber: "27AAATI1234A1Z1", totalOrders: 12, outstandingBalance: 50000 },
  { id: "C-002", name: "Priya Sharma", email: "priya.s@gmail.com", phone: "+91 98765 54321", totalOrders: 2, outstandingBalance: 0 },
  { id: "C-003", name: "Amit Goenka", email: "amit@goenkagroup.com", phone: "+91 22 2426 0321", company: "Goenka Group", totalOrders: 45, outstandingBalance: 12000 },
];

export const mockFeedback: Feedback[] = [
  { id: "FB-001", orderId: "ORD-HT-001", customerName: "Rajesh Malhotra", rating: 5, comment: "Excellent food, the Kheer was divine!", date: "2024-10-26", tags: ["Quality", "Service"] },
  { id: "FB-002", orderId: "ORD-HT-002", customerName: "Priya Sharma", rating: 4, comment: "Very good service, timely delivery.", date: "2026-02-21", tags: ["Punctuality"] },
];

export const mockStats = [
  { title: "Today's Orders", value: "1", change: "Fulfilling now", icon: "Clock" },
  { title: "Tomorrow's Orders", value: "1", change: "Prep started", icon: "Calendar" },
  { title: "Next Week's Orders", value: "1", change: "3 tentative", icon: "Calendar" },
  { title: "Total Revenue", value: "₹4.85L", change: "+12% vs last month", icon: "IndianRupee" },
];
