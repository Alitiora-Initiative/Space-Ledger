const assert = require('node:assert/strict');
const test = require('node:test');
const bondingCurve = require('../src/bondingCurve');

test('bonding curve starts at the configured price and reaches its target', () => {
  assert.equal(bondingCurve.calculatePrice(0), bondingCurve.STARTING_PRICE);
  assert.equal(bondingCurve.calculatePrice(bondingCurve.TOTAL_SUPPLY), bondingCurve.TARGET_PRICE);
});

test('bonding curve clamps positions to the supply range', () => {
  assert.equal(bondingCurve.calculatePrice(-1), bondingCurve.STARTING_PRICE);
  assert.equal(bondingCurve.calculatePrice(bondingCurve.TOTAL_SUPPLY + 1), bondingCurve.TARGET_PRICE);
});

test('bonding curve price increases linearly with position', () => {
  const first = bondingCurve.calculatePrice(1_000_000_000);
  const second = bondingCurve.calculatePrice(2_000_000_000);
  assert.ok(second > first);
  assert.ok(Math.abs((second - first) - bondingCurve.SLOPE * 1_000_000_000) < 1e-9);
});
