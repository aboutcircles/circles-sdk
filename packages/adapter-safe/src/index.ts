import {
  BatchRun,
  SdkContractRunner, TransactionRequest as SdkTransactionRequest,
  TransactionRequest, TransactionResponse as SdkTransactionResponse
} from '@circles-sdk/adapter';
import Safe, {SafeConfig, EthSafeTransaction} from "@safe-global/protocol-kit";
import {BrowserProvider, Eip1193Provider, ethers, Provider} from "ethers";
import {MetaTransaction, OperationType} from "ethers-multisend";
import { Address, handleTransactionError } from '@circles-sdk/utils';

export class SafeSdkPrivateKeyContractRunner implements SdkContractRunner {
  address?: Address;
  safe?: Safe;
  private rpcUrl: string;
  private privateKey: string;

  constructor(privateKey: string, rpcUrl: string) {
    this.privateKey = privateKey;
    this.rpcUrl = rpcUrl;
    this.provider = new ethers.JsonRpcProvider(this.rpcUrl);
  }

  async init(safeAddress: Address): Promise<void> {
    this.address = safeAddress;
    this.safe = await Safe.init({
      provider: this.rpcUrl,
      signer: this.privateKey,
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
    const txResponse = await this.safe.executeTransaction(txs)
      .catch(error => {
        handleTransactionError(error)
      });
    return <SdkTransactionResponse><unknown>txResponse.transactionResponse;
  };
  sendBatchTransaction?: () => BatchRun = () => {
    if (!this.safe) {
      throw new Error("Not initialized");
    }
    return new SafeBatchRun(this.safe);
  }
}

export class SafeSdkBrowserContractRunner implements SdkContractRunner {
  address?: Address;
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

  async init(safeAddress: Address): Promise<void> {
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

    const txResponse = await this.safe.executeTransaction(txs)
      .catch(error => {
        handleTransactionError(error)
      });
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

  async getTxCalldata (): Promise<EthSafeTransaction> {
    const metaTransactions: MetaTransaction[] = this.transactions.map(tx => ({
      operation: OperationType.Call,
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    }));
    
    const tx = await this.safe.createTransaction({
      transactions: metaTransactions
    });

    return tx;
  }

  async run() {
    const txCallData = await this.getTxCalldata();
    const txReceipt = await this.safe.executeTransaction(txCallData)
      .catch(error => {
        handleTransactionError(error);
      });

    if (!txReceipt) {
      throw new Error("Transaction failed");
    }

    return <SdkTransactionResponse><unknown>txReceipt.transactionResponse;
  }
}