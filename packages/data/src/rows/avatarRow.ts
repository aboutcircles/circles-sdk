import { Row } from '../pagedQuery/row';

export interface AvatarRow extends Row {
  timestamp: number;
  transactionHash: string;
  version: number;
  type: string;
  avatar: string;
  tokenId: string;
}