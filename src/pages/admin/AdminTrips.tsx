import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  Loader2,
  Users,
  Car,
  UserRound,
  RefreshCw,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

type Route = {
  id: string;
  origin: string;
  destination: string;
  price: number;
};

type Park = {
  id: string;
  name: string;
  city: string;
  status: string;
};

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  park_id: string | null;
  status: string;
};

type Vehicle = {
  id: string;
  driver_id: string;
  vehicle_type: string;
  plate_number: string;
  capacity: number;
  status: string;
};

type Departure = {
  id: string;
  travel_date: string;
  departure_time: string;
  total_seats: number;
  price: number;
  commission_amount: number;
  status: string;

  route: Route | null;
  park: Park | null;
  driver: Driver | null;
  vehicle: Vehicle | null;

  bookedSeats: number;
};

const AdminTrips = () => {
  const { isAdmin, isLoading: authLoading } = useAdminAuth();

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [parks, setParks] = useState<Park[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    route_id: "",
    park_id: "",
    driver_id: "",
    vehicle_id: "",
    travel_date: format(new Date(), "yyyy-MM-dd"),
    departure_time: "",
    price: "",
    commission_amount: "2000",
  });

  const fetchBaseData = async () => {
    const [routesResult, parksResult, driversResult, vehiclesResult] =
      await Promise.all([
        supabase
          .from("routes")
          .select("id, origin, destination, price")
          .order("origin"),

        supabase
          .from("parks")
          .select("id, name, city, status")
          .order("name"),

        supabase
          .from("drivers")
          .select("id, full_name, phone, park_id, status")
          .order("full_name"),

        supabase
          .from("vehicles")
          .select(
            "id, driver_id, vehicle_type, plate_number, capacity, status"
          )
          .order("plate_number"),
      ]);

    if (routesResult.error) {
      console.error(routesResult.error);
      toast({
        title: "Failed to load routes",
        description: routesResult.error.message,
        variant: "destructive",
      });
    } else {
      setRoutes((routesResult.data ?? []) as Route[]);
    }

    if (parksResult.error) {
      console.error(parksResult.error);
      toast({
        title: "Failed to load parks",
        description: parksResult.error.message,
        variant: "destructive",
      });
    } else {
      setParks((parksResult.data ?? []) as Park[]);
    }

    if (driversResult.error) {
      console.error(driversResult.error);
      toast({
        title: "Failed to load drivers",
        description: driversResult.error.message,
        variant: "destructive",
      });
    } else {
      setDrivers((driversResult.data ?? []) as Driver[]);
    }

    if (vehiclesResult.error) {
      console.error(vehiclesResult.error);
      toast({
        title: "Failed to load vehicles",
        description: vehiclesResult.error.message,
        variant: "destructive",
      });
    } else {
      setVehicles((vehiclesResult.data ?? []) as Vehicle[]);
    }
  };

  const fetchDepartures = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("departures")
        .select(`
          id,
          travel_date,
          departure_time,
          total_seats,
          price,
          commission_amount,
          status,
          routes (
            id,
            origin,
            destination,
            price
          ),
          parks (
            id,
            name,
            city,
            status
          ),
          drivers (
            id,
            full_name,
            phone,
            park_id,
            status
          ),
          vehicles (
            id,
            driver_id,
            vehicle_type,
            plate_number,
            capacity,
            status
          )
        `)
        .eq("travel_date", selectedDate)
        .order("departure_time", { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as any[];

      if (rows.length === 0) {
        setDepartures([]);
        return;
      }

      const departureIds = rows.map((row) => row.id);

      const { data: seatRows, error: seatError } = await supabase
        .from("booked_seats")
        .select("departure_id, seat_number")
        .in("departure_id", departureIds);

      if (seatError) {
        console.error("Failed to load booked seats:", seatError);
      }

      const counts: Record<string, number> = {};

      (seatRows ?? []).forEach((seat) => {
        if (seat.departure_id) {
          counts[seat.departure_id] =
            (counts[seat.departure_id] ?? 0) + 1;
        }
      });

      setDepartures(
        rows.map((row) => ({
          id: row.id,
          travel_date: row.travel_date,
          departure_time: row.departure_time,
          total_seats: Number(row.total_seats),
          price: Number(row.price),
          commission_amount: Number(row.commission_amount ?? 0),
          status: row.status,
          route: row.routes ?? null,
          park: row.parks ?? null,
          driver: row.drivers ?? null,
          vehicle: row.vehicles
            ? {
                ...row.vehicles,
                capacity: Number(row.vehicles.capacity),
              }
            : null,
          bookedSeats: counts[row.id] ?? 0,
        }))
      );
    } catch (error) {
      console.error("Failed to load departures:", error);

      toast({
        title: "Failed to load trips",
        description:
          error instanceof Error ? error.message : "Unable to load departures.",
        variant: "destructive",
      });

      setDepartures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    fetchBaseData();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    fetchDepartures();
  }, [isAdmin, selectedDate]);

  const activeDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === "active"),
    [drivers]
  );

  const activeParks = useMemo(
    () => parks.filter((park) => park.status === "active"),
    [parks]
  );

  const availableDrivers = useMemo(() => {
    if (!form.park_id) return activeDrivers;

    return activeDrivers.filter(
      (driver) => driver.park_id === form.park_id
    );
  }, [activeDrivers, form.park_id]);

  const availableVehicles = useMemo(() => {
    if (!form.driver_id) return [];

    return vehicles.filter(
      (vehicle) =>
        vehicle.driver_id === form.driver_id &&
        vehicle.status === "active"
    );
  }, [vehicles, form.driver_id]);

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === form.vehicle_id
  );

  const resetCreateForm = () => {
    setForm({
      route_id: "",
      park_id: "",
      driver_id: "",
      vehicle_id: "",
      travel_date: selectedDate,
      departure_time: "",
      price: "",
      commission_amount: "2000",
    });
  };

  const openCreateDialog = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const handleRouteChange = (routeId: string) => {
    const route = routes.find((item) => item.id === routeId);

    setForm((previous) => ({
      ...previous,
      route_id: routeId,
      price: route ? String(route.price) : "",
    }));
  };

  const handleParkChange = (parkId: string) => {
    setForm((previous) => ({
      ...previous,
      park_id: parkId,
      driver_id: "",
      vehicle_id: "",
    }));
  };

  const handleDriverChange = (driverId: string) => {
    setForm((previous) => ({
      ...previous,
      driver_id: driverId,
      vehicle_id: "",
    }));
  };

  const handleCreateDeparture = async () => {
    if (
      !form.route_id ||
      !form.park_id ||
      !form.driver_id ||
      !form.vehicle_id ||
      !form.travel_date ||
      !form.departure_time ||
      !form.price
    ) {
      toast({
        title: "Complete all required fields",
        description:
          "Route, park, driver, vehicle, date, time and price are required.",
        variant: "destructive",
      });
      return;
    }

    const vehicle = vehicles.find(
      (item) => item.id === form.vehicle_id
    );

    const driver = drivers.find(
      (item) => item.id === form.driver_id
    );

    if (!vehicle || !driver) {
      toast({
        title: "Invalid driver or vehicle",
        variant: "destructive",
      });
      return;
    }

    if (driver.park_id !== form.park_id) {
      toast({
        title: "Park mismatch",
        description:
          "The selected driver is not assigned to the selected operating park.",
        variant: "destructive",
      });
      return;
    }

    const price = Number(form.price);
    const commission = Number(form.commission_amount || 0);

    if (!Number.isFinite(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Enter a valid positive trip price.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isFinite(commission) || commission < 0) {
      toast({
        title: "Invalid commission",
        description: "Enter a valid commission amount.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("departures").insert({
        route_id: form.route_id,
        park_id: form.park_id,
        driver_id: form.driver_id,
        vehicle_id: form.vehicle_id,
        travel_date: form.travel_date,
        departure_time: formatTimeForDisplay(form.departure_time),
        total_seats: vehicle.capacity,
        price,
        commission_amount: commission,
        status: "scheduled",
      });

      if (error) throw error;

      toast({
        title: "Departure created",
        description: "The trip is now available as a real scheduled departure.",
      });

      setCreateOpen(false);
      resetCreateForm();

      await fetchDepartures();
    } catch (error) {
      console.error("Failed to create departure:", error);

      toast({
        title: "Could not create departure",
        description:
          error instanceof Error ? error.message : "Unable to create departure.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const availableTrips = departures.filter(
    (departure) =>
      ["scheduled", "boarding"].includes(departure.status) &&
      departure.bookedSeats < departure.total_seats
  );

  const boardingTrips = departures.filter(
    (departure) =>
      departure.status === "boarding" &&
      departure.bookedSeats < departure.total_seats
  );

  const fullTrips = departures.filter(
    (departure) =>
      departure.bookedSeats >= departure.total_seats
  );

  const completedTrips = departures.filter(
    (departure) => departure.status === "completed"
  );

  const cancelledTrips = departures.filter(
    (departure) => departure.status === "cancelled"
  );

  const getStatusLabel = (departure: Departure) => {
    if (departure.bookedSeats >= departure.total_seats) {
      return "Full";
    }

    switch (departure.status) {
      case "scheduled":
        return "Available";
      case "boarding":
        return "Boarding";
      case "in_transit":
        return "In Transit";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      default:
        return departure.status;
    }
  };

  const getStatusClass = (departure: Departure) => {
    if (departure.bookedSeats >= departure.total_seats) {
      return "bg-red-100 text-red-700 hover:bg-red-100";
    }

    switch (departure.status) {
      case "scheduled":
        return "bg-green-100 text-green-700 hover:bg-green-100";
      case "boarding":
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
      case "in_transit":
        return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "completed":
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
      case "cancelled":
        return "bg-red-100 text-red-700 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-100";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout
      title="Trips"
      subtitle="Create and manage real scheduled departures"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <Label>Select Date</Label>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-52 mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchDepartures}
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${
                  loading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>

            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Create Departure
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {availableTrips.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Boarding</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {boardingTrips.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Full</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {fullTrips.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold mt-1">
                {completedTrips.length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Cancelled</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {cancelledTrips.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Trips */}
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : departures.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />

              <h3 className="text-lg font-semibold">
                No trips scheduled
              </h3>

              <p className="text-sm text-muted-foreground mt-1 mb-5">
                There are no real departures recorded for{" "}
                {format(
                  new Date(`${selectedDate}T00:00:00`),
                  "PPP"
                )}
                .
              </p>

              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Departure
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {departures.map((departure) => {
              const seatsLeft = Math.max(
                departure.total_seats - departure.bookedSeats,
                0
              );

              const percentage =
                departure.total_seats > 0
                  ? Math.min(
                      (departure.bookedSeats /
                        departure.total_seats) *
                        100,
                      100
                    )
                  : 0;

              return (
                <Card key={departure.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-accent" />

                          {departure.route
                            ? `${departure.route.origin} → ${departure.route.destination}`
                            : "Route unavailable"}
                        </div>
                      </CardTitle>

                      <Badge className={getStatusClass(departure)}>
                        {getStatusLabel(departure)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {format(
                          new Date(`${departure.travel_date}T00:00:00`),
                          "PPP"
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {departure.departure_time}
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-accent" />
                        <span className="font-medium">Park:</span>
                        <span>
                          {departure.park
                            ? `${departure.park.name}, ${departure.park.city}`
                            : "Not assigned"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <UserRound className="w-4 h-4 text-accent" />
                        <span className="font-medium">Driver:</span>
                        <span>
                          {departure.driver?.full_name ??
                            "Not assigned"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Car className="w-4 h-4 text-accent" />
                        <span className="font-medium">Vehicle:</span>
                        <span>
                          {departure.vehicle
                            ? `${departure.vehicle.vehicle_type} — ${departure.vehicle.plate_number}`
                            : "Not assigned"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          Seats
                        </span>

                        <span className="font-medium">
                          {departure.bookedSeats} booked /{" "}
                          {departure.total_seats} total
                        </span>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {seatsLeft} seat
                        {seatsLeft === 1 ? "" : "s"} remaining
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="text-lg font-bold text-accent">
                        ₦{departure.price.toLocaleString()}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(
                            `/admin/manifest?departure=${departure.id}`,
                            "_blank"
                          )
                        }
                      >
                        <Users className="w-4 h-4 mr-2" />
                        View Manifest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Departure Dialog */}
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);

            if (!open) {
              resetCreateForm();
            }
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-accent" />
                Create Departure
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5">
              {/* Route */}
              <div>
                <Label>Route *</Label>

                <Select
                  value={form.route_id}
                  onValueChange={handleRouteChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select route" />
                  </SelectTrigger>

                  <SelectContent>
                    {routes.length === 0 ? (
                      <SelectItem value="no-routes" disabled>
                        No routes available
                      </SelectItem>
                    ) : (
                      routes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.origin} → {route.destination}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Park */}
              <div>
                <Label>Operating Park *</Label>

                <Select
                  value={form.park_id}
                  onValueChange={handleParkChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select operating park" />
                  </SelectTrigger>

                  <SelectContent>
                    {activeParks.length === 0 ? (
                      <SelectItem value="no-parks" disabled>
                        No active parks available
                      </SelectItem>
                    ) : (
                      activeParks.map((park) => (
                        <SelectItem key={park.id} value={park.id}>
                          {park.name} — {park.city}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver */}
              <div>
                <Label>Driver *</Label>

                <Select
                  value={form.driver_id}
                  onValueChange={handleDriverChange}
                  disabled={!form.park_id}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue
                      placeholder={
                        form.park_id
                          ? "Select driver"
                          : "Select a park first"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {availableDrivers.length === 0 ? (
                      <SelectItem value="no-drivers" disabled>
                        No active drivers assigned to this park
                      </SelectItem>
                    ) : (
                      availableDrivers.map((driver) => (
                        <SelectItem
                          key={driver.id}
                          value={driver.id}
                        >
                          {driver.full_name} — {driver.phone}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle */}
              <div>
                <Label>Vehicle *</Label>

                <Select
                  value={form.vehicle_id}
                  onValueChange={(value) =>
                    setForm((previous) => ({
                      ...previous,
                      vehicle_id: value,
                    }))
                  }
                  disabled={!form.driver_id}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue
                      placeholder={
                        form.driver_id
                          ? "Select vehicle"
                          : "Select a driver first"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {availableVehicles.length === 0 ? (
                      <SelectItem value="no-vehicles" disabled>
                        No active vehicles for this driver
                      </SelectItem>
                    ) : (
                      availableVehicles.map((vehicle) => (
                        <SelectItem
                          key={vehicle.id}
                          value={vehicle.id}
                        >
                          {vehicle.vehicle_type} —{" "}
                          {vehicle.plate_number} (
                          {vehicle.capacity} seats)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {selectedVehicle && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total seats: {selectedVehicle.capacity}
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <Label>Travel Date *</Label>

                <Input
                  type="date"
                  value={form.travel_date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      travel_date: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Time */}
              <div>
                <Label>Departure Time *</Label>

                <Input
                  type="time"
                  value={form.departure_time}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      departure_time: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Price */}
              <div>
                <Label>Price per seat (₦) *</Label>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.price}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      price: e.target.value,
                    }))
                  }
                  placeholder="15000"
                  className="mt-1"
                />
              </div>

              {/* Commission */}
              <div>
                <Label>Commission per seat (₦)</Label>

                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.commission_amount}
                  onChange={(e) =>
                    setForm((previous) => ({
                      ...previous,
                      commission_amount: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>

              {/* Information */}
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                This will create a real scheduled departure in the
                database. Passengers will only see departures that
                actually exist here.
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>

                <Button
                  onClick={handleCreateDeparture}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Departure
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

function formatTimeForDisplay(time: string) {
  const [hoursString, minutes] = time.split(":");
  const hours = Number(hoursString);

  if (!Number.isFinite(hours)) {
    return time;
  }

  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes} ${suffix}`;
}

export default AdminTrips;

