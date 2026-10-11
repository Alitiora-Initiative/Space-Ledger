// Automatic Background Processes
// Handles vesting releases and fee collection automatically

const treasury = require('./treasury');

// Launch date (simulated - in production, this would be from blockchain)
const LAUNCH_DATE = new Date('2024-01-01T00:00:00Z').getTime();

// Check vesting schedule and automatically release if eligible
function checkAndReleaseVesting() {
  const now = Date.now();
  const monthsSinceLaunch = Math.floor((now - LAUNCH_DATE) / (30 * 24 * 60 * 60 * 1000));

  // Only check after cliff period
  if (monthsSinceLaunch < treasury.CLIFF_MONTHS) {
    return {
      status: 'cliff_active',
      monthsUntilCliff: treasury.CLIFF_MONTHS - monthsSinceLaunch,
      message: 'Cliff period active - no releases yet'
    };
  }

  const monthsAfterCliff = monthsSinceLaunch - treasury.CLIFF_MONTHS;
  const vestingProgress = Math.min(monthsAfterCliff / treasury.VESTING_DURATION_MONTHS, 1);

  return {
    status: 'vesting_active',
    monthsSinceLaunch,
    monthsAfterCliff,
    vestingProgress: (vestingProgress * 100).toFixed(2) + '%',
    message: 'Vesting in progress - automatic releases handled by smart contract'
  };
}

// Automatic fee collection on every transaction
function collectTransactionFee(transactionAmount) {
  // Flat fee of $0.10 automatically collected
  const fee = treasury.MICRO_FEE_AMOUNT;
  treasury.collectedFees += fee;

  return {
    originalAmount: transactionAmount,
    feeCollected: fee,
    feeType: 'flat',
    totalCollected: treasury.collectedFees
  };
}

// Get current vesting status (read-only)
function getVestingStatus() {
  const now = Date.now();
  const monthsSinceLaunch = Math.floor((now - LAUNCH_DATE) / (30 * 24 * 60 * 60 * 1000));

  if (monthsSinceLaunch < treasury.CLIFF_MONTHS) {
    return {
      phase: 'cliff',
      monthsElapsed: monthsSinceLaunch,
      monthsRemaining: treasury.CLIFF_MONTHS - monthsSinceLaunch,
      canRelease: false,
      message: 'Cliff period - no releases allowed'
    };
  }

  const monthsAfterCliff = monthsSinceLaunch - treasury.CLIFF_MONTHS;
  const vestingProgress = Math.min(monthsAfterCliff / treasury.VESTING_DURATION_MONTHS, 1);

  return {
    phase: 'vesting',
    monthsElapsed: monthsSinceLaunch,
    monthsAfterCliff,
    vestingProgress: (vestingProgress * 100).toFixed(2) + '%',
    maxReleasable: Math.floor(treasury.TOTAL_ALLOCATION * vestingProgress),
    canRelease: vestingProgress > 0,
    message: 'Vesting active - automatic releases by smart contract'
  };
}

module.exports = {
  checkAndReleaseVesting,
  collectTransactionFee,
  getVestingStatus
};
