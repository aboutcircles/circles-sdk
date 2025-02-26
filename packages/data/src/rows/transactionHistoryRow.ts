import { Address } from '@circles-sdk/utils';
import { EventRow } from '../pagedQuery/eventRow';

/**
 * Describes a summary row of the transaction history.
 * Each row represents a net-transfer in a transaction (can be many in one tx).
 */
export interface TransactionHistoryRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  /**
   * If this row is a v1 or v2 transaction.
   * 1 for v1, 2 for v2.
   */
  version: number;
  /**
   * From whom the values was transferred.
   */
  from: Address;
  /**
   * To whom the value was transferred
   */
  to: Address;
  /**
   * The raw value transferred.
   * This can e.g. be a CRC amount, a static wrapper amount etc.
   */
  value: string;
  /**
   * The value transferred in Circles (the default display unit).
   */
  circles: number;
  /**
   * The value transferred in AttoCircles.
   */
  attoCircles: bigint;
  /**
   * The value transferred in static Circles (non demurraged representation of the Circles unit).
   */
  staticCircles: number;
  /**
   * The value transferred in static AttoCircles (non demurraged representation of the AttoCircles unit).
   */
  staticAttoCircles: bigint;
  /**
   * The value transferred in v1 CRC.
   */
  crc: number;
  /**
   * The value transferred in v1 AttoCRC.
   */
  attoCrc: bigint;
  /**
   * A json-serialized array of all raw events that occurred in the transaction.
   */
  events: string;
}