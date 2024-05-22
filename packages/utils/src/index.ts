import { BigNumber } from 'bignumber.js';

/**
 * Formats the token balance in time circles.
 * @param tokenBalance The token balance as a BigNumber.
 * @return The formatted token balance as a string.
 */
function formatTimeCircles(tokenBalance: BigNumber): string {
  const ether = tokenBalance.dividedToIntegerBy(new BigNumber(10).pow(18));
  const remainder = tokenBalance.mod(new BigNumber(10).pow(18));
  let remainderString = remainder.toFixed(0).padStart(18, '0').replace(/0+$/, '');

  return remainderString.length > 0
    ? `${ether.toString()}.${remainderString}`
    : ether.toString();
}

const CirclesInceptionTimestamp = new Date('2020-10-15T00:00:00.000Z').getTime();
const OneDayInMilliseconds = new BigNumber(86400).multipliedBy(1000);
const OneCirclesYearInDays = new BigNumber(365.25);
const OneCirclesYearInMilliseconds = OneCirclesYearInDays.multipliedBy(24).multipliedBy(60).multipliedBy(60).multipliedBy(1000);

function getCrcPayoutAt(timestamp: number): number {
  const daysSinceCirclesInception = new BigNumber(timestamp - CirclesInceptionTimestamp).dividedBy(OneDayInMilliseconds);
  const circlesYearsSince = new BigNumber(timestamp - CirclesInceptionTimestamp).dividedBy(OneCirclesYearInMilliseconds);
  const daysInCurrentCirclesYear = daysSinceCirclesInception.mod(OneCirclesYearInDays);

  const initialDailyCrcPayout = new BigNumber(8);
  let circlesPayoutInCurrentYear = initialDailyCrcPayout;
  let previousCirclesPerDayValue = initialDailyCrcPayout;

  for (let index = 0; index < circlesYearsSince.toNumber(); index++) {
    previousCirclesPerDayValue = circlesPayoutInCurrentYear;
    circlesPayoutInCurrentYear = circlesPayoutInCurrentYear.multipliedBy(1.07);
  }

  const x = previousCirclesPerDayValue;
  const y = circlesPayoutInCurrentYear;
  const a = daysInCurrentCirclesYear.dividedBy(OneCirclesYearInDays);

  return x.multipliedBy(new BigNumber(1).minus(a)).plus(y.multipliedBy(a)).toNumber();
}

/**
 * Converts a CRC amount to a TC amount.
 * @param timestamp The point in time when the CRC transaction happened.
 * @param amount The CRC value of the transaction.
 * @return The TC value of the transaction.
 */
export function crcToTc(timestamp: Date, amount: number): number {
  const ts = timestamp.getTime();
  const payoutAtTimestamp = getCrcPayoutAt(ts);
  return amount / payoutAtTimestamp * 24;
}

/**
 * Converts a TC amount to a CRC amount.
 * @param timestamp The point in time when the CRC transaction happened.
 * @param amount The TC value of the transaction.
 */
export function tcToCrc(timestamp: Date, amount: number): number {
  const ts = timestamp.getTime();
  const payoutAtTimestamp = getCrcPayoutAt(ts);
  return amount / 24 * payoutAtTimestamp;
}