import { EventRow } from '../pagedQuery/eventRow';

export interface TrustListRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  version: number;
  trustee: string;
  truster: string;
  expiryTime: number;
  limit: number;
}