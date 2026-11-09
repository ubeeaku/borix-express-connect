import test from "node:test";
import assert from "node:assert/strict";
import {
  isNigeriaDepartureInPast,
  parseNigeriaDepartureTimestamp,
} from "../src/lib/nigeriaTime.ts";

const now = Date.parse("2026-11-09T08:32:00.000Z"); // 9:32 AM in Nigeria

test("accepts 10:30 AM later on the same Nigeria-local day", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "10:30 AM", now), false);
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "10:30", now), false);
});

test("rejects a past time and a past date", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "9:30 AM", now), true);
  assert.equal(isNigeriaDepartureInPast("2026-11-08", "11:59 PM", now), true);
});

test("compares future departures on the next calendar day", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-10", "12:15 AM", now), false);
});

test("rejects a departure at the current instant and malformed schedules", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "9:32 AM", now), true);
  assert.equal(isNigeriaDepartureInPast("2026-02-30", "10:30 AM", now), true);
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "25:30", now), true);
});

test("converts Africa/Lagos local time to the correct UTC instant", () => {
  assert.equal(
    parseNigeriaDepartureTimestamp("2026-11-09", "10:30 AM"),
    Date.parse("2026-11-09T09:30:00.000Z")
  );
});
