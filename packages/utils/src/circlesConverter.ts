/**
 * Conversions between demurrage and inflationary units in V2 – bit‑identical with the
 * Solidity reference implementation (ABDK Math 64.64).
 *
 * All fixed‑point math uses ABDK’s 64.64 format encoded in `bigint`.
 */
export class CirclesConverter {
  // ───────────────────────────────── constants ─────────────────────────────────

  /** 1.0 in 64.64 representation */
  public static readonly ONE_64: bigint = 1n << 64n;

  /** GAMMA = (0.93)^(1/365.25) * 2^64 */
  public static readonly GAMMA_64: bigint = 18_443_079_296_116_538_654n;
  /** BETA = 1 / GAMMA * 2^64 */
  public static readonly BETA_64: bigint = 18_450_409_579_521_241_655n;

  public static readonly SECONDS_PER_DAY: bigint = 86_400n;
  public static readonly INFLATION_DAY_ZERO_UNIX: bigint = 1_602_720_000n; // 2020‑10‑15 00:00:00 UTC

  public static readonly ATTO_FACTOR: bigint = 1_000_000_000_000_000_000n; // 1e18
  public static readonly FACTOR_1E12: bigint = 1_000_000_000_000n; // 1e12

  public static readonly V1_ACCURACY: bigint = 100_000_000n; // 1e8
  public static readonly V1_INFLATION_PCT_NUM: bigint = 107n;
  public static readonly V1_INFLATION_PCT_DEN: bigint = 100n;
  public static readonly PERIOD_SEC: bigint = 31_556_952n; // 365.25 days

  // ───────────────────────────── fixed‑point helpers ───────────────────────────

  /**
   * Multiplies two 64.64 factors and returns a 64.64 factor.
   * (a * b) >> 64
   */
  private static mul64(a: bigint, b: bigint): bigint {
    return (a * b) >> 64n;
  }

  /**
   * Multiplies a 64.64 factor with an unsigned integer (bigint) and truncates.
   * Equivalent to ABDKMath64x64.mulu.
   */
  private static mulU(factor64x64: bigint, value: bigint): bigint {
    return (factor64x64 * value) >> 64n;
  }

  /**
   * Exponentiation by squaring for 64.64 factors.
   * Equivalent to ABDKMath64x64.pow(base, exp).
   */
  private static pow64(base64x64: bigint, exp: bigint): bigint {
    let base: bigint = base64x64;
    let exponent: bigint = exp;
    let result: bigint = this.ONE_64;

    while (exponent > 0n) {
      if ((exponent & 1n) === 1n) {
        result = this.mul64(result, base);
      }
      base = this.mul64(base, base);
      exponent >>= 1n;
    }

    return result;
  }

  /** 1.0 in 1 × 10³⁶ representation. */
  private static readonly ONE_36 =
    1_000_000_000_000_000_000_000_000_000_000_000_000_000n; // 1e36

  /** 0.93^(1 / 365.25) scaled to 1e36 (rounded half-up). */
  private static readonly GAMMA_36 =
    999_801_332_008_598_957_430_613_406_568_191_166n;

  /** 1 / GAMMA scaled to 1e36 (rounded half-up). */
  private static readonly BETA_36 =
    1_000_198_707_468_214_629_156_271_489_013_303_962n;

  /** (a · b) / 1e36 – stays inside the 1e36 domain. */
  private static mul36(a: bigint, b: bigint): bigint {
    return (a * b) / this.ONE_36;
  }

  /** Exponentiation for 1e36-scaled factors. */
  private static pow36(base36: bigint, exp: bigint): bigint {
    let result = this.ONE_36;
    let base = base36;
    let e = exp;

    while (e > 0n) {
      const isOdd = (e & 1n) === 1n;
      if (isOdd) {
        result = this.mul36(result, base);
      }
      base = this.mul36(base, base);
      e >>= 1n;
    }
    return result;
  }


  // ───────────────────────────── API: human units ─────────────────────────────

  /** Atto‑circles (1e18) → UI circles as JS number (lossless until 2^53‑1). */
  static attoCirclesToCircles(atto: bigint): number {
    if (atto === 0n) return 0;

    // Split integer and fractional parts before casting to preserve precision.
    const whole: bigint = atto / this.ATTO_FACTOR;
    const frac: bigint = atto % this.ATTO_FACTOR;

    const MAX_SAFE_INT: bigint = BigInt(Number.MAX_SAFE_INTEGER);
    if (whole > MAX_SAFE_INT || whole < -MAX_SAFE_INT) {
      throw new RangeError('Atto value’s integer component exceeds JS double precision.');
    }

    return Number(whole) + Number(frac) / Number(this.ATTO_FACTOR);
  }

  /** UI circles → atto‑circles (truncates to match Solidity’s rounding). */
  static circlesToAttoCircles(circles: number): bigint {
    return BigInt(Math.trunc(circles * Number(this.ATTO_FACTOR)));
  }

  // ───────────────────────────── API: demurrage math ──────────────────────────

  /** Inflationary → demurraged for explicit day index. */
  static inflationaryToDemurrage(inflationary: bigint, day: bigint): bigint {
    return this.mulU(this.pow64(this.GAMMA_64, day), inflationary);
  }

  /** Demurraged → inflationary for explicit day index. */
  static demurrageToInflationary(demurraged: bigint, day: bigint): bigint {
    return this.mulU(this.pow64(this.BETA_64, day), demurraged);
  }

