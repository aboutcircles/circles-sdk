import {
  BatchRun,
  SdkContractRunner, TransactionRequest as SdkTransactionRequest,
  TransactionRequest, TransactionResponse as SdkTransactionResponse
} from '@circles-sdk/adapter';
import Safe, {SafeConfig} from "@safe-global/protocol-kit";
import {BrowserProvider, Eip1193Provider, Provider} from "ethers";
import {MetaTransaction, OperationType} from "ethers-multisend";

export class SafeSdkBrowserContractRunner implements SdkContractRunner {
  address?: string;
  browserProvider: BrowserProvider;
  safe?: Safe;
  eip1193Provider: Eip1193Provider;

  constructor() {
    const w: any = window;
    const ethereumObject = w.ethereum;
    if (!ethereumObject) {
      throw new Error('No provider found on window.ethereum');
    }
    this.eip1193Provider = ethereumObject;
    this.browserProvider = new BrowserProvider(this.eip1193Provider);
    this.provider = this.browserProvider;
  }

  async init(safeAddress: string): Promise<void> {
    this.address = safeAddress;
    this.safe = await Safe.init(<SafeConfig>{
      provider: {
        request: (<any>window).ethereum.request
      },
      safeAddress: safeAddress
    });
  }

  provider: Provider;
  estimateGas?: ((tx: SdkTransactionRequest) => Promise<bigint>) | undefined = async (tx) => this.provider.estimateGas(tx);
  call?: ((tx: SdkTransactionRequest) => Promise<string>) | undefined = async (tx) => this.provider.call(tx);
  resolveName?: ((name: string) => Promise<string | null>) | undefined = async (name) => this.provider.resolveName(name);
  sendTransaction?: ((tx: SdkTransactionRequest) => Promise<SdkTransactionResponse>) | undefined = async (tx) => {
    if (!this.safe) {
      throw new Error("Safe not initialized")
    }
    const txs = await this.safe.createTransaction({
      transactions: [{
        to: tx.to,
        value: (tx.value?.toString() ?? "0"),
        data: tx.data
      }]
    });
    const txResponse = await this.safe.executeTransaction(txs);
    return <SdkTransactionResponse><unknown>txResponse.transactionResponse;
  };
  sendBatchTransaction?: () => BatchRun = () => {
    if (!this.safe) {
      throw new Error("Not initialized");
    }
    return new SafeBatchRun(this.safe);
  }
}


export class SafeBatchRun implements BatchRun {
  private readonly transactions: TransactionRequest[] = [];

  constructor(
    private readonly safe: Safe) {
  }

  addTransaction(tx: TransactionRequest) {
    this.transactions.push(tx);
  }

  async run() {
    const metaTransactions: MetaTransaction[] = this.transactions.map(tx => ({
      operation: OperationType.Call,
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    }));

    const tx = await this.safe.createTransaction({
      transactions: metaTransactions
    });
    const txReceipt = await this.safe.executeTransaction(tx);
    if (!txReceipt) {
      throw new Error("Transaction failed");
    }

    return <SdkTransactionResponse><unknown>txReceipt.transactionResponse;
  }
}