import { EventRow } from '../pagedQuery/eventRow';

export interface GroupMembershipRow extends EventRow {
  group: string;
  member: string;
  expiryTime: bigint;
}