import { Star, Clock, MapPin, Users, Car } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DepartureInfo {
  id: string;
  travel_date: string;
  departure_time: string;
  price: number;
  total_seats: number;
  status: string;
  driver: { id: string; full_name: string; rating: number; total_trips: number; profile_photo_url: string | null } | null;
  vehicle: { id: string; vehicle_type: string; plate_number: string; capacity: number } | null;
  park: { id: string; name: string; city: string } | null;
  seatsBooked: number;
}

interface DepartureCardProps {
  departure: DepartureInfo;
  onSelect: () => void;
}

export const DepartureCard = ({ departure, onSelect }: DepartureCardProps) => {
  const seatsLeft = (departure.vehicle?.capacity ?? departure.total_seats) - departure.seatsBooked;
  const driver = departure.driver;
  const initials = driver?.full_name?.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  const soldOut = seatsLeft <= 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-accent transition-all">
      <div className="flex items-start gap-4">
        {/* Driver avatar */}
        <div className="shrink-0">
          {driver?.profile_photo_url ? (
            <img src={driver.profile_photo_url} alt={driver.full_name} className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <h4 className="font-semibold text-foreground">{driver?.full_name ?? 'Driver'}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  {driver?.rating?.toFixed(1) ?? '—'}
                </span>
                <span>{driver?.total_trips ?? 0} trips</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-accent text-lg">₦{departure.price.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">per seat</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Car className="w-3.5 h-3.5" /> <span className="capitalize">{departure.vehicle?.vehicle_type ?? 'Vehicle'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" /> {departure.departure_time}
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
              <MapPin className="w-3.5 h-3.5" /> {departure.park?.name ?? 'Park'}
            </div>
            <div className={`flex items-center gap-1.5 col-span-2 ${soldOut ? 'text-destructive' : 'text-foreground'}`}>
              <Users className="w-3.5 h-3.5" />
              {soldOut ? 'Sold out' : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`}
            </div>
          </div>

          <Button variant="accent" className="w-full mt-4" onClick={onSelect} disabled={soldOut}>
            {soldOut ? 'Sold out' : 'Select departure'}
          </Button>
        </div>
      </div>
    </div>
  );
};
