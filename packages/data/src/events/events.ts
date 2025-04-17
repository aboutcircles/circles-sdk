import { Address } from '@circles-sdk/utils';

// Base event type
export type CirclesBaseEvent = {
  $event: CirclesEventType,
  blockNumber: number;
  timestamp?: number;
  transactionIndex: number;
  logIndex: number;
  transactionHash?: string;
};

// Event types
export type CrcV1_HubTransfer = CirclesBaseEvent & {
  $event: 'CrcV1_HubTransfer',
  from?: Address;
  to?: Address;
  amount?: bigint;
};

export type CrcV1_Signup = CirclesBaseEvent & {
  $event: 'CrcV1_Signup',
  user?: Address;
  token?: Address;
};

export type CrcV1_OrganizationSignup = CirclesBaseEvent & {
  $event: 'CrcV1_OrganizationSignup',
  organization?: Address;
};

export type CrcV1_Trust = CirclesBaseEvent & {
  $event: 'CrcV1_Trust',
  canSendTo?: Address;
  user?: Address;
  limit?: bigint;
};

export type CrcV1_Transfer = CirclesBaseEvent & {
  $event: 'CrcV1_Transfer',
  tokenAddress?: Address;
  from?: Address;
  to?: Address;
  amount?: bigint;
};

export type CrcV1_TransferSummary = CirclesBaseEvent & {
  $event: 'CrcV1_TransferSummary',
  from?: string;
  to?: string;
  amount?: bigint;
  events?: string;
};

export type CrcV1_UpdateMetadataDigest = CirclesBaseEvent & {
  $event: 'CrcV1_UpdateMetadataDigest',
  avatar?: Address;
  metadataDigest?: Uint8Array;
};

export type CrcV2_InviteHuman = CirclesBaseEvent & {
  $event: 'CrcV2_InviteHuman',
  inviter?: Address;
  invited?: Address;
};

export type CrcV2_PersonalMint = CirclesBaseEvent & {
  $event: 'CrcV2_PersonalMint',
  human?: string;
  amount?: bigint;
  startPeriod?: bigint;
  endPeriod?: bigint;
};

export type CrcV2_RegisterGroup = CirclesBaseEvent & {
  $event: 'CrcV2_RegisterGroup',
  group?: Address;
  mint?: string;
  treasury?: Address;
  name?: string;
  symbol?: string;
};

export type CrcV2_RegisterHuman = CirclesBaseEvent & {
  $event: 'CrcV2_RegisterHuman',
  avatar?: Address;
  inviter?: Address;
};

export type CrcV2_RegisterOrganization = CirclesBaseEvent & {
  $event: 'CrcV2_RegisterOrganization',
  organization?: Address;
  name?: string;
};

export type CrcV2_Stopped = CirclesBaseEvent & {
  $event: 'CrcV2_Stopped',
  avatar?: Address;
};

export type CrcV2_Trust = CirclesBaseEvent & {
  $event: 'CrcV2_Trust',
  truster?: Address;
  trustee?: Address;
  expiryTime?: bigint;
};

export type CrcV2_TransferSingle = CirclesBaseEvent & {
  $event: 'CrcV2_TransferSingle',
  operator?: string;
  from?: Address;
  to?: Address;
  id?: bigint;
  value?: bigint;
};

export type CrcV2_URI = CirclesBaseEvent & {
  $event: 'CrcV2_URI',
  value?: string;
  id?: bigint;
};

export type CrcV2_ApprovalForAll = CirclesBaseEvent & {
  $event: 'CrcV2_ApprovalForAll',
  account?: string;
  operator?: string;
  approved?: boolean;
};

export type CrcV2_TransferBatch = CirclesBaseEvent & {
  $event: 'CrcV2_TransferBatch',
  batchIndex: number;
  operator?: string;
  from?: Address;
  to?: Address;
  id?: bigint;
  value?: bigint;
};

export type CrcV2_RegisterShortName = CirclesBaseEvent & {
  $event: 'CrcV2_RegisterShortName',
  avatar?: Address;
  shortName?: bigint;
  nonce?: bigint;
};

export type CrcV2_UpdateMetadataDigest = CirclesBaseEvent & {
  $event: 'CrcV2_UpdateMetadataDigest',
  avatar?: Address;
  metadataDigest?: Uint8Array;
};

export type CrcV2_CidV0 = CirclesBaseEvent & {
  $event: 'CrcV2_CidV0',
  avatar?: Address;
  cidV0Digest?: Uint8Array;
};

export type CrcV2_StreamCompleted = CirclesBaseEvent & {
  $event: 'CrcV2_StreamCompleted',
  operator?: string;
  from?: Address;
  to?: Address;
  id?: bigint;
  amount?: bigint;
};

export type CrcV2_CreateVault = CirclesBaseEvent & {
  $event: 'CrcV2_CreateVault',
  group?: Address;
  vault?: string;
};

