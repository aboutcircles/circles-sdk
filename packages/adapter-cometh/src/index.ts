import { SdkContractRunner, TransactionRequest, TransactionResponse } from '@circles-sdk/adapter';
import {
  ComethProvider,
  ComethWallet,
  ConnectAdaptor,
  SupportedNetworks
} from '@cometh/connect-sdk';
import { OperationType } from 'ethers-multisend';

export class ComethSdkContractRunner implements SdkContractRunner {
  private comethWallet: ComethWallet;
  private walletAdaptor: ConnectAdaptor;
  address: Promise<string>;

  constructor(apiKey: string, chainId: SupportedNetworks, walletAddress?: string) {
    this.walletAdaptor = new ConnectAdaptor({
      chainId,
      apiKey
    });

    this.comethWallet = new ComethWallet({
      authAdapter: this.walletAdaptor,
      apiKey
    });

    this.address = this.comethWallet.connect(walletAddress)
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
}