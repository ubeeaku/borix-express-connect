import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Loader2, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Route {
  id: string;
  origin: string;
  destination: string;
  price: number;
}

interface TripInfo {
  routeId: string;
  route: Route;
  date: string;
  time: string;
  bookedSeats: number;
  totalSeats: number;
}

const DEPARTURE_TIMES = ["7:00 AM", "1:00 PM"];
const TOTAL_SEATS = 25; // 5 cars × 5 seats

const AdminTrips = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [trips, setTrips] = useState<TripInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      const { data } = await supabase.from("routes").select("*");
      if (data) setRoutes(data);
    };
    fetchRoutes();
  }, []);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!selectedDate || routes.length === 0) return;
      
      setIsLoading(true);
      const tripData: TripInfo[] = [];

      for (const route of routes) {
        for (const time of DEPARTURE_TIMES) {
          const { count } = await supabase
            .from("booked_seats")
            .select("*", { count: "exact", head: true })
            .eq("route_id", route.id)
            .eq("travel_date", selectedDate)
            .eq("departure_time", time);

          tripData.push({
            routeId: route.id,
            route,
            date: selectedDate,
            time,
            bookedSeats: count || 0,
            totalSeats: TOTAL_SEATS,
          });
        }
      }

      setTrips(tripData);
      setIsLoading(false);
    };

    fetchTrips();
  }, [selectedDate, routes]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="Trips" subtitle="View scheduled trips and seat availability">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <div className="flex items-center gap-4">
            <Label>Select Date:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Car className="w-4 h-4" />
            <span>5 Cars × 5 Seats = 25 Total Seats per Trip</span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {trips.map((trip, index) => (
              <motion.div
                key={`${trip.routeId}-${trip.time}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-accent" />
                        {trip.route.origin} → {trip.route.destination}
                      </CardTitle>
                      <Badge
                        variant={trip.bookedSeats >= trip.totalSeats ? "destructive" : "secondary"}
                      >
                        {trip.bookedSeats >= trip.totalSeats ? "Full" : "Available"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(trip.date), "PPP")}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{trip.time}</span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Seats Booked</span>
                        <span className="font-medium">
                          {trip.bookedSeats} / {trip.totalSeats}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full transition-all"
                          style={{ width: `${(trip.bookedSeats / trip.totalSeats) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-lg font-bold text-accent">
                        ₦{trip.route.price.toLocaleString()}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/admin/manifest?route=${trip.routeId}&date=${trip.date}&time=${encodeURIComponent(trip.time)}`, "_blank")}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Manifest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminTrips;