export type CrcV2_CollateralLockedSingle = CirclesBaseEvent & {
  $event: 'CrcV2_CollateralLockedSingle',
  group?: Address;
  id?: bigint;
  value?: bigint;
  userData?: Uint8Array;
};

export type CrcV2_CollateralLockedBatch = CirclesBaseEvent & {
  $event: 'CrcV2_CollateralLockedBatch',
  batchIndex: number;
  group?: Address;
  id?: bigint;
  value?: bigint;
  userData?: Uint8Array;
};

export type CrcV2_GroupRedeem = CirclesBaseEvent & {
  $event: 'CrcV2_GroupRedeem',
  group?: Address;
  id?: bigint;
  value?: bigint;
  data?: Uint8Array;
};
export type CrcV2_GroupRedeemCollateralReturn = CirclesBaseEvent & {
  $event: 'CrcV2_GroupRedeemCollateralReturn',
  batchIndex: number;
  group?: Address;
  to?: Address;
  id?: bigint;
  value?: bigint;
};

export type CrcV2_GroupRedeemCollateralBurn = CirclesBaseEvent & {
  $event: 'CrcV2_GroupRedeemCollateralBurn',
  batchIndex: number;
  group?: Address;
  id?: bigint;
  value?: bigint;
};

export type CrcV2_DepositDemurraged = CirclesBaseEvent & {
  $event: 'CrcV2_DepositDemurraged',
  account?: string;
  amount?: bigint;
  inflationaryAmount?: bigint;
};

export type CrcV2_DepositInflationary = CirclesBaseEvent & {
  $event: 'CrcV2_DepositInflationary',
  account?: string;
  amount?: bigint;
  demurragedAmount?: bigint;
};

export type CrcV2_WithdrawDemurraged = CirclesBaseEvent & {
  $event: 'CrcV2_WithdrawDemurraged',
  account?: string;
  amount?: bigint;
  inflationaryAmount?: bigint;
};

export type CrcV2_WithdrawInflationary = CirclesBaseEvent & {
  $event: 'CrcV2_WithdrawInflationary',
  account?: string;
  amount?: bigint;
  demurragedAmount?: bigint;
};

export type CrcV2_Erc20WrapperTransfer = CirclesBaseEvent & {
  $event: 'CrcV2_Erc20WrapperTransfer',
  tokenAddress?: Address;
  from?: Address;
  to?: Address;
  amount?: bigint;
};

export type CrcV2_ERC20WrapperDeployed = CirclesBaseEvent & {
  $event: 'CrcV2_ERC20WrapperDeployed',
  avatar?: Address;
  erc20Wrapper?: string;
  circlesType?: number;
};

export type CrcV2_DiscountCost = CirclesBaseEvent & {
  $event: 'CrcV2_DiscountCost',
  account?: string;
  id?: bigint;
  cost?: bigint;
};

export type CrcV2_TransferSummary = Omit<CrcV1_TransferSummary, '$event'> & {
  $event: 'CrcV2_TransferSummary'
};

export type CrcV2_FlowEdgesScopeLastEnded = CirclesBaseEvent & {
  $event: 'CrcV2_FlowEdgesScopeLastEnded'
};

export type CrcV2_FlowEdgesScopeSingleStarted = CirclesBaseEvent & {
  $event: 'CrcV2_FlowEdgesScopeSingleStarted',
  flowEdgeId?: bigint;
  streamId?: bigint;
};

export type CrcV2_BaseGroupCreated = CirclesBaseEvent & {
  $event: 'CrcV2_BaseGroupCreated';
  group: Address;
  owner: Address;
  mintHandler: Address;
  treasury: Address;
};

export type CrcV2_BaseGroupOwnerUpdated = CirclesBaseEvent & {
  $event: 'CrcV2_BaseGroupOwnerUpdated';
  emitter: Address;
  owner: Address;
};

export type CrcV2_BaseGroupServiceUpdated = CirclesBaseEvent & {
  $event: 'CrcV2_BaseGroupServiceUpdated';
  emitter: Address;
  newService: Address;
};

export type CrcV2_BaseGroupFeeCollectionUpdated = CirclesBaseEvent & {
  $event: 'CrcV2_BaseGroupFeeCollectionUpdated';
  emitter: Address;
  feeCollection: Address;
};

export type Crc_UnknownEvent = CirclesBaseEvent & {
  $event: 'Crc_UnknownEvent',
  originalEventType: string;
};

export type Safe_AddedOwner = CirclesBaseEvent & {
  $event: 'Safe_AddedOwner',
  safeAddress?: string;
  owner?: string;
};

export type Safe_ProxyCreation = CirclesBaseEvent & {
  $event: 'Safe_ProxyCreation',
  proxy?: string;
  singleton?: string;
};

