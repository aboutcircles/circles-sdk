import { Address } from '@circles-sdk/utils';
import { EventRow } from '../pagedQuery/eventRow';

export interface InvitationRow extends EventRow {
  timestamp: number;
  transactionHash: string;
  inviter: Address;
  invited: Address;
}