import { useState, useEffect } from "react";
import { User, Check } from "lucide-react";
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

// 5-seater car layout: 2 front (driver + 1), 3 back
const SEAT_LAYOUT = [
  { row: 1, seats: [{ number: 1, label: "1A" }, { number: 2, label: "1B" }] },
  { row: 2, seats: [{ number: 3, label: "2A" }, { number: 4, label: "2B" }, { number: 5, label: "2C" }] },
];

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
        const { data, error } = await supabase
          .from("booked_seats")
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

      {/* Car visualization */}
      <div className="bg-muted rounded-2xl p-6">
        {/* Car body */}
        <div className="relative mx-auto max-w-xs">
          {/* Front of car indicator */}
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full">
              Front
            </div>
          </div>

          {/* Driver area */}
          <div className="flex justify-between items-center mb-4 px-4">
            <div className="w-12 h-12 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Driver</span>
            </div>
            {/* Seat 1A */}
            <SeatButton
              seat={SEAT_LAYOUT[0].seats[0]}
              status={getSeatStatus(1)}
              onClick={() => handleSeatClick(1)}
              disabled={isLoading}
            />
          </div>

          {/* Divider */}
          <div className="h-4 border-t border-dashed border-border" />

          {/* Back row */}
          <div className="flex justify-center gap-2 mt-4">
            {SEAT_LAYOUT[1].seats.map((seat) => (
              <SeatButton
                key={seat.number}
                seat={seat}
                status={getSeatStatus(seat.number)}
                onClick={() => handleSeatClick(seat.number)}
                disabled={isLoading}
              />
            ))}
          </div>

          {/* Back of car indicator */}
          <div className="flex justify-center mt-4">
            <div className="bg-muted-foreground/10 text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
              Back
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm">
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
                const seat = [...SEAT_LAYOUT[0].seats, ...SEAT_LAYOUT[1].seats].find(
                  (st) => st.number === s
                );
                return seat?.label;
              })
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
};

interface SeatButtonProps {
  seat: { number: number; label: string };
  status: "available" | "selected" | "booked";
  onClick: () => void;
  disabled?: boolean;
}

const SeatButton = ({ seat, status, onClick, disabled }: SeatButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || status === "booked"}
      className={cn(
        "w-14 h-14 rounded-xl flex flex-col items-center justify-center transition-all",
        "border-2 font-medium text-sm",
        status === "available" &&
          "bg-card border-border hover:border-accent hover:bg-accent/10 cursor-pointer",
        status === "selected" &&
          "bg-accent border-accent text-accent-foreground cursor-pointer",
        status === "booked" &&
          "bg-muted-foreground/40 border-transparent cursor-not-allowed opacity-60"
      )}
    >
      {status === "selected" ? (
        <Check className="w-5 h-5" />
      ) : (
        <User className="w-4 h-4 opacity-50" />
      )}
      <span className="text-xs mt-0.5">{seat.label}</span>
    </button>
  );
};
