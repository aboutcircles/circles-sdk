export type CheckSendLimitInputs = {
  tokenOwner: string;
  src: string;
  dest: string;
};

export type InflateInputs = {
  _initial: bigint;
  _periods: bigint;
};

export type IssuanceByStepInputs = {
  _periods: bigint;
};

export type LimitsInputs = {
  arg0: string;
  arg1: string;
};

export type OrganizationsInputs = {
  arg0: string;
};

export type PowInputs = {
  base: bigint;
  exponent: bigint;
};

export type SeenInputs = {
  arg0: bigint;
};

export type TokenToUserInputs = {
  arg0: string;
};

export type TransferThroughInputs = {
  tokenOwners: string[];
  srcs: string[];
  dests: string[];
  wads: bigint[];
};

export type TrustInputs = {
  user: string;
  limit: bigint;
};

export type UserToTokenInputs = {
  arg0: string;
};

export type ValidationInputs = {
  arg0: string;
};

export type NoInputs = [];

export type V1HubFunctionInputs =
  | CheckSendLimitInputs
  | InflateInputs
  | IssuanceByStepInputs
  | LimitsInputs
  | OrganizationsInputs
  | PowInputs
  | SeenInputs
  | TokenToUserInputs
  | TransferThroughInputs
  | TrustInputs
  | UserToTokenInputs
  | ValidationInputs
  | NoInputs;
