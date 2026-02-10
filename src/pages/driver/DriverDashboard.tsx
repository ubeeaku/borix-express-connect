import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Car, MapPin, DollarSign, Calendar, Bell, Phone, LogOut, Clock,
  CheckCircle, XCircle, TrendingUp, Loader2, Menu, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import borixLogo from "@/assets/borix-logo-new.png";

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  status: string;
};

type Trip = {
  id: string;
  trip_date: string;
  departure_time: string;
  status: string;
  earnings: number;
  route: { origin: string; destination: string } | null;
};

type Earning = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  paid: boolean;
  created_at: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
};

const DriverDashboard = () => {
  const navigate = useNavigate();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trips");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkDriverAuth();
  }, []);

  const checkDriverAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      navigate("/driver/login");
      return;
    }

    // Check driver role
    const { data: hasRole } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'driver',
    });

    if (!hasRole) {
      navigate("/driver/login");
      return;
    }

    // Fetch driver record
    const { data: driverData } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!driverData || driverData.status !== 'active') {
      toast({ title: "Account not active", variant: "destructive" });
      navigate("/driver/login");
      return;
    }

    setDriver(driverData as Driver);
    await fetchData(driverData.id);
    setLoading(false);
  };

  const fetchData = async (driverId: string) => {
    const [tripsRes, earningsRes, notifRes] = await Promise.all([
      supabase
        .from('driver_trips')
        .select('*, route:routes(origin, destination)')
        .eq('driver_id', driverId)
        .order('trip_date', { ascending: false })
        .limit(20),
      supabase
        .from('driver_earnings')
        .select('*')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('driver_notifications')
        .select('*')
        .or(`driver_id.eq.${driverId},driver_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (tripsRes.data) setTrips(tripsRes.data as any);
    if (earningsRes.data) setEarnings(earningsRes.data as Earning[]);
    if (notifRes.data) setNotifications(notifRes.data as Notification[]);
  };

  const handleTripAction = async (tripId: string, action: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('driver_trips')
      .update({
        status: action,
        ...(action === 'accepted' ? { accepted_at: new Date().toISOString() } : {}),
      })
      .eq('id', tripId);

    if (error) {
      toast({ title: "Failed to update trip", variant: "destructive" });
    } else {
      toast({ title: `Trip ${action}` });
      if (driver) fetchData(driver.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/driver/login");
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('driver_notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
  const pendingPay = earnings.filter(e => !e.paid).reduce((s, e) => s + e.amount, 0);
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const tabs = [
    { id: "trips", label: "My Trips", icon: MapPin },
    { id: "earnings", label: "Earnings", icon: DollarSign },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifs },
  ];

  return (
    <div className="min-h-screen bg-muted flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-white/10">
            <Link to="/" className="flex items-center">
              <img src={borixLogo} alt="Borix Express" className="h-12 w-auto" />
            </Link>
          </div>
          <div className="p-4 border-b border-white/10">
            <p className="text-white font-bold">{driver?.full_name}</p>
            <p className="text-white/60 text-sm">{driver?.phone}</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  activeTab === tab.id
                    ? "bg-accent text-accent-foreground"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {tab.badge ? (
                  <span className="ml-auto bg-accent text-accent-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
            <a href="tel:+2349036573414" className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors">
              <Phone className="w-5 h-5" />
              <span className="font-medium">Contact Support</span>
            </a>
          </nav>
          <div className="p-4 border-t border-white/10">
            <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10" onClick={handleSignOut}>
              <LogOut className="w-5 h-5 mr-3" /> Logout
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64">
        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <h1 className="text-xl font-bold text-foreground">Driver Dashboard</h1>
            </div>
          </div>
        </header>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Completed Trips", value: completedTrips, icon: CheckCircle },
              { label: "Total Earnings", value: `₦${totalEarnings.toLocaleString()}`, icon: TrendingUp },
              { label: "Pending Pay", value: `₦${pendingPay.toLocaleString()}`, icon: DollarSign },
              { label: "Assigned Trips", value: trips.filter(t => t.status === 'assigned').length, icon: Calendar },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card rounded-2xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "trips" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Your Trips</h2>
              {trips.length === 0 ? (
                <div className="bg-card rounded-xl p-10 text-center text-muted-foreground">No trips assigned yet.</div>
              ) : (
                trips.map((trip) => (
                  <motion.div key={trip.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-xl p-5 border border-border">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-foreground">
                          {trip.route ? `${trip.route.origin} → ${trip.route.destination}` : "Route N/A"}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {trip.trip_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {trip.departure_time}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={
                          trip.status === 'completed' ? "bg-green-100 text-green-700" :
                          trip.status === 'accepted' ? "bg-blue-100 text-blue-700" :
                          trip.status === 'declined' ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }>
                          {trip.status}
                        </Badge>
                        {trip.status === 'assigned' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleTripAction(trip.id, 'accepted')} className="bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle className="w-4 h-4 mr-1" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleTripAction(trip.id, 'declined')}>
                              <XCircle className="w-4 h-4 mr-1" /> Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    {trip.earnings > 0 && (
                      <p className="text-sm text-accent font-semibold mt-2">Earnings: ₦{trip.earnings.toLocaleString()}</p>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          )}

          {activeTab === "earnings" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Payment History</h2>
              {earnings.length === 0 ? (
                <div className="bg-card rounded-xl p-10 text-center text-muted-foreground">No earnings recorded yet.</div>
              ) : (
                earnings.map((earning) => (
                  <div key={earning.id} className="bg-card rounded-xl p-5 border border-border flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">₦{earning.amount.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{earning.description || earning.type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(earning.created_at).toLocaleDateString()}</p>
                    </div>
                    <Badge className={earning.paid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                      {earning.paid ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Notifications</h2>
              {notifications.length === 0 ? (
                <div className="bg-card rounded-xl p-10 text-center text-muted-foreground">No notifications.</div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`bg-card rounded-xl p-5 border cursor-pointer transition-colors ${notif.read ? "border-border" : "border-accent bg-accent/5"}`}
                    onClick={() => !notif.read && markNotificationRead(notif.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{notif.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                      </div>
                      {!notif.read && <span className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;
