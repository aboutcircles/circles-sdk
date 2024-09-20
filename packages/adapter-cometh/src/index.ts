import {
  BatchRun,
  SdkContractRunner,
  TransactionRequest,
  TransactionResponse
} from '@circles-sdk/adapter';
import {
  ComethProvider,
  ComethWallet,
  ConnectAdaptor,
  SupportedNetworks
} from '@cometh/connect-sdk';
import {MetaTransaction, OperationType} from 'ethers-multisend';

export class ComethSdkContractRunner implements SdkContractRunner {
  private comethWallet: ComethWallet;
  private walletAdaptor: ConnectAdaptor;
  address?: string;

  constructor(apiKey: string, chainId: SupportedNetworks, walletAddress?: string) {
    this.walletAdaptor = new ConnectAdaptor({
      chainId,
      apiKey
    });

    this.comethWallet = new ComethWallet({
      authAdapter: this.walletAdaptor,
      apiKey
    });

    this.address = walletAddress;
  }

  init = async () => {
    this.address = await this.comethWallet.connect(this.address)
      .then(() => this.comethWallet.getAddress())
      .catch((error) => Promise.reject(error));
  }

  estimateGas?: ((tx: TransactionRequest) => Promise<bigint>) | undefined = async (tx) => {
    const bigNumber = await this.comethWallet.getProvider().estimateGas(tx);
    return BigInt(bigNumber.toString());
  };
  call?: ((tx: TransactionRequest) => Promise<string>) | undefined = async (tx) => this.comethWallet.getProvider().call(tx);
  resolveName?: ((name: string) => Promise<string | null>) | undefined = async (name) => this.comethWallet.getProvider().resolveName(name);
  sendTransaction?: ((tx: TransactionRequest) => Promise<TransactionResponse>) | undefined = async (tx) => {
    const provider = new ComethProvider(this.comethWallet);
    console.log(`Sending transaction to ${tx.to}`, tx);
    const network = await provider.getNetwork();
    const sendTxResponse = await this.comethWallet.sendTransaction({
      operation: OperationType.Call,
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    });
    const txPending = await provider.getTransaction(sendTxResponse.safeTxHash);
    const txReceipt = await txPending.wait();
    return {
      blockNumber: txReceipt.blockNumber,
      blockHash: txReceipt.blockHash,
      index: txReceipt.transactionIndex,
      hash: txReceipt.transactionHash,
      type: txReceipt.type,
      to: tx.to,
      from: txReceipt.from,
      gasLimit: BigInt(txReceipt.gasUsed.toString()),
      gasPrice: BigInt(txReceipt.effectiveGasPrice.toString()),
      data: '',
      value: BigInt(tx.value.toString()),
      chainId: network.chainId
    };
  };
  sendBatchTransaction?: () => BatchRun = () => {
    return new ComethBatchRun(this.comethWallet);
  }
}

export class ComethBatchRun implements BatchRun {
  private readonly transactions: TransactionRequest[] = [];

  constructor(
    private readonly comethWallet: ComethWallet) {
  }

  addTransaction(tx: TransactionRequest) {
    this.transactions.push(tx);
  }

  async run() {
    const provider = new ComethProvider(this.comethWallet);
    const network = await provider.getNetwork();
    const metaTransactions: MetaTransaction[] = this.transactions.map(tx => ({
      operation: OperationType.Call,
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data
    }));
    const batchTxResponse = await this.comethWallet.sendBatchTransactions(metaTransactions);
    const txPending = await provider.getTransaction(batchTxResponse.safeTxHash);
    const txReceipt = await txPending.wait();

    return <TransactionResponse>{
      blockNumber: txReceipt.blockNumber,
      blockHash: txReceipt.blockHash,
      index: txReceipt.transactionIndex,
      hash: txReceipt.transactionHash,
      type: txReceipt.type,
      to: txReceipt.to,
      from: txReceipt.from,
      gasLimit: BigInt(txReceipt.gasUsed.toString()),
      gasPrice: BigInt(txReceipt.effectiveGasPrice.toString()),
      data: '',
      value: BigInt(0),
      chainId: network.chainId
    };
  }
}