export type Safe_RemovedOwner = CirclesBaseEvent & {
  $event: 'Safe_RemovedOwner',
  safeAddress?: string;
  owner?: string;
};

export type Safe_SafeSetup = CirclesBaseEvent & {
  $event: 'Safe_SafeSetup',
  safeAddress?: string;
  initiator?: string;
  owner?: string;
  threshold?: bigint;
  initializer?: string;
  fallbackHandler?: string;
};

export type CirclesEvent =
  | CrcV1_HubTransfer
  | CrcV1_Signup
  | CrcV1_OrganizationSignup
  | CrcV1_Trust
  | CrcV1_Transfer
  | CrcV1_TransferSummary
  | CrcV1_UpdateMetadataDigest
  | CrcV2_InviteHuman
  | CrcV2_PersonalMint
  | CrcV2_RegisterGroup
  | CrcV2_RegisterHuman
  | CrcV2_RegisterOrganization
  | CrcV2_Stopped
  | CrcV2_Trust
  | CrcV2_TransferSingle
  | CrcV2_Erc20WrapperTransfer
  | CrcV2_ERC20WrapperDeployed
  | CrcV2_URI
  | CrcV2_ApprovalForAll
  | CrcV2_TransferBatch
  | CrcV2_RegisterShortName
  | CrcV2_UpdateMetadataDigest
  | CrcV2_CidV0
  | CrcV2_StreamCompleted
  | CrcV2_CreateVault
  | CrcV2_CollateralLockedSingle
  | CrcV2_CollateralLockedBatch
  | CrcV2_GroupRedeem
  | CrcV2_GroupRedeemCollateralReturn
  | CrcV2_GroupRedeemCollateralBurn
  | CrcV2_DepositDemurraged
  | CrcV2_DepositInflationary
  | CrcV2_WithdrawDemurraged
  | CrcV2_WithdrawInflationary
  | CrcV2_DiscountCost
  | CrcV2_TransferSummary
  | CrcV2_FlowEdgesScopeLastEnded
  | CrcV2_FlowEdgesScopeSingleStarted
  | CrcV2_BaseGroupCreated
  | CrcV2_BaseGroupOwnerUpdated
  | CrcV2_BaseGroupServiceUpdated
  | CrcV2_BaseGroupFeeCollectionUpdated
  | Crc_UnknownEvent
  | Safe_AddedOwner
  | Safe_ProxyCreation
  | Safe_RemovedOwner
  | Safe_SafeSetup;

export type CirclesEventType =
  | 'CrcV1_HubTransfer'
  | 'CrcV1_Signup'
  | 'CrcV1_OrganizationSignup'
  | 'CrcV1_Trust'
  | 'CrcV1_Transfer'
  | 'CrcV1_TransferSummary'
  | 'CrcV1_UpdateMetadataDigest'
  | 'CrcV2_InviteHuman'
  | 'CrcV2_PersonalMint'
  | 'CrcV2_RegisterGroup'
  | 'CrcV2_RegisterHuman'
  | 'CrcV2_RegisterOrganization'
  | 'CrcV2_Stopped'
  | 'CrcV2_Trust'
  | 'CrcV2_TransferSingle'
  | 'CrcV2_Erc20WrapperTransfer'
  | 'CrcV2_URI'
  | 'CrcV2_ApprovalForAll'
  | 'CrcV2_TransferBatch'
  | 'CrcV2_RegisterShortName'
  | 'CrcV2_UpdateMetadataDigest'
  | 'CrcV2_CidV0'
  | 'CrcV2_StreamCompleted'
  | 'CrcV2_CreateVault'
  | 'CrcV2_CollateralLockedSingle'
  | 'CrcV2_CollateralLockedBatch'
  | 'CrcV2_GroupRedeem'
  | 'CrcV2_GroupRedeemCollateralReturn'
  | 'CrcV2_GroupRedeemCollateralBurn'
  | 'CrcV2_DepositDemurraged'
  | 'CrcV2_DepositInflationary'
  | 'CrcV2_WithdrawDemurraged'
  | 'CrcV2_WithdrawInflationary'
  | 'CrcV2_ERC20WrapperDeployed'
  | 'CrcV2_DiscountCost'
  | 'CrcV2_TransferSummary'
  | 'CrcV2_FlowEdgesScopeLastEnded'
  | 'CrcV2_FlowEdgesScopeSingleStarted'
  | 'CrcV2_BaseGroupCreated'
  | 'CrcV2_BaseGroupOwnerUpdated'
  | 'CrcV2_BaseGroupServiceUpdated'
  | 'CrcV2_BaseGroupFeeCollectionUpdated'
  | 'Crc_UnknownEvent'
  | 'Safe_AddedOwner'
  | 'Safe_ProxyCreation'
  | 'Safe_RemovedOwner'
  | 'Safe_SafeSetup';
