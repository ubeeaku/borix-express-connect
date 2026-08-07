import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bus,
  LayoutDashboard,
  MapPin,
  Calendar,
  Truck,
  Users,
  CreditCard,
  Ticket,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const sidebarItems = [
  { name: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { name: "Routes", icon: MapPin, path: "/admin/routes" },
  { name: "Trips", icon: Calendar, path: "/admin/trips" },
  { name: "Vehicles", icon: Truck, path: "/admin/vehicles" },
  { name: "Drivers", icon: Users, path: "/admin/drivers" },
  { name: "Applications", icon: ClipboardList, path: "/admin/driver-applications" },
  { name: "Bookings", icon: Ticket, path: "/admin/bookings" },
  { name: "Trip Manifest", icon: ClipboardList, path: "/admin/manifest" },
  { name: "Payments", icon: CreditCard, path: "/admin/payments" },
  { name: "Settings", icon: Settings, path: "/admin/settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AdminLayout = ({ children, title, subtitle }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAdminAuth();

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <Bus className="w-6 h-6 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold text-white">
                Borix<span className="text-accent">Express</span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  location.pathname === item.path
                    ? "bg-accent text-accent-foreground"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-white/10">
            <Button
              variant="ghost"
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10"
              onClick={signOut}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-muted"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-lg hover:bg-muted">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              </button>
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold">
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
