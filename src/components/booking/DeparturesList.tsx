import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DepartureCard, type DepartureInfo } from "./DepartureCard";

interface DeparturesListProps {
  origin: string;
  destination: string;
  date: string;
  onSelect: (departure: DepartureInfo) => void;
}

interface PublicDepartureRow {
  id: string;
  route_id: string;
  origin: string;
  destination: string;
  travel_date: string;
  departure_time: string;
  price: number;
  commission_amount: number;
  total_seats: number;
  status: string;

  driver_id: string | null;
  driver_name: string | null;
  driver_rating: number | null;
  driver_total_trips: number | null;
  driver_profile_photo_url: string | null;

  vehicle_id: string | null;
  vehicle_type: string | null;
  plate_number: string | null;
  vehicle_capacity: number | null;
  vehicle_year: number | null;
  vehicle_color: string | null;

  park_id: string | null;
  park_name: string | null;
  park_city: string | null;
  park_address: string | null;
}

export const DeparturesList = ({
  origin,
  destination,
  date,
  onSelect,
}: DeparturesListProps) => {
  const [departures, setDepartures] = useState<DepartureInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartures = async () => {
      setLoading(true);

      try {
        // Fetch public departure information.
        // This view safely exposes driver information without
        // allowing public users to read the private drivers table.
        // Use an any-cast because `public_departures` is a view not present
        // in the generated DB types used by the Supabase client.
        const { data, error } = await (supabase as any).from("public_departures")
          .select("*")
          .eq("origin", origin)
          .eq("destination", destination)
          .eq("travel_date", date)
          .in("status", ["scheduled", "boarding"])
          .order("departure_time");

        if (error) {
          console.error(
            "Failed to fetch public departures:",
            error
          );

          setDepartures([]);
          return;
        }

        if (!data || data.length === 0) {
          setDepartures([]);
          return;
        }

        const rows = data as unknown as PublicDepartureRow[];

        // Get booked seat counts.
        const departureIds = rows.map(
          (departure) => departure.id
        );

        let counts: Record<string, number> = {};

        if (departureIds.length > 0) {
          const { data: seatRows, error: seatError } =
            await supabase
              .from("booked_seats")
              .select("departure_id")
              .in("departure_id", departureIds);

          if (seatError) {
            console.error(
              "Failed to fetch booked seats:",
              seatError
            );
          }

          (seatRows ?? []).forEach((row) => {
            if (row.departure_id) {
              counts[row.departure_id] =
                (counts[row.departure_id] ?? 0) + 1;
            }
          });
        }

        // Convert public_departures rows into DepartureInfo
        // objects expected by DepartureCard.
        const formattedDepartures: DepartureInfo[] =
          rows.map((departure) => ({
            id: departure.id,
            travel_date: departure.travel_date,
            departure_time: departure.departure_time,
            price: Number(departure.price),
            total_seats: Number(departure.total_seats),
            status: departure.status,

            driver: departure.driver_id
              ? {
                  id: departure.driver_id,
                  full_name:
                    departure.driver_name ?? "Driver",
                  rating:
                    Number(departure.driver_rating ?? 0),
                  total_trips:
                    Number(
                      departure.driver_total_trips ?? 0
                    ),
                  profile_photo_url:
                    departure.driver_profile_photo_url,
                }
              : null,

            vehicle: departure.vehicle_id
              ? {
                  id: departure.vehicle_id,
                  vehicle_type:
                    departure.vehicle_type ?? "Vehicle",
                  plate_number:
                    departure.plate_number ?? "",
                  capacity:
                    Number(
                      departure.vehicle_capacity ??
                        departure.total_seats
                    ),
                }
              : null,

            park: departure.park_id
              ? {
                  id: departure.park_id,
                  name: departure.park_name ?? "Park",
                  city: departure.park_city ?? "",
                }
              : null,

            seatsBooked:
              counts[departure.id] ?? 0,
          }));

        setDepartures(formattedDepartures);
      } catch (error) {
        console.error(
          "Unexpected error loading departures:",
          error
        );

        setDepartures([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartures();
  }, [origin, destination, date]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (departures.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground font-medium">
          No departures available
        </p>

        <p className="text-muted-foreground text-sm mt-1">
          Try another date or route.
        </p>
      </div>
    );
  }

  // Group departures by park.
  const grouped: Record<
    string,
    {
      parkName: string;
      items: DepartureInfo[];
    }
  > = {};

  departures.forEach((departure) => {
    const key = departure.park?.id ?? "unknown";

    if (!grouped[key]) {
      grouped[key] = {
        parkName: departure.park?.name ?? "Other",
        items: [],
      };
    }

    grouped[key].items.push(departure);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(
        ([parkId, group]) => (
          <div key={parkId}>
            <h3 className="font-bold text-foreground text-lg mb-3 flex items-center gap-2">
              <span className="w-1 h-5 bg-accent rounded-full" />

              {group.parkName}
            </h3>

            <div className="space-y-3">
              {group.items.map((departure) => (
                <DepartureCard
                  key={departure.id}
                  departure={departure}
                  onSelect={() => onSelect(departure)}
                />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};