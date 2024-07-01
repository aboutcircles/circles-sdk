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
  timeCircles: number;
  tokenAddress?: string;
}