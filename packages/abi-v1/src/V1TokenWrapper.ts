import { V1TokenCalls } from './V1TokenEncoders';
import { ParsedV1TokenEvent, V1TokenEvent, V1TokenEvents } from './V1TokenEvents';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { Observable } from './common';

export class V1Token {
  readonly address: string;
  private readonly provider: ethers.AbstractSigner;

  private readonly eventDecoder: V1TokenEvents = new V1TokenEvents();
  public readonly events: Observable<ParsedV1TokenEvent<V1TokenEvent>>;
  private readonly emitEvent: (event: ParsedV1TokenEvent<V1TokenEvent>) => void;

  private callEncoder: V1TokenCalls = new V1TokenCalls();

  constructor(provider: ethers.AbstractSigner, address: string) {
    this.provider = provider;
    this.address = address;


    const events = Observable.create<ParsedV1TokenEvent<V1TokenEvent>>();
    this.events = events.property;
    this.emitEvent = events.emit;

  }
  
  private sendTransaction(request: TransactionRequest): Promise<TransactionResponse> {
    if (!this.provider.sendTransaction) {
      throw new Error('sendTransaction not available on this provider');
    }
    return this.provider.sendTransaction(request);
  }

  allowance = async (owner: string, spender: string): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.allowance({ owner: owner, spender: spender })
    }));
  };
  balanceOf = async (account: string): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.balanceOf({ account: account })
    }));
  };
  currentIssuance = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.currentIssuance()
    }));
  };
  decimals = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.decimals()
    }));
  };
  findInflationOffset = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.findInflationOffset()
    }));
  };
  hub = async (): Promise<string> => {
    return await (async () => {
      const val = await this.provider.call({
        to: this.address,
        data: this.callEncoder.hub()
      });
      return val == '0x' ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40));
    })();
  };
  hubDeployedAt = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.hubDeployedAt()
    }));
  };
  inflationOffset = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.inflationOffset()
    }));
  };
  lastTouched = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.lastTouched()
    }));
  };
  look = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.look()
    }));
  };
  name = async (): Promise<string> => {
    return await this.provider.call({
      to: this.address,
      data: this.callEncoder.name()
    });
  };
  owner = async (): Promise<string> => {
    return await (async () => {
      const val = await this.provider.call({
        to: this.address,
        data: this.callEncoder.owner()
      });
      return val == '0x' ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40));
    })();
  };
  period = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.period()
    }));
  };
  periods = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.periods()
    }));
  };
  periodsWhenLastTouched = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.periodsWhenLastTouched()
    }));
  };
  stopped = async (): Promise<boolean> => {
    return await this.provider.call({
      to: this.address,
      data: this.callEncoder.stopped()
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
  };
  symbol = async (): Promise<string> => {
    return await this.provider.call({
      to: this.address,
      data: this.callEncoder.symbol()
    });
  };
  time = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.time()
    }));
  };
  timeout = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.timeout()
    }));
  };
  totalSupply = async (): Promise<bigint> => {
    return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.totalSupply()
    }));
  };
  approve = async (spender: string, amount: bigint): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.approve({ spender: spender, amount: amount })
    });
    return tx.wait();
  };

  decreaseAllowance = async (spender: string, subtractedValue: bigint): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.decreaseAllowance({
        spender: spender,
        subtractedValue: subtractedValue
      })
    });
    return tx.wait();
  };

  hubTransfer = async (from: string, to: string, amount: bigint): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.hubTransfer({ from: from, to: to, amount: amount })
    });
    return tx.wait();
  };

  increaseAllowance = async (spender: string, addedValue: bigint): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.increaseAllowance({ spender: spender, addedValue: addedValue })
    });
    return tx.wait();
  };

  stop = async (): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.stop()
    });
    return tx.wait();
  };

  transfer = async (dst: string, wad: bigint): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.transfer({ dst: dst, wad: wad })
    });
    return tx.wait();
  };

  transferFrom = async (sender: string, recipient: string, amount: bigint): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.transferFrom({ sender: sender, recipient: recipient, amount: amount })
    });
    return tx.wait();
  };

  update = async (): Promise<ethers.TransactionReceipt | null> => {
    const tx = await this.sendTransaction({
      to: this.address,
      data: this.callEncoder.update()
    });
    return tx.wait();
  };

}
