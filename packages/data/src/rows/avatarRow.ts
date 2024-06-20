import { EventRow } from '../pagedQuery/eventRow';

export interface AvatarRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  version: number;
  type: string;
  avatar: string;
  tokenId: string;
  hasV1: boolean;
  v1Token: string;

  // Currently only set in avatar initialization
  v1Stopped?: boolean;
}