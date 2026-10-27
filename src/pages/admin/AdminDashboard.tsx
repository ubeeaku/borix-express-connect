import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
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
  Loader2,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import borixLogo from "@/assets/borix-logo-white.png";

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

const dashboardShortcuts = [
  { name: "Manage trips", description: "Create departures and assign drivers.", path: "/admin/trips", icon: Calendar },
  { name: "View bookings", description: "Review passenger bookings and changes.", path: "/admin/bookings", icon: Ticket },
  { name: "Manage drivers", description: "Review driver accounts and applications.", path: "/admin/drivers", icon: Users },
  { name: "Review payments", description: "Open payment and refund records.", path: "/admin/payments", icon: CreditCard },
];

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, isLoading, signOut } = useAdminAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or not admin, the hook will redirect to login
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link to="/" className="flex items-center">
              <img src={borixLogo} alt="Borix Express" className="h-12 w-auto" />
            </Link>
          </div>

          {/* Nav Items */}
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

          {/* Logout */}
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

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        {/* Top Bar */}
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
                <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold">
                  {user.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground mb-2">Operations</h2>
            <p className="text-muted-foreground">Open the relevant section to see current records.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {dashboardShortcuts.map((shortcut, index) => (
              <motion.div
                key={shortcut.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <Link to={shortcut.path} className="flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:border-accent/50 hover:shadow-md">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                    <shortcut.icon className="h-6 w-6 text-accent" />
                  </span>
                  <span>
                    <span className="block font-bold text-foreground">{shortcut.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{shortcut.description}</span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
