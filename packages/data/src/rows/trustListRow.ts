import { Address } from '@circles-sdk/utils';
import { EventRow } from '../pagedQuery/eventRow';

export interface TrustListRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  version: number;
  trustee: Address;
  truster: Address;
  expiryTime: number;
  limit: number;
}