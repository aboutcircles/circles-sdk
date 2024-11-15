import {
  BatchRun,
  SdkContractRunner,
  TransactionRequest,
  TransactionResponse
} from '@circles-sdk/adapter';
import {BiconomySmartAccountV2, createSmartAccountClient} from "@biconomy/account";
import {ethers} from "ethers";

export class BiconomySdkContractRunner implements SdkContractRunner {
  private smartAccount?: BiconomySmartAccountV2;
  address?: string;
  private apiKey?: string;
  private bundlerUrl: string;
  private provider?: ethers.BrowserProvider;

  constructor(apiKey: string, bundlerUrl: string) {
    this.apiKey = apiKey;
    this.bundlerUrl = bundlerUrl;
  }

  init = async () => {
    const ethereum = (<any>window).ethereum;
    this.provider = new ethers.BrowserProvider(ethereum);
    await this.provider.send("eth_requestAccounts", []);
    const signer = await this.provider.getSigner();
    this.smartAccount = await createSmartAccountClient({
      signer,
      bundlerUrl: this.bundlerUrl,
      biconomyPaymasterApiKey: this.apiKey,
    });
    this.address = await this.smartAccount.getAccountAddress();
  }

  estimateGas?: ((tx: TransactionRequest) => Promise<bigint>) | undefined = async (tx) => {
    const gasEstimate = await this.smartAccount?.getGasEstimate([{
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    }]);
    if (!gasEstimate) {
      throw new Error('Failed to estimate gas');
    }
    return gasEstimate;
  };
  call?: ((tx: TransactionRequest) => Promise<string>) | undefined = async (tx) => {
    const result = await this.provider?.call({
      to: tx.to,
      data: tx.data,
    });

    if (!result) {
      throw new Error('Failed to call');
    }

    return result;
  }
  resolveName?: ((name: string) => Promise<string | null>) | undefined = async (name) => {
    const result = await this.provider?.resolveName(name);
    if (!result) {
      throw new Error('Failed to resolve name');
    }
    return result;
  }
  sendTransaction?: ((tx: TransactionRequest) => Promise<TransactionResponse>) | undefined = async (tx) => {
    const userOpResponse = await this.smartAccount?.sendTransaction({
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    });

    if (!userOpResponse) {
      throw new Error('Failed to send transaction');
    }

    const userOpReceipt = await userOpResponse.wait();
    return {
      blockNumber: userOpReceipt.receipt.blockNumber,
      blockHash: userOpReceipt.receipt.blockHash,
      index: userOpReceipt.receipt.transactionIndex,
      hash: userOpReceipt.receipt.transactionHash,
      type: userOpReceipt.receipt.type,
      to: tx.to,
      from: userOpReceipt.receipt.from,
      gasLimit: BigInt(userOpReceipt.receipt.gasUsed.toString()),
      gasPrice: BigInt(userOpReceipt.receipt.effectiveGasPrice.toString()),
      data: '',
      value: BigInt(tx.value.toString()),
      chainId: 100
    };
  };

  sendBatchTransaction() {
    if (!this.smartAccount) {
      throw new Error('Smart account not initialized');
    }
    return new BiconomyBatchRun(this.smartAccount);
  }
}

export class BiconomyBatchRun implements BatchRun {
  private readonly transactions: TransactionRequest[] = [];

  constructor(
    private readonly smartAccount: BiconomySmartAccountV2) {
  }

  addTransaction(tx: TransactionRequest) {
    this.transactions.push(tx);
  }

  async run() {
    const txResponse = await this.smartAccount.sendTransaction(this.transactions.map(tx => ({
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    })));

    const txReceipt = await txResponse.wait();

    return <TransactionResponse>{
      blockNumber: txReceipt.receipt.blockNumber,
      blockHash: txReceipt.receipt.blockHash,
      index: txReceipt.receipt.transactionIndex,
      hash: txReceipt.receipt.transactionHash,
      type: txReceipt.receipt.type,
      to: txReceipt.receipt.to,
      from: txReceipt.receipt.from,
      gasLimit: BigInt(txReceipt.receipt.gasUsed.toString()),
      gasPrice: BigInt(txReceipt.receipt.effectiveGasPrice.toString()),
      data: '',
      value: BigInt(0),
      chainId: 100
    };
  }
}