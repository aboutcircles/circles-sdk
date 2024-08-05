export type TransactionRequest = {
  readonly to: string;
  readonly value: bigint;
  readonly data: string;
}

export type TransactionResponse = {
  blockNumber: number;
  blockHash: string;
  index: number;
  hash: string;
  type: number;
  to: string;
  from: string;
  gasLimit: bigint;
  gasPrice: bigint;
  data: string;
  value: bigint;
  chainId: number;
}

export type SdkContractRunner = {
  /**
   *  Required to estimate gas.
   */
  estimateGas?: (tx: TransactionRequest) => Promise<bigint>;

  /**
   * Required for pure, view or static calls to contracts.
   */
  call?: (tx: TransactionRequest) => Promise<string>;

  /**
   *  Required to support ENS names
   */
  resolveName?: (name: string) => Promise<null | string>;

  /**
   *  Required for state mutating calls
   */
  sendTransaction?: (tx: TransactionRequest) => Promise<TransactionResponse>;
  /**
   * The address of the account that signs transactions.
   */
  address: Promise<string>,
};