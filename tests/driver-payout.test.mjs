import test from 'node:test';
import assert from 'node:assert/strict';

import { nairaToKobo } from '../src/lib/driverPayout.ts';

test('converts whole-naira earnings to Paystack kobo', () => {
  assert.equal(nairaToKobo(250), 25_000);
});

test('accepts safe large transfer amounts', () => {
  assert.equal(nairaToKobo(100_000_000), 10_000_000_000);
});

test('rejects zero, negative, fractional, and non-numeric amounts', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, '250', null]) {
    assert.equal(nairaToKobo(value), null);
  }
});

test('rejects amounts whose kobo value exceeds JavaScript safe integer range', () => {
  assert.equal(nairaToKobo(Number.MAX_SAFE_INTEGER), null);
});
