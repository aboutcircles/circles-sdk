import { Address } from '@circles-sdk/utils';
import { EventRow } from '../pagedQuery/eventRow';

export interface TransactionHistoryRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  version: number;
  from: Address;
  to: Address;
  circles: number;
  attoCircles: bigint;
  staticCircles: number;
  staticAttoCircles: bigint;
  crc: number;
  attoCrc: bigint;
  events: string;
}