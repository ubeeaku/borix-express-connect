import { useState, useEffect } from "react";
import { User, Check, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SeatPickerProps {
  routeId: string;
  date: string;
  time: string;
  passengers: number;
  selectedSeats: number[];
  onSeatsChange: (seats: number[]) => void;
}

// 5 cars available, each with 5 passenger seats
const TOTAL_CARS = 5;
const SEATS_PER_CAR = 7;

// Seat layout per car: 1 front (beside driver), 3 middle, 3 back
const getCarLayout = (carIndex: number) => {
  const baseNumber = carIndex * SEATS_PER_CAR;
  return [
    { row: 1, label: "Front", seats: [{ number: baseNumber + 1, label: "A1" }] },
    { row: 2, label: "Middle", seats: [{ number: baseNumber + 2, label: "B1" }, { number: baseNumber + 3, label: "B2" }, { number: baseNumber + 4, label: "B3" }] },
    { row: 3, label: "Back", seats: [{ number: baseNumber + 5, label: "C1" }, { number: baseNumber + 6, label: "C2" }, { number: baseNumber + 7, label: "C3" }] },
  ];
};

// Get all seats for display in selected seats summary
const getAllSeats = () => {
  const seats: { number: number; label: string; carIndex: number }[] = [];
  for (let i = 0; i < TOTAL_CARS; i++) {
    const layout = getCarLayout(i);
    layout.forEach(row => {
      row.seats.forEach(seat => {
        seats.push({ ...seat, carIndex: i });
      });
    });
  }
  return seats;
};

export const SeatPicker = ({
  routeId,
  date,
  time,
  passengers,
  selectedSeats,
  onSeatsChange,
}: SeatPickerProps) => {
  const [bookedSeats, setBookedSeats] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBookedSeats = async () => {
      if (!routeId || !date || !time) {
        setBookedSeats([]);
        return;
      }

      setIsLoading(true);
      try {
        // Use the secure view that hides booking_id from public access
        const { data, error } = await supabase
          .from("available_seats_view")
          .select("seat_number")
          .eq("route_id", routeId)
          .eq("travel_date", date)
          .eq("departure_time", time);

        if (error) throw error;
        setBookedSeats(data?.map((s) => s.seat_number) || []);
      } catch (err) {
        console.error("Error fetching booked seats:", err);
        setBookedSeats([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedSeats();
  }, [routeId, date, time]);

  const handleSeatClick = (seatNumber: number) => {
    if (bookedSeats.includes(seatNumber)) return;

    if (selectedSeats.includes(seatNumber)) {
      onSeatsChange(selectedSeats.filter((s) => s !== seatNumber));
    } else if (selectedSeats.length < passengers) {
      onSeatsChange([...selectedSeats, seatNumber]);
    } else {
      // Replace the first selected seat if at max capacity
      onSeatsChange([...selectedSeats.slice(1), seatNumber]);
    }
  };

  const getSeatStatus = (seatNumber: number) => {
    if (bookedSeats.includes(seatNumber)) return "booked";
    if (selectedSeats.includes(seatNumber)) return "selected";
    return "available";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Select Your Seats</h3>
        <span className="text-sm text-muted-foreground">
          {selectedSeats.length} of {passengers} selected
        </span>
      </div>

      {/* Cars grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: TOTAL_CARS }, (_, carIndex) => (
          <CarVisualization
            key={carIndex}
            carIndex={carIndex}
            layout={getCarLayout(carIndex)}
            bookedSeats={bookedSeats}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
            isLoading={isLoading}
            getSeatStatus={getSeatStatus}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-card border-2 border-border" />
          <span className="text-muted-foreground">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent" />
          <span className="text-muted-foreground">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-muted-foreground/40" />
          <span className="text-muted-foreground">Booked</span>
        </div>
      </div>

      {/* Selected seats display */}
      {selectedSeats.length > 0 && (
        <div className="bg-accent/10 rounded-xl p-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">Selected seats:</span>{" "}
            {selectedSeats
              .sort((a, b) => a - b)
              .map((s) => {
                const allSeats = getAllSeats();
                const seat = allSeats.find((st) => st.number === s);
                if (!seat) return `Seat ${s}`;
                return `Car ${seat.carIndex + 1} - ${seat.label}`;
              })
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
};

interface CarVisualizationProps {
  carIndex: number;
  layout: { row: number; label: string; seats: { number: number; label: string }[] }[];
  bookedSeats: number[];
  selectedSeats: number[];
  onSeatClick: (seatNumber: number) => void;
  isLoading: boolean;
  getSeatStatus: (seatNumber: number) => "available" | "selected" | "booked";
}

const CarVisualization = ({
  carIndex,
  layout,
  onSeatClick,
  isLoading,
  getSeatStatus,
}: CarVisualizationProps) => {
  const availableCount = layout
    .flatMap((r) => r.seats)
    .filter((s) => getSeatStatus(s.number) === "available").length;

  return (
    <div className="bg-muted rounded-2xl p-4">
      {/* Car header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Car {carIndex + 1}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {availableCount} available
        </span>
      </div>

      {/* Car body */}
      <div className="relative mx-auto max-w-[140px]">
        {/* Driver area + Front seat */}
        <div className="flex justify-between items-center mb-2 px-2">
          <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground">Driver</span>
          </div>
          {layout[0].seats.map((seat) => (
            <SeatButton
              key={seat.number}
              seat={seat}
              status={getSeatStatus(seat.number)}
              onClick={() => onSeatClick(seat.number)}
              disabled={isLoading}
              compact
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-2 border-t border-dashed border-border" />

        {/* Middle row - 2 seats */}
        <div className="flex justify-center gap-2 my-2">
          {layout[1].seats.map((seat) => (
            <SeatButton
              key={seat.number}
              seat={seat}
              status={getSeatStatus(seat.number)}
              onClick={() => onSeatClick(seat.number)}
              disabled={isLoading}
              compact
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-2 border-t border-dashed border-border" />

        {/* Back row - 2 seats */}
        <div className="flex justify-center gap-2 mt-2">
          {layout[2].seats.map((seat) => (
            <SeatButton
              key={seat.number}
              seat={seat}
              status={getSeatStatus(seat.number)}
              onClick={() => onSeatClick(seat.number)}
              disabled={isLoading}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface SeatButtonProps {
  seat: { number: number; label: string };
  status: "available" | "selected" | "booked";
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}

const SeatButton = ({ seat, status, onClick, disabled, compact }: SeatButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === "booked"}
      className={cn(
        "rounded-xl flex flex-col items-center justify-center transition-all",
        "border-2 font-medium",
        compact ? "w-10 h-10 text-[10px]" : "w-14 h-14 text-sm",
        status === "available" &&
          "bg-card border-border hover:border-accent hover:bg-accent/10 cursor-pointer",
        status === "selected" &&
          "bg-accent border-accent text-accent-foreground cursor-pointer",
        status === "booked" &&
          "bg-muted-foreground/40 border-transparent cursor-not-allowed opacity-60"
      )}
    >
      {status === "selected" ? (
        <Check className={cn(compact ? "w-3 h-3" : "w-5 h-5")} />
      ) : (
        <User className={cn(compact ? "w-3 h-3" : "w-4 h-4", "opacity-50")} />
      )}
      <span className={cn("mt-0.5", compact ? "text-[8px]" : "text-xs")}>{seat.label}</span>
    </button>
  );
};
