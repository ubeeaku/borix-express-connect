export function reconcileTripSeats(vehicleCapacity: number, driverOccupiedSeats: number) {
  if (!Number.isInteger(vehicleCapacity) || vehicleCapacity < 1 || vehicleCapacity > 60) throw new Error("Vehicle capacity must be an integer from 1 to 60.");
  if (!Number.isInteger(driverOccupiedSeats) || driverOccupiedSeats < 0 || driverOccupiedSeats >= vehicleCapacity) throw new Error("Driver occupied seats must leave at least one seat for Borix bookings.");
  return { vehicleCapacity, driverOccupiedSeats, borixSeatCapacity: vehicleCapacity - driverOccupiedSeats };
}
