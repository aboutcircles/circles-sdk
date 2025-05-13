import { EventRow } from '../pagedQuery/eventRow';

export interface GroupRow extends EventRow {
  group: string;
  type: 'CrcV2_CMGroupCreated' | 'CrcV2_BaseGroupCreated' | 'CrcV2_RegisterGroup';
  owner?: string;
  mintPolicy: string;
  mintHandler?: string;
  treasury: string;
  service?: string;
  feeCollection?: string;
  name: string;
  symbol: string;
  cidV0Digest: string;
  memberCount: number;
  isMember?: boolean; // Can be set by the client to indicate membership of the current avatar
  erc20WrapperDemurraged?: string;
  erc20WrapperStatic?: string;
}
