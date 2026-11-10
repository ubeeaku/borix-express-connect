import test from "node:test";
import assert from "node:assert/strict";
import {
  getNigeriaTodayString,
  getNigeriaTomorrowString,
  isNigeriaDepartureInPast,
  parseNigeriaDepartureTimestamp,
} from "../src/lib/nigeriaTime.ts";

const now = Date.parse("2026-11-09T08:32:00.000Z"); // 9:32 AM in Nigeria

test("accepts a future departure later today in Nigeria time", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "10:30 AM", now), false);
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "10:30", now), false);
});

test("rejects a departure earlier today in Nigeria time", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "9:30 AM", now), true);
});

test("compares the full local date and time across midnight", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-10", "12:15 AM", now), false);
  assert.equal(isNigeriaDepartureInPast("2026-11-08", "11:59 PM", now), true);
});

test("rejects departures at the current instant and invalid schedules", () => {
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "9:32 AM", now), true);
  assert.equal(isNigeriaDepartureInPast("2026-02-30", "10:30 AM", now), true);
  assert.equal(isNigeriaDepartureInPast("2026-11-09", "25:30", now), true);
});

test("maps Nigeria local time to UTC with the UTC+1 offset", () => {
  assert.equal(
    parseNigeriaDepartureTimestamp("2026-11-09", "10:30 AM"),
    Date.parse("2026-11-09T09:30:00.000Z")
  );
});


test("uses the Nigerian calendar date for today and tomorrow around UTC midnight", () => {
  const justAfterNigeriaMidnight = new Date("2026-11-08T23:30:00.000Z");
  assert.equal(getNigeriaTodayString(justAfterNigeriaMidnight), "2026-11-09");
  assert.equal(getNigeriaTomorrowString(justAfterNigeriaMidnight), "2026-11-10");

  const beforeNigeriaMidnight = new Date("2026-11-09T22:30:00.000Z");
  assert.equal(getNigeriaTodayString(beforeNigeriaMidnight), "2026-11-09");
  assert.equal(getNigeriaTomorrowString(beforeNigeriaMidnight), "2026-11-10");
});
