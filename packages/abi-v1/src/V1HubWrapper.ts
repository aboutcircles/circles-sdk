import { V1HubCalls } from './V1HubEncoders';
import { ParsedV1HubEvent, V1HubEvent, V1HubEvents } from './V1HubEvents';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { Observable } from "./common";

export class V1Hub {
  readonly address: string;
  private readonly provider: ethers.AbstractSigner;
  
  private readonly eventDecoder: V1HubEvents = new V1HubEvents();
  public readonly events: Observable<ParsedV1HubEvent<V1HubEvent>>;
  private readonly emitEvent: (event: ParsedV1HubEvent<V1HubEvent>) => void;

  private callEncoder: V1HubCalls = new V1HubCalls(); 

  constructor(provider: ethers.AbstractSigner, address: string) {
      this.provider = provider;
      this.address = address;
      
  
      const events = Observable.create<ParsedV1HubEvent<V1HubEvent>>();
      this.events = events.property;
      this.emitEvent = events.emit;
  
  }
  
  private sendTransaction(request: TransactionRequest) : Promise<TransactionResponse> {
    if (!this.provider.sendTransaction) {
      throw new Error('sendTransaction not available on this provider');
    }
    return this.provider.sendTransaction(request);
  }
  
  checkSendLimit = async (tokenOwner: string, src: string, dest: string): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.checkSendLimit({ tokenOwner: tokenOwner, src: src, dest: dest })
    }));
    };
deployedAt = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.deployedAt()
    }));
    };
divisor = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.divisor()
    }));
    };
inflate = async (_initial: bigint, _periods: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.inflate({ _initial: _initial, _periods: _periods })
    }));
    };
inflation = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.inflation()
    }));
    };
initialIssuance = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.initialIssuance()
    }));
    };
issuance = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.issuance()
    }));
    };
issuanceByStep = async (_periods: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.issuanceByStep({ _periods: _periods })
    }));
    };
limits = async (arg0: string, arg1: string): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.limits({ arg0: arg0, arg1: arg1 })
    }));
    };
name = async (): Promise<string> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.name()
    });
    };
organizations = async (arg0: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.organizations({ arg0: arg0 })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
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
pow = async (base: bigint, exponent: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.pow({ base: base, exponent: exponent })
    }));
    };
seen = async (arg0: bigint): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.seen({ arg0: arg0 })
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
signupBonus = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.signupBonus()
    }));
    };
symbol = async (): Promise<string> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.symbol()
    });
    };
timeout = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.timeout()
    }));
    };
tokenToUser = async (arg0: string): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.tokenToUser({ arg0: arg0 })
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
userToToken = async (arg0: string): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.userToToken({ arg0: arg0 })
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
validation = async (arg0: string): Promise<[boolean, bigint, bigint]> => {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["bool", "uint256", "uint256"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.validation({ arg0: arg0 })
    }));
return [decoded[0] === '0x0000000000000000000000000000000000000000000000000000000000000001', BigInt(decoded[1]), BigInt(decoded[2])];
    };
  organizationSignup = async (): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.organizationSignup()
      });
      return tx.wait();
    }

signup = async (): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.signup()
      });
      return tx.wait();
    }

transferThrough = async (tokenOwners: string[], srcs: string[], dests: string[], wads: bigint[]): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.transferThrough({ tokenOwners: tokenOwners, srcs: srcs, dests: dests, wads: wads })
      });
      return tx.wait();
    }

trust = async (user: string, limit: bigint): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.trust({ user: user, limit: limit })
      });
      return tx.wait();
    }

}
