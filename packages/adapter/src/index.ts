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
  address?: string,
  /**
   * A function that, when provided, handles sending a batch transaction.
   * The function should return an instance of `BatchRun`, which encapsulates
   * the behavior and state of the batch transaction process.
   *
   * @typedef {Function} sendBatchTransaction
   * @returns {BatchRun} An instance of `BatchRun` representing the batch transaction.
   * @remarks This function should be implemented in a way
   */
  sendBatchTransaction?: () => BatchRun;
};

/**
 * Uses the MultiSend contract and MetaTransactions to send multiple transactions in a single transaction.
 * You will get one receipt for all transactions.
 *
 * Methods:
 *
 * @method addTransaction
 * Adds a transaction to the batch run. The transaction is specified by a TransactionRequest object.
 *
 * @param {TransactionRequest} tx - The transaction to be added to the batch run.
 *
 * @method run
 * Executes all the transactions in the batch run. Returns a promise that resolves to a ContractTransactionReceipt.
 *
 * @returns {Promise<ContractTransactionReceipt>} A promise that resolves to the receipt of the contract transaction.
 */
export interface BatchRun {
  addTransaction: (tx: TransactionRequest) => void;
  run: () => Promise<TransactionResponse>;
}