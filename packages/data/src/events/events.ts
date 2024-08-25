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
    from?: string;
    to?: string;
    amount?: bigint;
};

export type CrcV1_Signup = CirclesBaseEvent & {
    user?: string;
    token?: string;
};

export type CrcV1_OrganizationSignup = CirclesBaseEvent & {
    organization?: string;
};

export type CrcV1_Trust = CirclesBaseEvent & {
    canSendTo?: string;
    user?: string;
    limit?: bigint;
};

export type CrcV1_Transfer = CirclesBaseEvent & {
    tokenAddress?: string;
    from?: string;
    to?: string;
    amount?: bigint;
};

export type CrcV2_InviteHuman = CirclesBaseEvent & {
    inviter?: string;
    invited?: string;
};

export type CrcV2_PersonalMint = CirclesBaseEvent & {
    human?: string;
    amount?: bigint;
    startPeriod?: bigint;
    endPeriod?: bigint;
};

export type CrcV2_RegisterGroup = CirclesBaseEvent & {
    group?: string;
    mint?: string;
    treasury?: string;
    name?: string;
    symbol?: string;
};

export type CrcV2_RegisterHuman = CirclesBaseEvent & {
    avatar?: string;
};

export type CrcV2_RegisterOrganization = CirclesBaseEvent & {
    organization?: string;
    name?: string;
};

export type CrcV2_Stopped = CirclesBaseEvent & {
    avatar?: string;
};

export type CrcV2_Trust = CirclesBaseEvent & {
    truster?: string;
    trustee?: string;
    expiryTime?: bigint;
};

export type CrcV2_TransferSingle = CirclesBaseEvent & {
    operator?: string;
    from?: string;
    to?: string;
    id?: bigint;
    value?: bigint;
};

export type CrcV2_URI = CirclesBaseEvent & {
    value?: string;
    id?: bigint;
};

export type CrcV2_ApprovalForAll = CirclesBaseEvent & {
    account?: string;
    operator?: string;
    approved?: boolean;
};

export type CrcV2_TransferBatch = CirclesBaseEvent & {
    batchIndex: number;
    operator?: string;
    from?: string;
    to?: string;
    id?: bigint;
    value?: bigint;
};

export type CrcV2_RegisterShortName = CirclesBaseEvent & {
    avatar?: string;
    shortName?: bigint;
    nonce?: bigint;
};

export type CrcV2_UpdateMetadataDigest = CirclesBaseEvent & {
    avatar?: string;
    metadataDigest?: Uint8Array;
};

export type CrcV2_CidV0 = CirclesBaseEvent & {
    avatar?: string;
    cidV0Digest?: Uint8Array;
};

export type CrcV2_StreamCompleted = CirclesBaseEvent & {
    operator?: string;
    from?: string;
    to?: string;
    id?: bigint;
    amount?: bigint;
};

export type CrcV2_CreateVault = CirclesBaseEvent & {
    group?: string;
    vault?: string;
};

export type CrcV2_GroupMintSingle = CirclesBaseEvent & {
    group?: string;
    id?: bigint;
    value?: bigint;
    userData?: Uint8Array;
};

export type CrcV2_GroupMintBatch = CirclesBaseEvent & {
    batchIndex: number;
    group?: string;
    id?: bigint;
    value?: bigint;
    userData?: Uint8Array;
};

export type CrcV2_GroupRedeem = CirclesBaseEvent & {
    group?: string;
    id?: bigint;
    value?: bigint;
    data?: Uint8Array;
};
export type CrcV2_GroupRedeemCollateralReturn = CirclesBaseEvent & {
    batchIndex: number;
    group?: string;
    to?: string;
    id?: bigint;
    value?: bigint;
};

export type CrcV2_GroupRedeemCollateralBurn = CirclesBaseEvent & {
    batchIndex: number;
    group?: string;
    id?: bigint;
    value?: bigint;
};

export type CirclesEvent =
    | CrcV1_HubTransfer
    | CrcV1_Signup
    | CrcV1_OrganizationSignup
    | CrcV1_Trust
    | CrcV1_Transfer
    | CrcV2_InviteHuman
    | CrcV2_PersonalMint
    | CrcV2_RegisterGroup
    | CrcV2_RegisterHuman
    | CrcV2_RegisterOrganization
    | CrcV2_Stopped
    | CrcV2_Trust
    | CrcV2_TransferSingle
    | CrcV2_URI
    | CrcV2_ApprovalForAll
    | CrcV2_TransferBatch
    | CrcV2_RegisterShortName
    | CrcV2_UpdateMetadataDigest
    | CrcV2_CidV0
    | CrcV2_StreamCompleted
    | CrcV2_CreateVault
    | CrcV2_GroupMintSingle
    | CrcV2_GroupMintBatch
    | CrcV2_GroupRedeem
    | CrcV2_GroupRedeemCollateralReturn
    | CrcV2_GroupRedeemCollateralBurn;

export type CirclesEventType =
    | 'CrcV1_HubTransfer'
    | 'CrcV1_Signup'
    | 'CrcV1_OrganizationSignup'
    | 'CrcV1_Trust'
    | 'CrcV1_Transfer'
    | 'CrcV2_InviteHuman'
    | 'CrcV2_PersonalMint'
    | 'CrcV2_RegisterGroup'
    | 'CrcV2_RegisterHuman'
    | 'CrcV2_RegisterOrganization'
    | 'CrcV2_Stopped'
    | 'CrcV2_Trust'
    | 'CrcV2_TransferSingle'
    | 'CrcV2_URI'
    | 'CrcV2_ApprovalForAll'
    | 'CrcV2_TransferBatch'
    | 'CrcV2_RegisterShortName'
    | 'CrcV2_UpdateMetadataDigest'
    | 'CrcV2_CidV0'
    | 'CrcV2_StreamCompleted'
    | 'CrcV2_CreateVault'
    | 'CrcV2_GroupMintSingle'
    | 'CrcV2_GroupMintBatch'
    | 'CrcV2_GroupRedeem'
    | 'CrcV2_GroupRedeemCollateralReturn'
    | 'CrcV2_GroupRedeemCollateralBurn';
