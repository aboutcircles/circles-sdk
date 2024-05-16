export type AdvancedUsageFlagsInputs = {
  arg0: string;
};

export type AvatarsInputs = {
  arg0: string;
};

export type BalanceOfInputs = {
  _account: string;
  _id: bigint;
};

export type BalanceOfBatchInputs = {
  _accounts: string[];
  _ids: bigint[];
};

export type BalanceOfOnDayInputs = {
  _account: string;
  _id: bigint;
  _day: bigint;
};

export type BurnInputs = {
  _id: bigint;
  _amount: bigint;
  _data: Uint8Array;
};

export type CalculateIssuanceInputs = {
  _human: string;
};

export type CalculateIssuanceWithCheckInputs = {
  _human: string;
};

export type ConvertBatchInflationaryToDemurrageValuesInputs = {
  _inflationaryValues: bigint[];
  _day: bigint;
};

export type ConvertInflationaryToDemurrageValueInputs = {
  _inflationaryValue: bigint;
  _day: bigint;
};

export type DayInputs = {
  _timestamp: bigint;
};

export type GroupMintInputs = {
  _group: string;
  _collateralAvatars: string[];
  _amounts: bigint[];
  _data: Uint8Array;
};

export type InviteHumanInputs = {
  _human: string;
};

export type IsApprovedForAllInputs = {
  _account: string;
  _operator: string;
};

export type IsGroupInputs = {
  _group: string;
};

export type IsHumanInputs = {
  _human: string;
};

export type IsOrganizationInputs = {
  _organization: string;
};

export type IsPermittedFlowInputs = {
  _to: string;
  _circlesAvatar: string;
};

export type IsTrustedInputs = {
  _truster: string;
  _trustee: string;
};

export type MigrateInputs = {
  _owner: string;
  _avatars: string[];
  _amounts: bigint[];
};

export type MintPoliciesInputs = {
  arg0: string;
};

export type OperateFlowMatrixInputs = {
  _flowVertices: string[];
  _flow: any[];
  _streams: any[];
  _packedCoordinates: Uint8Array;
};

export type RegisterCustomGroupInputs = {
  _mint: string;
  _treasury: string;
  _name: string;
  _symbol: string;
  _metatdataDigest: Uint8Array;
};

export type RegisterGroupInputs = {
  _mint: string;
  _name: string;
  _symbol: string;
  _metatdataDigest: Uint8Array;
};

export type RegisterHumanInputs = {
  _metatdataDigest: Uint8Array;
};

export type RegisterOrganizationInputs = {
  _name: string;
  _metatdataDigest: Uint8Array;
};

export type SafeBatchTransferFromInputs = {
  _from: string;
  _to: string;
  _ids: bigint[];
  _values: bigint[];
  _data: Uint8Array;
};

export type SafeTransferFromInputs = {
  _from: string;
  _to: string;
  _id: bigint;
  _value: bigint;
  _data: Uint8Array;
};

export type SetAdvancedUsageFlagInputs = {
  _flag: Uint8Array;
};

export type SetApprovalForAllInputs = {
  _operator: string;
  _approved: boolean;
};

export type StoppedInputs = {
  _human: string;
};

export type SupportsInterfaceInputs = {
  _interfaceId: Uint8Array;
};

export type ToTokenIdInputs = {
  _avatar: string;
};

export type TotalSupplyInputs = {
  _id: bigint;
};

export type TreasuriesInputs = {
  arg0: string;
};

export type TrustInputs = {
  _trustReceiver: string;
  _expiry: bigint;
};

export type TrustMarkersInputs = {
  arg0: string;
  arg1: string;
};

export type UriInputs = {
  arg0: bigint;
};

export type WrapInputs = {
  _avatar: string;
  _amount: bigint;
  _type: bigint;
};

export type NoInputs = [];
  
export type V2HubFunctionInputs = 
  | AdvancedUsageFlagsInputs
  | AvatarsInputs
  | BalanceOfInputs
  | BalanceOfBatchInputs
  | BalanceOfOnDayInputs
  | BurnInputs
  | CalculateIssuanceInputs
  | CalculateIssuanceWithCheckInputs
  | ConvertBatchInflationaryToDemurrageValuesInputs
  | ConvertInflationaryToDemurrageValueInputs
  | DayInputs
  | GroupMintInputs
  | InviteHumanInputs
  | IsApprovedForAllInputs
  | IsGroupInputs
  | IsHumanInputs
  | IsOrganizationInputs
  | IsPermittedFlowInputs
  | IsTrustedInputs
  | MigrateInputs
  | MintPoliciesInputs
  | OperateFlowMatrixInputs
  | RegisterCustomGroupInputs
  | RegisterGroupInputs
  | RegisterHumanInputs
  | RegisterOrganizationInputs
  | SafeBatchTransferFromInputs
  | SafeTransferFromInputs
  | SetAdvancedUsageFlagInputs
  | SetApprovalForAllInputs
  | StoppedInputs
  | SupportsInterfaceInputs
  | ToTokenIdInputs
  | TotalSupplyInputs
  | TreasuriesInputs
  | TrustInputs
  | TrustMarkersInputs
  | UriInputs
  | WrapInputs
  | NoInputs;
