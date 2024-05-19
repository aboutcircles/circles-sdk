import { Row } from '../pagedQuery/row';

export interface TransactionHistoryRow extends Row {
  timestamp: number;
  transactionHash: string;
  version: number;
  operator: string;
  from: string;
  to: string;
  id: string;
  value: string;
  timeCircles: number;
}