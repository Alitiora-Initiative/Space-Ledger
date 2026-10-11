const bondingCurve = require('./bondingCurve');

// Treasury configuration
const CLIFF_MONTHS = 12; // 12-month cliff period
const VESTING_DURATION_MONTHS = 36; // 3-year vesting after cliff
const MICRO_FEE_AMOUNT = 0.10; // $0.10 flat fee per transaction
const FEE_CURRENCY = 'USDC'; // Stablecoin for fees

// Treasury allocation (approximate based on notes)
const TOTAL_ALLOCATION = 1000000000; // 1 billion for Phase 1
const TREASURY_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder

// Track vested releases
const vestingSchedule = new Map();
let treasuryBalance = TOTAL_ALLOCATION;
let collectedFees = 0;

// Alias kept for legacy references
const MICRO_FEE_RATE = MICRO_FEE_AMOUNT;

function getTreasuryStatus() {
  return {
    totalAllocation: TOTAL_ALLOCATION,
    currentBalance: treasuryBalance,
    collectedFees,
    cliffMonths: CLIFF_MONTHS,
    vestingDurationMonths: VESTING_DURATION_MONTHS,
    feeRate: MICRO_FEE_AMOUNT,
    feeCurrency: FEE_CURRENCY,
    treasuryAddress: TREASURY_ADDRESS
  };
}

function releaseVestedTokens(address, amount) {
  const now = Date.now();
  const launchDate = now - (CLIFF_MONTHS * 30 * 24 * 60 * 60 * 1000); // Simulated launch date
  
  const monthsSinceLaunch = Math.floor((now - launchDate) / (30 * 24 * 60 * 60 * 1000));
  
  if (monthsSinceLaunch < CLIFF_MONTHS) {
    return {
      success: false,
      message: 'Cliff period not yet reached',
      monthsUntilCliff: CLIFF_MONTHS - monthsSinceLaunch
    };
  }
  
  const monthsAfterCliff = monthsSinceLaunch - CLIFF_MONTHS;
  const vestingProgress = Math.min(monthsAfterCliff / VESTING_DURATION_MONTHS, 1);
  const maxReleasable = Math.floor(TOTAL_ALLOCATION * vestingProgress);
  
  if (amount > maxReleasable) {
    return {
      success: false,
      message: 'Amount exceeds vesting schedule',
      maxReleasable,
      requested: amount
    };
  }
  
  if (amount > treasuryBalance) {
    return {
      success: false,
      message: 'Insufficient treasury balance',
      balance: treasuryBalance
    };
  }
  
  treasuryBalance -= amount;
  vestingSchedule.set(address, (vestingSchedule.get(address) || 0) + amount);
  
  return {
    success: true,
    message: 'Tokens released successfully',
    address,
    amount,
    vestingProgress: (vestingProgress * 100).toFixed(2) + '%'
  };
}

function collectFee(amount, currency) {
  if (currency !== FEE_CURRENCY) {
    return {
      success: false,
      message: `Fee currency must be ${FEE_CURRENCY}`
    };
  }

  // Flat fee of $0.10 per transaction
  const fee = MICRO_FEE_AMOUNT;
  collectedFees += fee;

  return {
    success: true,
    originalAmount: amount,
    fee: fee,
    feeType: 'flat',
    feeAmount: MICRO_FEE_AMOUNT,
    totalCollected: collectedFees
  };
}

function getVestingSchedule() {
  return Object.fromEntries(vestingSchedule);
}

module.exports = {
  // Constants — exported so backgroundProcesses.js can read them directly
  CLIFF_MONTHS,
  VESTING_DURATION_MONTHS,
  MICRO_FEE_AMOUNT,
  TOTAL_ALLOCATION,
  FEE_CURRENCY,
  TREASURY_ADDRESS,

  // Mutable state accessors
  get collectedFees() { return collectedFees; },
  set collectedFees(v) { collectedFees = v; },

  // Functions
  getTreasuryStatus,
  releaseVestedTokens,
  collectFee,
  getVestingSchedule
};
