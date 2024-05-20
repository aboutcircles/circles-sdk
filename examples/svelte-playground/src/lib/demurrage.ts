const DEMURRAGE_WINDOW = 1n; // days
const MAX_VALUE = (1n << 192n) - 1n; // uint192 max value
const GAMMA_64x64 = 18443079296116538654n;
const BETA_64x64 = 18450409579521241655n;
const DECIMALS = 18n;
const EXA = 10n ** DECIMALS;
const ONE_64x64 = 1n << 64n;

// Helper function to calculate power using fixed-point representation
function pow(base: bigint, exponent: bigint): bigint {
  let result = ONE_64x64;
  let x = base;
  while (exponent > 0n) {
    if (exponent % 2n == 1n) {
      result = (result * x) / ONE_64x64;
    }
    x = (x * x) / ONE_64x64;
    exponent /= 2n;
  }
  return result;
}

// Calculate discounted balance
function calculateDiscountedBalance(balance: bigint, daysDifference: bigint): bigint {
  if (daysDifference === 0n) {
    return balance;
  }
  const r = pow(GAMMA_64x64, daysDifference);
  return (balance * r) / ONE_64x64;
}

// Data structure for DiscountedBalance
interface DiscountedBalance {
  balance: bigint;
  lastUpdatedDay: bigint;
}

// Calculate current balances based on historical balances
function calculateCurrentBalances(
  balances: { [account: string]: { [id: number]: DiscountedBalance } },
  currentDay: bigint
): { [account: string]: { [id: number]: bigint } } {
  const currentBalances: { [account: string]: { [id: number]: bigint } } = {};

  for (const account in balances) {
    if (!currentBalances[account]) {
      currentBalances[account] = {};
    }

    for (const id in balances[account]) {
      const discountedBalance = balances[account][id];
      const daysDifference = currentDay - discountedBalance.lastUpdatedDay;
      currentBalances[account][id] = calculateDiscountedBalance(
        discountedBalance.balance,
        daysDifference
      );
    }
  }

  return currentBalances;
}

// Example usage

// Example balances data
const balances = {
  '0xAccount1': {
    1: { balance: 1000000000000000000n, lastUpdatedDay: 10n },
    2: { balance: 500000000000000000n, lastUpdatedDay: 12n }
  },
  '0xAccount2': {
    1: { balance: 2000000000000000000n, lastUpdatedDay: 8n }
  }
};

// Current day
const currentDay = 20n;

// Calculate current balances
const currentBalances = calculateCurrentBalances(balances, currentDay);

// Log the results
for (const account in currentBalances) {
  console.log(`Account: ${account}`);
  for (const id in currentBalances[account]) {
    console.log(`  ID: ${id}, Balance: ${currentBalances[account][id].toString()}`);
  }
}
