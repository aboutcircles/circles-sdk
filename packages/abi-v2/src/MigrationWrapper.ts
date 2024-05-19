import { MigrationCalls } from './MigrationEncoders';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { Observable } from "./common";

export class Migration {
  readonly address: string;
  private readonly provider: ethers.BaseWallet;
  

  private callEncoder: MigrationCalls = new MigrationCalls(); 

  constructor(provider: ethers.BaseWallet, address: string) {
      this.provider = provider;
      this.address = address;
      
  
  }
  
  private sendTransaction(request: TransactionRequest) : Promise<TransactionResponse> {
    if (!this.provider.sendTransaction) {
      throw new Error('sendTransaction not available on this provider');
    }
    return this.provider.sendTransaction(request);
  }
  
  convertFromV1ToDemurrage = async (_amount: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.convertFromV1ToDemurrage({ _amount: _amount })
    }));
    };
hubV1 = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.hubV1()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
hubV2 = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.hubV2()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
inflationDayZero = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.inflationDayZero()
    }));
    };
period = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.period()
    }));
    };
  migrate = async (_avatars: string[], _amounts: bigint[]): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.migrate({ _avatars: _avatars, _amounts: _amounts })
      });
      return tx.wait();
    }

}