  /** UNIX timestamp (seconds) → Circles day index. */
  static dayFromTimestamp(unixSeconds: bigint): bigint {
    return (unixSeconds - this.INFLATION_DAY_ZERO_UNIX) / this.SECONDS_PER_DAY;
  }

  /** Demurraged → static circles for “today”. */
  static attoCirclesToAttoStaticCircles(
    demurraged: bigint,
    nowUnixSeconds: bigint = BigInt(Math.floor(Date.now() / 1000))
  ): bigint {
    return this.demurrageToInflationary(demurraged, this.dayFromTimestamp(nowUnixSeconds));
  }

  /** Static circles → demurraged circles for “today”. */
  static attoStaticCirclesToAttoCircles(
    staticCircles: bigint,
    nowUnixSeconds: bigint = BigInt(Math.floor(Date.now() / 1000))
  ): bigint {
    return this.inflationaryToDemurrage(staticCircles, this.dayFromTimestamp(nowUnixSeconds));
  }

  /** Inflationary → demurraged (exact, reversible). */
  static inflationaryToDemurrageExact(inflationary: bigint, day: bigint): bigint {
    const factor = this.pow36(this.GAMMA_36, day);
    return (inflationary * factor) / this.ONE_36;
  }

  /** Demurraged → inflationary (inverse of the above, exact). */
  static demurrageToInflationaryExact(demurraged: bigint, day: bigint): bigint {
    const factor = this.pow36(this.BETA_36, day);
    return (demurraged * factor) / this.ONE_36;
  }

  /** Demurraged atto-circles → static atto-circles “today” (loss-less). */
  static attoCirclesToAttoStaticCirclesExact(
    demurraged: bigint,
    nowUnixSeconds: bigint = BigInt(Math.floor(Date.now() / 1000))
  ): bigint {
    const day = this.dayFromTimestamp(nowUnixSeconds);
    return this.demurrageToInflationaryExact(demurraged, day);
  }

  /** Static atto-circles → demurraged atto-circles “today” (loss-less). */
  static attoStaticCirclesToAttoCirclesExact(
    staticCircles: bigint,
    nowUnixSeconds: bigint = BigInt(Math.floor(Date.now() / 1000))
  ): bigint {
    const day = this.dayFromTimestamp(nowUnixSeconds);
    return this.inflationaryToDemurrageExact(staticCircles, day);
  }

  // ───────────────────── utilities for 6‑decimal truncation ───────────────────

  static truncateToInt64(wei: bigint): bigint {
    const truncated: bigint = wei / this.FACTOR_1E12;
    const MAX_INT64: bigint = 9_223_372_036_854_775_807n;
    return truncated > MAX_INT64 ? MAX_INT64 : truncated;
  }

  static blowUpToBigInt(sixDecimals: bigint): bigint {
    return sixDecimals * this.FACTOR_1E12;
  }

  static truncateToSixDecimals(wei: bigint): bigint {
    return this.blowUpToBigInt(this.truncateToInt64(wei));
  }

  // ───────────────────────── v1 → v2 migration helpers ─────────────────────────

  private static v1InflateFactor(periodIdx: bigint): bigint {
    if (periodIdx === 0n) return this.V1_ACCURACY;
    return (this.V1_ACCURACY * this.V1_INFLATION_PCT_NUM ** periodIdx) / (this.V1_INFLATION_PCT_DEN ** periodIdx);
  }

  /** CRC → demurraged Circles for a given timestamp. */
  static attoCrcToAttoCircles(v1Amount: bigint, blockTimestampUtc: bigint): bigint {
    const secondsSinceEpoch: bigint = blockTimestampUtc - this.INFLATION_DAY_ZERO_UNIX;
    const periodIdx: bigint = secondsSinceEpoch / this.PERIOD_SEC;
    const secondsIntoPeriod: bigint = secondsSinceEpoch % this.PERIOD_SEC;
    const factorCur: bigint = this.v1InflateFactor(periodIdx);
    const factorNext: bigint = this.v1InflateFactor(periodIdx + 1n);
    return this.v1ToDemurrage(v1Amount, factorCur, factorNext, secondsIntoPeriod, this.PERIOD_SEC);
  }

  /** Demurraged Circles → CRC (inverse of the above). */
  static attoCirclesToAttoCrc(demurraged: bigint, blockTimestampUtc: bigint): bigint {
    const secondsSinceEpoch: bigint = blockTimestampUtc - this.INFLATION_DAY_ZERO_UNIX;
    const periodIdx: bigint = secondsSinceEpoch / this.PERIOD_SEC;
    const secondsIntoPeriod: bigint = secondsSinceEpoch % this.PERIOD_SEC;
    const factorCur: bigint = this.v1InflateFactor(periodIdx);
    const factorNext: bigint = this.v1InflateFactor(periodIdx + 1n);
    const rP: bigint = factorCur * (this.PERIOD_SEC - secondsIntoPeriod) + factorNext * secondsIntoPeriod;
    return (demurraged * 3n * this.V1_ACCURACY * this.PERIOD_SEC) / rP;
  }

  /** Implements the on‑chain formula used during migration. */
  private static v1ToDemurrage(
    v1Amount: bigint,
    factorCur: bigint,
    factorNext: bigint,
    secondsInto: bigint,
    periodSec: bigint
  ): bigint {
    const rP: bigint = factorCur * (periodSec - secondsInto) + factorNext * secondsInto;
    return (v1Amount * 3n * this.V1_ACCURACY * periodSec) / rP;
  }
}