import {
  AddressLike,
  BigNumberish,
  BrowserProvider,
  ContractRunner,
  Provider,
  TransactionRequest,
  TransactionResponse
} from 'ethers';
import { SdkContractRunner } from '@circles-sdk/adapter';

export abstract class EthersContractRunner implements ContractRunner {
  abstract address?: string;
  abstract provider: Provider | null;
  abstract estimateGas?: ((tx: TransactionRequest) => Promise<bigint>) | undefined;
  abstract call?: ((tx: TransactionRequest) => Promise<string>) | undefined;
  abstract resolveName?: ((name: string) => Promise<string | null>) | undefined;
  abstract sendTransaction?: ((tx: TransactionRequest) => Promise<TransactionResponse>) | undefined;

  abstract init(): Promise<void>;
}

export class BrowserProviderContractRunner implements EthersContractRunner {
  constructor() {
    const w: any = window;
    const ethereumObject = w.ethereum;
    if (!ethereumObject) {
      throw new Error('No provider found on window.ethereum');
    }
    this.provider = new BrowserProvider(ethereumObject);
  }

  async init(): Promise<void> {
    this.address = await (<BrowserProvider>this.provider).getSigner().then(signer => signer.getAddress());
  }

  address?: string;
  provider: Provider;
  estimateGas?: ((tx: TransactionRequest) => Promise<bigint>) | undefined = async (tx) => this.provider.estimateGas(tx);
  call?: ((tx: TransactionRequest) => Promise<string>) | undefined = async (tx) => this.provider.call(tx);
  resolveName?: ((name: string) => Promise<string | null>) | undefined = async (name) => this.provider.resolveName(name);
  sendTransaction?: ((tx: TransactionRequest) => Promise<TransactionResponse>) | undefined = async (tx) => {
    const signer = await (<BrowserProvider>this.provider).getSigner();
    return signer.sendTransaction(tx);
  };
}

/**
 * Takes an ethers6 provider and a sdk contract runner and creates a contract runner that can be used with ethers6
 * and thus with the typechahain generated ethers6 contract wrappers.
 */
export class SdkContractRunnerWrapper implements EthersContractRunner {
  /**
   * Creates a new EthersContractRunner. The provider is used to fetch the transaction details and the sdkContractRunner is used to execute the transactions.
   * @param provider The ethers6 provider
   * @param address The address of the account that signs transactions
   * @param sdkContractRunner The sdk contract runner
   */
  constructor(public provider: Provider, public address: string, private sdkContractRunner: SdkContractRunner) {
  }

  async init(): Promise<void> {
  }

  private async addressLikeToString(addressLike: AddressLike) {
    if (typeof addressLike === 'string') {
      return addressLike;
    }
    if (addressLike instanceof Promise) {
      return addressLike;
    }
    return addressLike.getAddress();
  }

  private bignumberishToBigInt(value?: BigNumberish | null) {
    if (!value) {
      return BigInt(0);
    }
    if (typeof value === 'bigint') {
      return value;
    }
    return BigInt(value);
  }

  estimateGas?: ((tx: TransactionRequest) => Promise<bigint>) | undefined = async (tx) => {
    if (!this.sdkContractRunner.estimateGas) {
      throw new Error('estimateGas not supported');
    }

    if (!tx.to) {
      throw new Error('to is required');
    }
    if (!tx.data && !tx.value) {
      throw new Error('data or value is required');
    }

    return this.sdkContractRunner.estimateGas({
      to: await this.addressLikeToString(tx.to),
      data: tx.data ?? '0x',
      value: this.bignumberishToBigInt(tx.value)
    });
  };

  call?: ((tx: TransactionRequest) => Promise<string>) | undefined = async (tx) => {
    if (!this.sdkContractRunner.call) {
      throw new Error('call not supported');
    }

    if (!tx.to) {
      throw new Error('to is required');
    }
    if (!tx.data && !tx.value) {
      throw new Error('data or value is required');
    }

    return this.sdkContractRunner.call({
      to: await this.addressLikeToString(tx.to),
      data: tx.data ?? '0x',
      value: this.bignumberishToBigInt(tx.value)
    });
  };
  resolveName?: ((name: string) => Promise<string | null>) | undefined;
  sendTransaction?: ((tx: TransactionRequest) => Promise<TransactionResponse>) | undefined = async (tx) => {
    if (!this.sdkContractRunner.sendTransaction) {
      throw new Error('sendTransaction not supported');
    }

    if (!tx.to) {
      throw new Error('to is required');
    }
    if (!tx.data && !tx.value) {
      throw new Error('data or value is required');
    }

    const response = await this.sdkContractRunner.sendTransaction({
      to: await this.addressLikeToString(tx.to),
      data: tx.data ?? '0x',
      value: this.bignumberishToBigInt(tx.value)
    });

    const transactionResponse = await this.provider.getTransaction(response.hash);
    if (!transactionResponse) {
      throw new Error('Transaction not found');
    }

    return transactionResponse;
  };
}