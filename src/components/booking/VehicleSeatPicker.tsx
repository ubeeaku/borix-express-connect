import { useState, useEffect, useMemo } from "react";
import { User, Check, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface VehicleSeatPickerProps {
  departureId: string;
  vehicleType: string;
  capacity: number;
  occupiedSeats?: number;
  passengers: number;
  selectedSeats: number[];
  onSeatsChange: (seats: number[]) => void;
}

// Layout generators per vehicle type.
// Seat numbers represent the physical seats in the vehicle.
const getLayout = (
  vehicleType: string,
  capacity: number
): {
  label: string;
  seats: { number: number; label: string }[];
}[] => {
  if (vehicleType === "sienna") {
    const siennaSeats = [
      { number: 1, label: "A1" },
      { number: 2, label: "B1" },
      { number: 3, label: "B2" },
      { number: 4, label: "B3" },
      { number: 5, label: "C1" },
      { number: 6, label: "C2" },
      { number: 7, label: "C3" },
    ];

    return [
      { label: "Front", seats: siennaSeats.slice(0, 1) },
      { label: "Middle", seats: siennaSeats.slice(1, 4) },
      { label: "Back", seats: siennaSeats.slice(4, 7) },
    ];
  }

  if (vehicleType === "hiace") {
    const rows: {
      label: string;
      seats: { number: number; label: string }[];
    }[] = [
      {
        label: "Front",
        seats: [{ number: 1, label: "A1" }],
      },
    ];

    let n = 2;

    ["B", "C", "D"].forEach((row) => {
      rows.push({
        label: row,
        seats: [1, 2, 3].map((i) => ({
          number: n++,
          label: `${row}${i}`,
        })),
      });
    });

    const finalSeats: { number: number; label: string }[] = [];

    for (let i = 1; i <= 4 && n <= capacity; i++) {
      finalSeats.push({
        number: n++,
        label: `E${i}`,
      });
    }

    if (finalSeats.length > 0) {
      rows.push({
        label: "E",
        seats: finalSeats,
      });
    }

    // Ensure we never render seats beyond the actual vehicle capacity.
    return rows
      .map((row) => ({
        ...row,
        seats: row.seats.filter((seat) => seat.number <= capacity),
      }))
      .filter((row) => row.seats.length > 0);
  }

  // Coaster or fallback:
  // Four seats per row.
  const rows: {
    label: string;
    seats: { number: number; label: string }[];
  }[] = [];

  let n = 1;
  const rowChars = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
  ];

  for (
    let i = 0;
    i < rowChars.length && n <= capacity;
    i++
  ) {
    const seats: { number: number; label: string }[] = [];

    for (let j = 1; j <= 4 && n <= capacity; j++) {
      seats.push({
        number: n,
        label: `${rowChars[i]}${j}`,
      });

      n++;
    }

    rows.push({
      label: rowChars[i],
      seats,
    });
  }

  return rows;
};

