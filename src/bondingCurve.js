// Bonding curve price model: P(x) = m·x + c
// Where:
// - x is the supply/position
// - m is the slope
// - c is the starting price (offset)

const TOTAL_SUPPLY = 10000000000; // 10 billion units
const STARTING_PRICE = 0.001; // Starting price in USD
const TARGET_PRICE = 10.00; // Target final price in USD
const SLOPE = (TARGET_PRICE - STARTING_PRICE) / TOTAL_SUPPLY;

let currentSupply = 0;

function calculatePrice(supply) {
  if (supply < 0) supply = 0;
  if (supply > TOTAL_SUPPLY) supply = TOTAL_SUPPLY;
  
  // P(x) = m·x + c
  const price = SLOPE * supply + STARTING_PRICE;
  return Math.max(0, price);
}

function getCurrentSupply() {
  return currentSupply;
}

function updateSupply(delta) {
  const newSupply = currentSupply + delta;
  if (newSupply >= 0 && newSupply <= TOTAL_SUPPLY) {
    currentSupply = newSupply;
    return true;
  }
  return false;
}

function getBondingCurveInfo() {
  return {
    totalSupply: TOTAL_SUPPLY,
    currentSupply,
    startingPrice: STARTING_PRICE,
    targetPrice: TARGET_PRICE,
    slope: SLOPE,
    formula: `P(x) = ${SLOPE.toExponential(3)}·x + ${STARTING_PRICE}`
  };
}

module.exports = {
  TOTAL_SUPPLY,
  STARTING_PRICE,
  TARGET_PRICE,
  SLOPE,
  calculatePrice,
  getCurrentSupply,
  updateSupply,
  getBondingCurveInfo
};
