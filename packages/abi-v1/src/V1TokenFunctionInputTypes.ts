export type AllowanceInputs = {
  owner: string;
  spender: string;
};

export type ApproveInputs = {
  spender: string;
  amount: bigint;
};

export type BalanceOfInputs = {
  account: string;
};

export type DecreaseAllowanceInputs = {
  spender: string;
  subtractedValue: bigint;
};

export type HubTransferInputs = {
  from: string;
  to: string;
  amount: bigint;
};

export type IncreaseAllowanceInputs = {
  spender: string;
  addedValue: bigint;
};

export type TransferInputs = {
  dst: string;
  wad: bigint;
};

export type TransferFromInputs = {
  sender: string;
  recipient: string;
  amount: bigint;
};

export type NoInputs = [];

export type V1TokenFunctionInputs =
  | AllowanceInputs
  | ApproveInputs
  | BalanceOfInputs
  | DecreaseAllowanceInputs
  | HubTransferInputs
  | IncreaseAllowanceInputs
  | TransferInputs
  | TransferFromInputs
  | NoInputs;