export const VehicleSeatPicker = ({
  departureId,
  vehicleType,
  capacity,
  occupiedSeats = 0,
  passengers,
  selectedSeats,
  onSeatsChange,
}: VehicleSeatPickerProps) => {
  const [takenSeats, setTakenSeats] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const safeCapacity = Math.max(Number(capacity) || 0, 0);

  const safeOccupiedSeats = Math.min(
    Math.max(Number(occupiedSeats) || 0, 0),
    safeCapacity
  );

  const borixCapacity = Math.max(
    safeCapacity - safeOccupiedSeats,
    0
  );

  const layout = useMemo(
    () => getLayout(vehicleType, safeCapacity),
    [vehicleType, safeCapacity]
  );

  /*
   * Seats occupied before the Borix trip are treated as unavailable.
   *
   * Example:
   * capacity = 7
   * occupiedSeats = 2
   *
   * Seats 1 and 2 are unavailable.
   * Seats 3-7 are available to Borix.
   */
  const preOccupiedSeatNumbers = useMemo(() => {
    return Array.from(
      { length: safeOccupiedSeats },
      (_, index) => index + 1
    );
  }, [safeOccupiedSeats]);

  useEffect(() => {
    if (!departureId) {
      setTakenSeats([]);
      return;
    }

    let isMounted = true;

    const fetchTaken = async () => {
      setIsLoading(true);

      try {
        const { data, error } = await supabase
          .from("departure_taken_seats")
          .select("seat_number")
          .eq("departure_id", departureId);

        if (error) throw error;

        if (isMounted) {
          setTakenSeats(
            data?.map((seat) => Number(seat.seat_number)) || []
          );
        }
      } catch (error) {
        console.error("Error fetching taken seats:", error);

        if (isMounted) {
          setTakenSeats([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchTaken();

    const interval = setInterval(fetchTaken, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [departureId]);

  /*
   * If the departure data changes and selected seats are no longer
   * valid, remove them.
   */
  useEffect(() => {
    if (!selectedSeats.length) return;

    const validSelectedSeats = selectedSeats.filter((seatNumber) => {
      if (seatNumber < 1 || seatNumber > safeCapacity) {
        return false;
      }

      if (preOccupiedSeatNumbers.includes(seatNumber)) {
        return false;
      }

      if (takenSeats.includes(seatNumber)) {
        return false;
      }

      return true;
    });

    if (validSelectedSeats.length !== selectedSeats.length) {
      onSeatsChange(validSelectedSeats.slice(0, passengers));
    }
  }, [
    selectedSeats,
    safeCapacity,
    preOccupiedSeatNumbers,
    takenSeats,
    passengers,
    onSeatsChange,
  ]);

  const isPreOccupied = (seatNumber: number) =>
    preOccupiedSeatNumbers.includes(seatNumber);

  const isTakenByBorixBooking = (seatNumber: number) =>
    takenSeats.includes(seatNumber);

  const isUnavailable = (seatNumber: number) =>
    isPreOccupied(seatNumber) ||
    isTakenByBorixBooking(seatNumber);

  const handleSeatClick = (seatNumber: number) => {
    if (isUnavailable(seatNumber)) return;

    if (selectedSeats.includes(seatNumber)) {
      onSeatsChange(
        selectedSeats.filter((seat) => seat !== seatNumber)
      );
      return;
    }

    if (selectedSeats.length < passengers) {
      onSeatsChange([...selectedSeats, seatNumber]);
      return;
    }

    // Preserve the existing behavior:
    // selecting another seat replaces the first selected seat.
    onSeatsChange([
      ...selectedSeats.slice(1),
      seatNumber,
    ]);
  };

  const getStatus = (
    seatNumber: number
  ): "available" | "selected" | "booked" => {
    if (isUnavailable(seatNumber)) {
      return "booked";
    }

    if (selectedSeats.includes(seatNumber)) {
      return "selected";
    }

    return "available";
  };

  const availableBorixSeats = Math.max(
    borixCapacity -
      takenSeats.filter(
        (seatNumber) =>
          seatNumber > safeOccupiedSeats &&
          seatNumber <= safeCapacity
      ).length,
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />

          <div>
            <h3 className="font-semibold text-foreground capitalize">
              {vehicleType} layout
            </h3>

            <p className="text-xs text-muted-foreground">
              {availableBorixSeats} Borix seat
              {availableBorixSeats === 1 ? "" : "s"} available
            </p>
          </div>
        </div>

        <span className="text-sm text-muted-foreground">
          {selectedSeats.length} of {passengers} selected
        </span>
      </div>

      {/* Capacity information */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted p-3">
          <p className="text-lg font-semibold text-foreground">
            {safeCapacity}
          </p>
          <p className="text-xs text-muted-foreground">
            Vehicle capacity
          </p>
        </div>

        <div className="rounded-xl bg-muted p-3">
          <p className="text-lg font-semibold text-foreground">
            {safeOccupiedSeats}
          </p>
          <p className="text-xs text-muted-foreground">
            Already occupied
          </p>
        </div>

        <div className="rounded-xl bg-muted p-3">
          <p className="text-lg font-semibold text-foreground">
            {availableBorixSeats}
          </p>
          <p className="text-xs text-muted-foreground">
            Borix available
          </p>
        </div>
      </div>

      <div className="bg-muted rounded-2xl p-6">
        <div className="mx-auto max-w-xs space-y-3">
          {/* Driver row */}
          {layout.length > 0 && (
            <div className="flex justify-between items-center mb-2">
              <div className="w-12 h-12 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">
                  Driver
                </span>
              </div>

              {layout[0]?.seats.map((seat) => (
                <SeatBtn
                  key={seat.number}
                  label={seat.label}
                  status={getStatus(seat.number)}
                  onClick={() =>
                    handleSeatClick(seat.number)
                  }
                  disabled={
                    isLoading ||
                    availableBorixSeats === 0
                  }
                />
              ))}
            </div>
          )}

          {/* Remaining rows */}
          {layout.slice(1).map((row, idx) => (
            <div key={`${row.label}-${idx}`}>
              <div className="h-px border-t border-dashed border-border mb-2" />

              <div className="flex justify-center gap-2">
                {row.seats.map((seat) => (
                  <SeatBtn
                    key={seat.number}
                    label={seat.label}
                    status={getStatus(seat.number)}
                    onClick={() =>
                      handleSeatClick(seat.number)
                    }
                    disabled={
                      isLoading ||
                      availableBorixSeats === 0
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-card border-2 border-border" />
          <span className="text-muted-foreground">
            Available
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent" />
          <span className="text-muted-foreground">
            Selected
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-muted-foreground/40" />
          <span className="text-muted-foreground">
            Occupied / Booked
          </span>
        </div>
      </div>

      {/* Selected seats */}
      {selectedSeats.length > 0 && (
        <div className="bg-accent/10 rounded-xl p-4">
          <p className="text-sm text-foreground">
            <span className="font-medium">
              Selected seats:
            </span>{" "}
            {selectedSeats
              .slice()
              .sort((a, b) => a - b)
              .map((seatNumber) => {
                const seat = layout
                  .flatMap((row) => row.seats)
                  .find(
                    (seat) =>
                      seat.number === seatNumber
                  );

                return seat
                  ? seat.label
                  : `Seat ${seatNumber}`;
              })
              .join(", ")}
          </p>
        </div>
      )}
    </div>
  );
};

const SeatBtn = ({
  label,
  status,
  onClick,
  disabled,
}: {
  label: string;
  status: "available" | "selected" | "booked";
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={
      disabled || status === "booked"
    }
    className={cn(
      "w-11 h-11 rounded-lg flex flex-col items-center justify-center border-2 transition-all font-medium",

      status === "available" &&
        "bg-card border-border hover:border-accent hover:bg-accent/10 cursor-pointer",

      status === "selected" &&
        "bg-accent border-accent text-accent-foreground cursor-pointer",

      status === "booked" &&
        "bg-muted-foreground/40 border-transparent cursor-not-allowed opacity-60"
    )}
  >
    {status === "selected" ? (
      <Check className="w-3 h-3" />
    ) : (
      <User className="w-3 h-3 opacity-50" />
    )}

    <span className="text-[9px] mt-0.5">
      {label}
    </span>
  </button>
);