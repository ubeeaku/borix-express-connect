import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Users, MapPin, Calendar, Clock, Printer, Download } from "lucide-react";
import { format } from "date-fns";

interface Route {
  id: string;
  origin: string;
  destination: string;
  price: number;
}

interface ManifestPassenger {
  id: string;
  booking_reference: string;
  passenger_name: string;
  passenger_email: string;
  passenger_phone: string;
  payment_status: string;
  seat_number: number;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
}

const DEPARTURE_TIMES = ["6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"];

const AdminManifest = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isLoading: authLoading } = useAdminAuth();
  
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState(searchParams.get("route") || "");
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") || format(new Date(), "yyyy-MM-dd"));
  const [selectedTime, setSelectedTime] = useState(searchParams.get("time") || "");
  const [passengers, setPassengers] = useState<ManifestPassenger[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);

  // Fetch routes on mount
  useEffect(() => {
    const fetchRoutes = async () => {
      const { data } = await supabase.from("routes").select("*");
      if (data) setRoutes(data);
    };
    fetchRoutes();
  }, []);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedRoute) params.set("route", selectedRoute);
    if (selectedDate) params.set("date", selectedDate);
    if (selectedTime) params.set("time", selectedTime);
    navigate(`?${params.toString()}`, { replace: true });
  }, [selectedRoute, selectedDate, selectedTime, navigate]);

  // Fetch manifest when all filters are set
  useEffect(() => {
    const fetchManifest = async () => {
      if (!selectedRoute || !selectedDate || !selectedTime) {
        setPassengers([]);
        return;
      }

      setIsLoading(true);
      try {
        // Get route details
        const { data: routeData } = await supabase
          .from("routes")
          .select("*")
          .eq("id", selectedRoute)
          .maybeSingle();
        
        setRouteDetails(routeData);

        // Get booked seats with booking details
        const { data: seatsData, error } = await supabase
          .from("booked_seats")
          .select(`
            seat_number,
            booking:bookings(
              id,
              booking_reference,
              passenger_name,
              passenger_email,
              passenger_phone,
              payment_status,
              next_of_kin_name,
              next_of_kin_phone
            )
          `)
          .eq("route_id", selectedRoute)
          .eq("travel_date", selectedDate)
          .eq("departure_time", selectedTime)
          .order("seat_number", { ascending: true });

        if (error) throw error;

        // Transform data to flat structure
        const manifestData: ManifestPassenger[] = (seatsData || [])
          .filter(seat => seat.booking)
          .map(seat => ({
            id: seat.booking.id,
            booking_reference: seat.booking.booking_reference,
            passenger_name: seat.booking.passenger_name,
            passenger_email: seat.booking.passenger_email,
            passenger_phone: seat.booking.passenger_phone,
            payment_status: seat.booking.payment_status,
            seat_number: seat.seat_number,
            next_of_kin_name: seat.booking.next_of_kin_name,
            next_of_kin_phone: seat.booking.next_of_kin_phone,
          }));

        setPassengers(manifestData);
      } catch (err) {
        console.error("Error fetching manifest:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();
  }, [selectedRoute, selectedDate, selectedTime]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!passengers.length) return;
    
    const headers = ["Seat", "Name", "Phone", "Email", "Reference", "Status", "Next of Kin", "Next of Kin Phone"];
    const rows = passengers.map(p => [
      p.seat_number,
      p.passenger_name,
      p.passenger_phone,
      p.passenger_email,
      p.booking_reference,
      p.payment_status,
      p.next_of_kin_name || "",
      p.next_of_kin_phone || "",
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manifest-${selectedDate}-${selectedTime.replace(/[:\s]/g, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
      case "reserved":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Trip Manifest</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} disabled={!passengers.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={handlePrint} disabled={!passengers.length}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-lg">Select Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Route</Label>
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.origin} → {route.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Departure Time</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTURE_TIMES.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manifest Header (Visible when printing) */}
        {routeDetails && selectedDate && selectedTime && (
          <Card className="print:shadow-none print:border-2 print:border-black">
            <CardHeader className="print:pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle className="text-xl print:text-2xl">
                    Borix Express - Trip Manifest
                  </CardTitle>
                  <p className="text-muted-foreground print:text-black">
                    Generated on {format(new Date(), "PPP 'at' p")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold">
                    {passengers.filter(p => p.payment_status === "completed").length} / 5 Passengers
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="print:pt-2">
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg print:bg-gray-100">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground print:text-gray-600">Route</p>
                    <p className="font-medium">
                      {routeDetails.origin} → {routeDetails.destination}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground print:text-gray-600">Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedDate), "PPP")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground print:text-gray-600">Departure</p>
                    <p className="font-medium">{selectedTime}</p>
                  </div>
                </div>
              </div>

              {/* Passenger Table */}
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : passengers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Seat</TableHead>
                      <TableHead>Passenger Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Next of Kin</TableHead>
                      <TableHead className="hidden md:table-cell">Reference</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passengers.map((passenger) => (
                      <TableRow key={`${passenger.id}-${passenger.seat_number}`}>
                        <TableCell className="font-bold text-center">
                          <Badge variant="outline" className="text-lg">
                            {passenger.seat_number}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {passenger.passenger_name}
                        </TableCell>
                        <TableCell>{passenger.passenger_phone}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {passenger.passenger_email}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{passenger.next_of_kin_name || "-"}</p>
                            <p className="text-sm text-muted-foreground">{passenger.next_of_kin_phone || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell font-mono text-sm">
                          {passenger.booking_reference}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(passenger.payment_status)}>
                            {passenger.payment_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No passengers booked for this trip</p>
                  <p className="text-sm">Select a different route, date, or time</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {(!selectedRoute || !selectedDate || !selectedTime) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a route, date, and time to view the manifest</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminManifest;
