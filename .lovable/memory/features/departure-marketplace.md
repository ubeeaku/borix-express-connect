---
name: departure-marketplace
description: New booking flow where passengers pick a specific scheduled departure (park + driver + vehicle + time) before choosing seats
type: feature
---

The booking flow is a **departure marketplace**, not a generic ride request.

Steps: Route+Date → Departures list (grouped by park) → Vehicle-specific seat picker → Passenger details → Payment → Confirmation.

Core entity: `departures` (route_id, park_id, driver_id, vehicle_id, travel_date, departure_time, total_seats, price, commission_amount, status). Bookings + booked_seats reference `departure_id`.

Seat numbers are **per-vehicle** (1..capacity), not the legacy 1..35 across 5 cars. Vehicle types: sienna (7), hiace (14), coaster (30). Layouts live in `VehicleSeatPicker.tsx`.

Temporary 10-min seat holds via `seat_holds`. Active holds + booked seats are queried through the `departure_taken_seats` view.

Commission: flat amount per passenger stored on each departure (`commission_amount`). Default sourced from singleton `platform_settings.default_commission_amount`. Payment functions split `total_amount` into `driver_amount` + `platform_commission` on the booking row.

Edge functions `paystack-initialize` and `wallet-pay` now accept `{ departureId, passengers, seats, ... }` (NOT `routeId`/`date`/`time`). They look up the departure server-side, validate seat range against the vehicle's capacity, and write `departure_id` into bookings + booked_seats.

Driver records may have `user_id = NULL` for admin-created demo drivers (partial unique index allows multiple NULLs).
