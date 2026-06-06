# Borix Express — Booking Flow Redesign Plan

Transform the current "pick route → pick seat" flow into a **departure marketplace**: passengers browse real scheduled departures (park, driver, vehicle, time, price, seats left), then pick a seat on that specific vehicle.

This is a large change touching the database, passenger booking flow, driver portal, and admin portal. I'll deliver it in clearly scoped phases so you can review between each.

---

## Phase 1 — Data model (foundation)

New tables:

- **parks** — name, city, address, contact_phone, status (active/inactive)
- **vehicles** — driver_id, type (Sienna/Hiace/Coaster), plate_number, capacity, year, color, status
- **departures** — the central new entity. Fields: route_id, park_id, driver_id, vehicle_id, travel_date, departure_time, total_seats, price, status (scheduled/boarding/in_transit/completed/cancelled), commission_amount

Changes to existing tables:

- **booked_seats** & **bookings**: add `departure_id` (becomes the primary link). Seat numbers become per-vehicle (1..capacity), not the current 1..35 across 5 cars.
- **drivers**: add rating, total_trips (denormalized counters), profile_photo_url
- **routes**: keep as the city-pair catalog (Jos↔Abuja etc.); price moves to per-departure
- New **platform_settings** row for default commission

Seat hold mechanism: a `seat_holds` table with `expires_at` (10 min) so reservations auto-release. A scheduled function or `expires_at < now()` filter in availability queries.

All tables get RLS + GRANTs following project conventions.

## Phase 2 — Passenger booking flow

New step sequence on `/booking`:

1. **Route + date** — origin city, destination city, date (Today / Tomorrow / pick)
2. **Departures list** — grouped by park. Each card shows driver photo + name + rating + trips, vehicle type, park, departure time, seats left, fare, "Select Departure" button. Empty state when no departures.
3. **Seat picker** — real vehicle layout based on `vehicle.type` (Sienna 5, Hiace 14, Coaster 30). Shows booked + currently-held seats. Selection creates a 10-min hold.
4. **Passenger info** — name, phone, email (optional), next-of-kin (kept, per existing business rule), with a summary panel showing chosen driver/park/vehicle/seat/time.
5. **Payment** — existing Paystack + Wallet, updated to reference `departure_id` instead of route+date+time. Booking ref format preserved (`BRX-XXXXXXXXXXXX`).
6. **Confirmation** — adds driver, park, vehicle, seat label; downloadable ticket (PDF or printable view); existing email/SMS hooks updated with new fields.

Flutterwave + Bank Transfer are listed as "coming soon" placeholders unless you want them wired now.

## Phase 3 — Driver portal

New screens under `/driver`:

- **Create Departure** form: park, route, date, time, vehicle (from driver's vehicles), seats, price (defaults from route)
- **My Departures** list with status controls: Start Trip, Complete Trip, Cancel
- **Bookings per Departure** — passenger manifest with seat numbers
- **Dashboard metrics**: trips today, seats sold, revenue (after commission), upcoming departures
- **My Vehicles** — register/edit vehicles

## Phase 4 — Admin portal

- **Parks** module (CRUD + suspend) — new
- **Vehicles** module — new (view all, verify)
- **Departures** module — view/cancel any departure, override status
- **Commission settings** — single configurable amount (per passenger) in platform_settings; can be edited anytime
- **Dashboard** additions: total parks, active departures, commission earned, popular routes, cancelled trips
- Driver approval / document verification already exists — extend with rating + trips counters surfaced

## Phase 5 — Confirmation & notifications

- Update existing email/SMS templates to include driver name, park, vehicle, seat
- Add downloadable ticket (HTML→print or simple PDF)
- WhatsApp confirmation: deep-link `wa.me` with prefilled message (no external API needed)

---

## Technical section (for reference)

- Seat-availability query: `vehicle.capacity` minus booked_seats minus active holds for that `departure_id`.
- Edge functions to update: `paystack-initialize`, `paystack-verify`, `wallet-pay` — switch payload from `(routeId, date, time, seats[])` to `(departureId, seats[])`, validate seat range against vehicle capacity, write `departure_id` into bookings.
- Commission applied at verify-time: split `total_amount` into `driver_amount` + `platform_commission`, recorded on booking + `driver_earnings`.
- Hold cleanup: filter `seat_holds.expires_at > now()` at read time; nightly cron optional.
- All new public tables get `GRANT` + RLS in the same migration; admin actions gated by `is_admin()`, driver actions gated by `drivers.user_id = auth.uid()`.
- Migration is additive — old bookings keep working; new bookings require `departure_id`.

---

## Suggested delivery order

I recommend shipping in this order so you can use the app between phases:

1. **Phase 1 + Phase 2** together (database + new passenger flow with seeded test departures) — this is the visible redesign.
2. **Phase 3** — driver self-service so real departures replace seeded ones.
3. **Phase 4** — admin parks/vehicles/commission management.
4. **Phase 5** — ticket download + richer notifications.

## Open questions before I start

1. Should I keep the **5 cars × 7 seats** model as a fallback when a departure has no assigned vehicle, or fully replace it with per-vehicle layouts (Sienna 5 / Hiace 14 / Coaster 30)?
2. **Commission**: single flat amount per passenger (e.g. ₦2,000), or percentage? Same for all routes, or per-route?
3. For Phase 1, do you want me to **seed sample parks + departures** (Terminus, Bauchi Road, Bukuru, Rayfield) so the new flow is usable immediately, or wait until drivers create their own?
4. Flutterwave + Bank Transfer now, or leave as "coming soon"?
