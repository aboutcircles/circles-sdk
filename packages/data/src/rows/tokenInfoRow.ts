import { EventRow } from '../pagedQuery/eventRow';

export interface TokenInfoRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  version: number;
  type: "human" | "group";
  avatar: string;
  tokenId: string;
}