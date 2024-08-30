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
    $event: "CrcV1_HubTransfer",
    from?: string;
    to?: string;
    amount?: bigint;
};

export type CrcV1_Signup = CirclesBaseEvent & {
    $event: "CrcV1_Signup",
    user?: string;
    token?: string;
};

export type CrcV1_OrganizationSignup = CirclesBaseEvent & {
    $event: "CrcV1_OrganizationSignup",
    organization?: string;
};

export type CrcV1_Trust = CirclesBaseEvent & {
    $event: "CrcV1_Trust",
    canSendTo?: string;
    user?: string;
    limit?: bigint;
};

export type CrcV1_Transfer = CirclesBaseEvent & {
    $event: "CrcV1_Transfer",
    tokenAddress?: string;
    from?: string;
    to?: string;
    amount?: bigint;
};

export type CrcV2_InviteHuman = CirclesBaseEvent & {
    $event: "CrcV2_InviteHuman",
    inviter?: string;
    invited?: string;
};

export type CrcV2_PersonalMint = CirclesBaseEvent & {
    $event: "CrcV2_PersonalMint",
    human?: string;
    amount?: bigint;
    startPeriod?: bigint;
    endPeriod?: bigint;
};

export type CrcV2_RegisterGroup = CirclesBaseEvent & {
    $event: "CrcV2_RegisterGroup",
    group?: string;
    mint?: string;
    treasury?: string;
    name?: string;
    symbol?: string;
};

export type CrcV2_RegisterHuman = CirclesBaseEvent & {
    $event: "CrcV2_RegisterHuman",
    avatar?: string;
};

export type CrcV2_RegisterOrganization = CirclesBaseEvent & {
    $event: "CrcV2_RegisterOrganization",
    organization?: string;
    name?: string;
};

export type CrcV2_Stopped = CirclesBaseEvent & {
    $event: "CrcV2_Stopped",
    avatar?: string;
};

export type CrcV2_Trust = CirclesBaseEvent & {
    $event: "CrcV2_Trust",
    truster?: string;
    trustee?: string;
    expiryTime?: bigint;
};

export type CrcV2_TransferSingle = CirclesBaseEvent & {
    $event: "CrcV2_TransferSingle",
    operator?: string;
    from?: string;
    to?: string;
    id?: bigint;
    value?: bigint;
};

export type CrcV2_URI = CirclesBaseEvent & {
    $event: "CrcV2_URI",
    value?: string;
    id?: bigint;
};

export type CrcV2_ApprovalForAll = CirclesBaseEvent & {
    $event: "CrcV2_ApprovalForAll",
    account?: string;
    operator?: string;
    approved?: boolean;
};

export type CrcV2_TransferBatch = CirclesBaseEvent & {
    $event: "CrcV2_TransferBatch",
    batchIndex: number;
    operator?: string;
    from?: string;
    to?: string;
    id?: bigint;
    value?: bigint;
};

export type CrcV2_RegisterShortName = CirclesBaseEvent & {
    $event: "CrcV2_RegisterShortName",
    avatar?: string;
    shortName?: bigint;
    nonce?: bigint;
};

export type CrcV2_UpdateMetadataDigest = CirclesBaseEvent & {
    $event: "CrcV2_UpdateMetadataDigest",
    avatar?: string;
    metadataDigest?: Uint8Array;
};

export type CrcV2_CidV0 = CirclesBaseEvent & {
    $event: "CrcV2_CidV0",
    avatar?: string;
    cidV0Digest?: Uint8Array;
};

export type CrcV2_StreamCompleted = CirclesBaseEvent & {
    $event: "CrcV2_StreamCompleted",
    operator?: string;
    from?: string;
    to?: string;
    id?: bigint;
    amount?: bigint;
};

export type CrcV2_CreateVault = CirclesBaseEvent & {
    $event: "CrcV2_CreateVault",
    group?: string;
    vault?: string;
};

export type CrcV2_GroupMintSingle = CirclesBaseEvent & {
    $event: "CrcV2_GroupMintSingle",
    group?: string;
    id?: bigint;
    value?: bigint;
    userData?: Uint8Array;
};

export type CrcV2_GroupMintBatch = CirclesBaseEvent & {
    $event: "CrcV2_GroupMintBatch",
    batchIndex: number;
    group?: string;
    id?: bigint;
    value?: bigint;
    userData?: Uint8Array;
};

export type CrcV2_GroupRedeem = CirclesBaseEvent & {
    $event: "CrcV2_GroupRedeem",
    group?: string;
    id?: bigint;
    value?: bigint;
    data?: Uint8Array;
};
export type CrcV2_GroupRedeemCollateralReturn = CirclesBaseEvent & {
    $event: "CrcV2_GroupRedeemCollateralReturn",
    batchIndex: number;
    group?: string;
    to?: string;
    id?: bigint;
    value?: bigint;
};

export type CrcV2_GroupRedeemCollateralBurn = CirclesBaseEvent & {
    $event: "CrcV2_GroupRedeemCollateralBurn",
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
