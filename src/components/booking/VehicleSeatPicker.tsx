import { useState, useEffect } from "react";
import { User, Check, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VehicleSeatPickerProps {
  departureId: string;
  vehicleType: string; // 'sienna' | 'hiace' | 'coaster'
  capacity: number;
  passengers: number;
  selectedSeats: number[];
  onSeatsChange: (seats: number[]) => void;
}

// Layout generators per vehicle type. Each row = array of seat numbers.
const getLayout = (vehicleType: string, capacity: number): { label: string; seats: { number: number; label: string }[] }[] => {
  if (vehicleType === 'sienna') {
    return [
      { label: 'Front', seats: [{ number: 1, label: 'A1' }] },
      { label: 'Middle', seats: [{ number: 2, label: 'B1' }, { number: 3, label: 'B2' }, { number: 4, label: 'B3' }] },
      { label: 'Back', seats: [{ number: 5, label: 'C1' }, { number: 6, label: 'C2' }, { number: 7, label: 'C3' }] },
    ];
  }
  if (vehicleType === 'hiace') {
    // 14: 1 front + 13 in rows of 3-3-3-4
    const rows: any[] = [{ label: 'Front', seats: [{ number: 1, label: 'A1' }] }];
    let n = 2;
    ['B', 'C', 'D'].forEach(row => {
      rows.push({ label: row, seats: [1, 2, 3].map(i => ({ number: n++, label: `${row}${i}` })) });
    });
    rows.push({ label: 'E', seats: [1, 2, 3, 4].map(i => ({ number: n++, label: `E${i}` })) });
    return rows;
  }
  // coaster or fallback: rows of 4
  const rows: any[] = [];
  let n = 1;
  const rowChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  for (let i = 0; n <= capacity; i++) {
    const seats = [];
    for (let j = 1; j <= 4 && n <= capacity; j++) {
      seats.push({ number: n, label: `${rowChars[i]}${j}` });
      n++;
    }
    rows.push({ label: rowChars[i], seats });
  }
  return rows;
};

export const VehicleSeatPicker = ({
  departureId, vehicleType, capacity, passengers, selectedSeats, onSeatsChange,
}: VehicleSeatPickerProps) => {
  const [takenSeats, setTakenSeats] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const layout = getLayout(vehicleType, capacity);

  useEffect(() => {
    if (!departureId) return;
    const fetchTaken = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('departure_taken_seats')
        .select('seat_number')
        .eq('departure_id', departureId);
      setTakenSeats(data?.map(s => s.seat_number) || []);
      setIsLoading(false);
    };
    fetchTaken();
    const interval = setInterval(fetchTaken, 15000);
    return () => clearInterval(interval);
  }, [departureId]);

  const handleSeatClick = (n: number) => {
    if (takenSeats.includes(n)) return;
    if (selectedSeats.includes(n)) {
      onSeatsChange(selectedSeats.filter(s => s !== n));
    } else if (selectedSeats.length < passengers) {
      onSeatsChange([...selectedSeats, n]);
    } else {
      onSeatsChange([...selectedSeats.slice(1), n]);
    }
  };

  const getStatus = (n: number) =>
    takenSeats.includes(n) ? 'booked'
    : selectedSeats.includes(n) ? 'selected' : 'available';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground capitalize">{vehicleType} layout</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          {selectedSeats.length} of {passengers} selected
        </span>
      </div>

      <div className="bg-muted rounded-2xl p-6">
        <div className="mx-auto max-w-xs space-y-3">
          {/* Driver row */}
          <div className="flex justify-between items-center mb-2">
            <div className="w-12 h-12 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Driver</span>
            </div>
            {layout[0]?.seats.map(seat => (
              <SeatBtn key={seat.number} label={seat.label} status={getStatus(seat.number)} onClick={() => handleSeatClick(seat.number)} disabled={isLoading} />
            ))}
          </div>
          {layout.slice(1).map((row, idx) => (
            <div key={idx}>
              <div className="h-px border-t border-dashed border-border mb-2" />
              <div className="flex justify-center gap-2">
                {row.seats.map(seat => (
                  <SeatBtn key={seat.number} label={seat.label} status={getStatus(seat.number)} onClick={() => handleSeatClick(seat.number)} disabled={isLoading} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-card border-2 border-border" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent" />
          <span className="text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-muted-foreground/40" />
          <span className="text-muted-foreground">Booked</span>
        </div>
      </div>
    </div>
  );
};

const SeatBtn = ({ label, status, onClick, disabled }: { label: string; status: string; onClick: () => void; disabled?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || status === 'booked'}
    className={cn(
      "w-11 h-11 rounded-lg flex flex-col items-center justify-center border-2 transition-all font-medium",
      status === 'available' && "bg-card border-border hover:border-accent hover:bg-accent/10 cursor-pointer",
      status === 'selected' && "bg-accent border-accent text-accent-foreground cursor-pointer",
      status === 'booked' && "bg-muted-foreground/40 border-transparent cursor-not-allowed opacity-60",
    )}
  >
    {status === 'selected' ? <Check className="w-3 h-3" /> : <User className="w-3 h-3 opacity-50" />}
    <span className="text-[9px] mt-0.5">{label}</span>
  </button>
);
