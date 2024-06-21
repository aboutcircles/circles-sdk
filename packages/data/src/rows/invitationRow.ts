import { EventRow } from '../pagedQuery/eventRow';

export interface InvitationRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  inviter: string;
  invited: string;
}