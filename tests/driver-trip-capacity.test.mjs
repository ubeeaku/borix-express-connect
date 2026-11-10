import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileTripSeats } from '../src/lib/tripCapacity.ts';

test('keeps driver occupied seats separate from Borix bookable capacity', () => {
  assert.deepEqual(reconcileTripSeats(14, 3), { vehicleCapacity: 14, driverOccupiedSeats: 3, borixSeatCapacity: 11 });
});
test('allows zero driver occupied seats', () => {
  assert.equal(reconcileTripSeats(5, 0).borixSeatCapacity, 5);
});
test('rejects occupied seats equal to or above vehicle capacity', () => {
  assert.throws(() => reconcileTripSeats(5, 5));
  assert.throws(() => reconcileTripSeats(5, 6));
});
test('rejects invalid capacities and fractional counts', () => {
  assert.throws(() => reconcileTripSeats(0, 0));
  assert.throws(() => reconcileTripSeats(5, 1.5));
});
