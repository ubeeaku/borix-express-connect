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

export const DeparturesList = ({ origin, destination, date, onSelect }: DeparturesListProps) => {
  const [departures, setDepartures] = useState<DepartureInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDepartures = async () => {
      setLoading(true);

      // Find route id
      const { data: route } = await supabase
        .from('routes').select('id').eq('origin', origin).eq('destination', destination).maybeSingle();
      if (!route) { setDepartures([]); setLoading(false); return; }

      const { data, error } = await supabase
        .from('departures')
        .select(`
          id, travel_date, departure_time, price, total_seats, status,
          driver:drivers(id, full_name, rating, total_trips, profile_photo_url),
          vehicle:vehicles(id, vehicle_type, plate_number, capacity),
          park:parks(id, name, city)
        `)
        .eq('route_id', route.id)
        .eq('travel_date', date)
        .in('status', ['scheduled', 'boarding'])
        .order('departure_time');

      if (error || !data) { setDepartures([]); setLoading(false); return; }

      // Get booked seat counts
      const ids = data.map(d => d.id);
      const { data: seatRows } = await supabase
        .from('booked_seats').select('departure_id').in('departure_id', ids);
      const counts: Record<string, number> = {};
      (seatRows ?? []).forEach(r => { if (r.departure_id) counts[r.departure_id] = (counts[r.departure_id] ?? 0) + 1; });

      setDepartures(data.map(d => ({ ...d, seatsBooked: counts[d.id] ?? 0 } as DepartureInfo)));
      setLoading(false);
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
        <p className="text-foreground font-medium">No departures available</p>
        <p className="text-muted-foreground text-sm mt-1">Try another date or route.</p>
      </div>
    );
  }

  // Group by park
  const grouped: Record<string, { parkName: string; items: DepartureInfo[] }> = {};
  departures.forEach(d => {
    const key = d.park?.id ?? 'unknown';
    if (!grouped[key]) grouped[key] = { parkName: d.park?.name ?? 'Other', items: [] };
    grouped[key].items.push(d);
  });

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([parkId, group]) => (
        <div key={parkId}>
          <h3 className="font-bold text-foreground text-lg mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-accent rounded-full" />
            {group.parkName}
          </h3>
          <div className="space-y-3">
            {group.items.map(d => (
              <DepartureCard key={d.id} departure={d} onSelect={() => onSelect(d)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
