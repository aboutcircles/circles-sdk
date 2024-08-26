import {SdkContractRunner, TransactionRequest, TransactionResponse} from '@circles-sdk/adapter';
import SafeAppsSDK from "@safe-global/safe-apps-sdk";

export class SafeSdkContractRunner implements SdkContractRunner {
    private safeSdk: SafeAppsSDK;

    constructor(safeSdk: SafeAppsSDK) {
        this.safeSdk = safeSdk;
    }

    address: Promise<string> = (async () => {
        return this.safeSdk.safe.getInfo().then((safe) => safe.safeAddress);
    })();

    async estimateGas(tx: TransactionRequest): Promise<bigint> {
        return Promise.resolve(0n);
    }

    async call(tx: TransactionRequest): Promise<string> {
        return this.safeSdk.eth.call([{
            to: tx.to,
            data: tx.data,
            value: tx.value.toString()
        }]);
    }

    async resolveName(name: string): Promise<string | null> {
        return null;
    }

    async sendTransaction(tx: TransactionRequest): Promise<TransactionResponse> {
        const sendTransactionsResponse = await this.safeSdk.txs.send({
            txs: [{
                to: tx.to,
                data: tx.data,
                value: tx.value.toString()
            }]
        });

        const txDetails = await this.safeSdk.txs.getBySafeTxHash(sendTransactionsResponse.safeTxHash);
        if (!txDetails.txHash) {
            throw new Error(`Couldn't determine the txHash for transaction with safe transaction hash ${sendTransactionsResponse.safeTxHash}`);
        }

        const txObj = await this.safeSdk.eth.getTransactionByHash([txDetails.txHash]);
        const chainInfo = await this.safeSdk.safe.getChainInfo();

        return {
            blockNumber: txObj.blockNumber!,
            blockHash: txObj.blockHash!,
            hash: txObj.hash,
            index: txObj.transactionIndex!,
            type: 0,
            to: txObj.to!,
            from: txObj.from,
            gasLimit: BigInt(txObj.gas),
            gasPrice: BigInt(txObj.gasPrice),
            data: tx.data,
            value: tx.value,
            chainId: parseInt(chainInfo.chainId),
        };
    }
}