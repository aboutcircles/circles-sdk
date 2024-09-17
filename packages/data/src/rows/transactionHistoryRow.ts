import { EventRow } from '../pagedQuery/eventRow';

export interface TransactionHistoryRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  version: number;
  operator: string;
  from: string;
  to: string;
  id: string;
  value: string;
  tokenAddress?: string;
  type: string;
  tokenType: string;
  circles: number;
  attoCircles: bigint;
  staticCircles: number;
  staticAttoCircles: bigint;
  crc: number;
  attoCrc: bigint;
  v1Circles: number;
  v1AttoCircles: bigint;
}