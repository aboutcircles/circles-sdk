import { Row } from '../pagedQuery/row';

export interface TrustListRow extends Row {
  timestamp: number;
  transactionHash: string;
  version: number;
  trustee: string;
  truster: string;
  expiryTime: number;
  limit: number;
}