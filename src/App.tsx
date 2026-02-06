import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import RoutesPage from "./pages/Routes";
import Booking from "./pages/Booking";
import Contact from "./pages/Contact";
import Confirmation from "./pages/Confirmation";
import Wallet from "./pages/Wallet";
import Auth from "./pages/Auth";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminBookings from "./pages/admin/AdminBookings";
import AdminManifest from "./pages/admin/AdminManifest";
import AdminRoutes from "./pages/admin/AdminRoutes";
import AdminTrips from "./pages/admin/AdminTrips";
import AdminVehicles from "./pages/admin/AdminVehicles";
import AdminDrivers from "./pages/admin/AdminDrivers";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSettings from "./pages/admin/AdminSettings";
import ProtectedAdminRoute from "./components/auth/ProtectedAdminRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/confirmation" element={<Confirmation />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
          <Route path="/admin/routes" element={<ProtectedAdminRoute><AdminRoutes /></ProtectedAdminRoute>} />
          <Route path="/admin/trips" element={<ProtectedAdminRoute><AdminTrips /></ProtectedAdminRoute>} />
          <Route path="/admin/vehicles" element={<ProtectedAdminRoute><AdminVehicles /></ProtectedAdminRoute>} />
          <Route path="/admin/drivers" element={<ProtectedAdminRoute><AdminDrivers /></ProtectedAdminRoute>} />
          <Route path="/admin/bookings" element={<ProtectedAdminRoute><AdminBookings /></ProtectedAdminRoute>} />
          <Route path="/admin/manifest" element={<ProtectedAdminRoute><AdminManifest /></ProtectedAdminRoute>} />
          <Route path="/admin/payments" element={<ProtectedAdminRoute><AdminPayments /></ProtectedAdminRoute>} />
          <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettings /></ProtectedAdminRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;