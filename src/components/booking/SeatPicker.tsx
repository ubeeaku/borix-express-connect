import { useState, useEffect } from "react";
import { User, Check, Car, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SeatPickerProps {
  routeId: string;
  date: string;
  time: string;
  passengers: number;
  selectedSeats: number[];
  onSeatsChange: (seats: number[]) => void;
}

const TOTAL_CARS = 5;
const SEATS_PER_CAR = 7;

const getCarLayout = (carIndex: number) => {
  const baseNumber = carIndex * SEATS_PER_CAR;
  return [
    { row: 1, label: "Front", seats: [{ number: baseNumber + 1, label: "A1" }] },
    { row: 2, label: "Middle", seats: [{ number: baseNumber + 2, label: "B1" }, { number: baseNumber + 3, label: "B2" }, { number: baseNumber + 4, label: "B3" }] },
    { row: 3, label: "Back", seats: [{ number: baseNumber + 5, label: "C1" }, { number: baseNumber + 6, label: "C2" }, { number: baseNumber + 7, label: "C3" }] },
  ];
};

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

// Helper: which car indices have selected seats
const getCarIndicesWithSelections = (selectedSeats: number[]) => {
  const allSeats = getAllSeats();
  const indices = new Set<number>();
  selectedSeats.forEach(seatNum => {
    const found = allSeats.find(s => s.number === seatNum);
    if (found) indices.add(found.carIndex);
  });
  return indices;
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
  const [expandedCars, setExpandedCars] = useState<Set<number>>(new Set(Array.from({ length: TOTAL_CARS }, (_, i) => i)));

  // When seats are selected, collapse cars without selections
  useEffect(() => {
    if (selectedSeats.length > 0) {
      const carsWithSelections = getCarIndicesWithSelections(selectedSeats);
      setExpandedCars(carsWithSelections);
    } else {
      // All expanded when nothing selected
      setExpandedCars(new Set(Array.from({ length: TOTAL_CARS }, (_, i) => i)));
    }
  }, [selectedSeats]);

  useEffect(() => {
    const fetchBookedSeats = async () => {
      if (!routeId || !date || !time) {
        setBookedSeats([]);
        return;
      }
      setIsLoading(true);
      try {
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
      onSeatsChange([...selectedSeats.slice(1), seatNumber]);
    }
  };

  const getSeatStatus = (seatNumber: number) => {
    if (bookedSeats.includes(seatNumber)) return "booked";
    if (selectedSeats.includes(seatNumber)) return "selected";
    return "available";
  };

  const toggleCar = (carIndex: number) => {
    setExpandedCars(prev => {
      const next = new Set(prev);
      if (next.has(carIndex)) {
        next.delete(carIndex);
      } else {
        next.add(carIndex);
      }
      return next;
    });
  };

  const hasSelections = selectedSeats.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Select Your Seats</h3>
        <span className="text-sm text-muted-foreground">
          {selectedSeats.length} of {passengers} selected
        </span>
      </div>

      {/* Cars - collapsible */}
      <div className="space-y-3">
        {Array.from({ length: TOTAL_CARS }, (_, carIndex) => {
          const layout = getCarLayout(carIndex);
          const availableCount = layout.flatMap(r => r.seats).filter(s => getSeatStatus(s.number) === "available").length;
          const selectedCount = layout.flatMap(r => r.seats).filter(s => getSeatStatus(s.number) === "selected").length;
          const isOpen = expandedCars.has(carIndex);

          return (
            <div key={carIndex} className="bg-muted rounded-2xl overflow-hidden">
              {/* Car header - always visible */}
              <button
                type="button"
                onClick={() => toggleCar(carIndex)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted-foreground/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Car {carIndex + 1}</span>
                  {selectedCount > 0 && (
                    <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                      {selectedCount} selected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{availableCount} available</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Car body - collapsible */}
              {isOpen && (
                <div className="px-4 pb-4">
                  <div className="relative mx-auto max-w-[140px]">
                    <div className="flex justify-between items-center mb-2 px-2">
                      <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground">Driver</span>
                      </div>
                      {layout[0].seats.map((seat) => (
                        <SeatButton key={seat.number} seat={seat} status={getSeatStatus(seat.number)} onClick={() => handleSeatClick(seat.number)} disabled={isLoading} compact />
                      ))}
                    </div>
                    <div className="h-2 border-t border-dashed border-border" />
                    <div className="flex justify-center gap-2 my-2">
                      {layout[1].seats.map((seat) => (
                        <SeatButton key={seat.number} seat={seat} status={getSeatStatus(seat.number)} onClick={() => handleSeatClick(seat.number)} disabled={isLoading} compact />
                      ))}
                    </div>
                    <div className="h-2 border-t border-dashed border-border" />
                    <div className="flex justify-center gap-2 mt-2">
                      {layout[2].seats.map((seat) => (
                        <SeatButton key={seat.number} seat={seat} status={getSeatStatus(seat.number)} onClick={() => handleSeatClick(seat.number)} disabled={isLoading} compact />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
