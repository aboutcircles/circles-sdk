import { V2HubCalls } from './V2HubEncoders';
import { ParsedV2HubEvent, V2HubEvent, V2HubEvents } from './V2HubEvents';
import { ethers, TransactionRequest, TransactionResponse } from 'ethers';
import { Observable } from "./common";

export class V2Hub {
  readonly address: string;
  private readonly provider: ethers.Provider;
  
  private readonly eventDecoder: V2HubEvents = new V2HubEvents();
  public readonly events: Observable<ParsedV2HubEvent<V2HubEvent>>;
  private readonly emitEvent: (event: ParsedV2HubEvent<V2HubEvent>) => void;

  private callEncoder: V2HubCalls = new V2HubCalls(); 

  constructor(provider: ethers.Provider, address: string) {
      this.provider = provider;
      this.address = address;
      
  
      const events = Observable.create<ParsedV2HubEvent<V2HubEvent>>();
      this.events = events.property;
      this.emitEvent = events.emit;
  
  }
  
  private sendTransaction(request: TransactionRequest) : Promise<TransactionResponse> {
    if (!this.provider.sendTransaction) {
      throw new Error('sendTransaction not available on this provider');
    }
    return this.provider.sendTransaction(request);
  }
  
  avatars = async (arg0: string): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.avatars({ arg0: arg0 })
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
balanceOf = async (_account: string, _id: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.balanceOf({ _account: _account, _id: _id })
    }));
    };
balanceOfBatch = async (_accounts: string[], _ids: bigint[]): Promise<bigint[]> => {
      return ethers.AbiCoder.defaultAbiCoder().decode(["uint256[]"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.balanceOfBatch({ _accounts: _accounts, _ids: _ids })
    }))[0].map((x:any) => BigInt(x));
    };
balanceOfOnDay = async (_account: string, _id: bigint, _day: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.balanceOfOnDay({ _account: _account, _id: _id, _day: _day })
    }));
    };
calculateIssuance = async (_human: string): Promise<[bigint, bigint, bigint]> => {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256", "uint256", "uint256"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.calculateIssuance({ _human: _human })
    }));
return [BigInt(decoded[0]), BigInt(decoded[1]), BigInt(decoded[2])];
    };
convertBatchInflationaryToDemurrageValues = async (_inflationaryValues: bigint[], _day: bigint): Promise<bigint[]> => {
      return ethers.AbiCoder.defaultAbiCoder().decode(["uint256[]"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.convertBatchInflationaryToDemurrageValues({ _inflationaryValues: _inflationaryValues, _day: _day })
    }))[0].map((x:any) => BigInt(x));
    };
convertInflationaryToDemurrageValue = async (_inflationaryValue: bigint, _day: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.convertInflationaryToDemurrageValue({ _inflationaryValue: _inflationaryValue, _day: _day })
    }));
    };
day = async (_timestamp: bigint): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.day({ _timestamp: _timestamp })
    }));
    };
discountedBalances = async (arg0: bigint, arg1: string): Promise<[bigint, bigint]> => {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint192", "uint64"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.discountedBalances({ arg0: arg0, arg1: arg1 })
    }));
return [BigInt(decoded[0]), BigInt(decoded[1])];
    };
hubV1 = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.hubV1()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
inflationDayZero = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.inflationDayZero()
    }));
    };
invitationOnlyTime = async (): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.invitationOnlyTime()
    }));
    };
isApprovedForAll = async (_account: string, _operator: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.isApprovedForAll({ _account: _account, _operator: _operator })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
isGroup = async (_group: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.isGroup({ _group: _group })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
isHuman = async (_human: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.isHuman({ _human: _human })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
isOrganization = async (_organization: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.isOrganization({ _organization: _organization })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
isTrusted = async (_truster: string, _trustee: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.isTrusted({ _truster: _truster, _trustee: _trustee })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
liftERC20 = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.liftERC20()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
migration = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.migration()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
mintPolicies = async (arg0: string): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.mintPolicies({ arg0: arg0 })
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
mintTimes = async (arg0: string): Promise<[string, bigint]> => {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address", "uint96"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.mintTimes({ arg0: arg0 })
    }));
return [await (async () => { const val = decoded[0]; return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })(), BigInt(decoded[1])];
    };
nameRegistry = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.nameRegistry()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
standardTreasury = async (): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.standardTreasury()
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
stopped = async (_human: string): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.stopped({ _human: _human })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
supportsInterface = async (_interfaceId: Uint8Array): Promise<boolean> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.supportsInterface({ _interfaceId: _interfaceId })
    }) === '0x0000000000000000000000000000000000000000000000000000000000000001';
    };
toTokenId = async (_avatar: string): Promise<bigint> => {
      return BigInt(await this.provider.call({
      to: this.address,
      data: this.callEncoder.toTokenId({ _avatar: _avatar })
    }));
    };
treasuries = async (arg0: string): Promise<string> => {
      return await (async () => { const val = await this.provider.call({
      to: this.address,
      data: this.callEncoder.treasuries({ arg0: arg0 })
    }); return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })();
    };
trustMarkers = async (arg0: string, arg1: string): Promise<[string, bigint]> => {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address", "uint96"], await this.provider.call({
      to: this.address,
      data: this.callEncoder.trustMarkers({ arg0: arg0, arg1: arg1 })
    }));
return [await (async () => { const val = decoded[0]; return val == "0x" ? ethers.ZeroAddress : ethers.getAddress(val.slice(-40)); })(), BigInt(decoded[1])];
    };
uri = async (_id: bigint): Promise<string> => {
      return await this.provider.call({
      to: this.address,
      data: this.callEncoder.uri({ _id: _id })
    });
    };
  burn = async (_id: bigint, _amount: bigint, _data: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.burn({ _id: _id, _amount: _amount, _data: _data })
      });
      return tx.wait();
    }

calculateIssuanceWithCheck = async (_human: string): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.calculateIssuanceWithCheck({ _human: _human })
      });
      return tx.wait();
    }

groupMint = async (_group: string, _collateralAvatars: string[], _amounts: bigint[], _data: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.groupMint({ _group: _group, _collateralAvatars: _collateralAvatars, _amounts: _amounts, _data: _data })
      });
      return tx.wait();
    }

inviteHuman = async (_human: string): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.inviteHuman({ _human: _human })
      });
      return tx.wait();
    }

migrate = async (_owner: string, _avatars: string[], _amounts: bigint[]): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.migrate({ _owner: _owner, _avatars: _avatars, _amounts: _amounts })
      });
      return tx.wait();
    }

operateFlowMatrix = async (_flowVertices: string[], _flow: any[], _streams: any[], _packedCoordinates: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.operateFlowMatrix({ _flowVertices: _flowVertices, _flow: _flow, _streams: _streams, _packedCoordinates: _packedCoordinates })
      });
      return tx.wait();
    }

personalMint = async (): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.personalMint()
      });
      return tx.wait();
    }

registerCustomGroup = async (_mint: string, _treasury: string, _name: string, _symbol: string, _cidV0Digest: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.registerCustomGroup({ _mint: _mint, _treasury: _treasury, _name: _name, _symbol: _symbol, _cidV0Digest: _cidV0Digest })
      });
      return tx.wait();
    }

registerGroup = async (_mint: string, _name: string, _symbol: string, _cidV0Digest: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.registerGroup({ _mint: _mint, _name: _name, _symbol: _symbol, _cidV0Digest: _cidV0Digest })
      });
      return tx.wait();
    }

registerHuman = async (_cidV0Digest: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.registerHuman({ _cidV0Digest: _cidV0Digest })
      });
      return tx.wait();
    }

registerOrganization = async (_name: string, _cidV0Digest: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.registerOrganization({ _name: _name, _cidV0Digest: _cidV0Digest })
      });
      return tx.wait();
    }

safeBatchTransferFrom = async (_from: string, _to: string, _ids: bigint[], _values: bigint[], _data: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.safeBatchTransferFrom({ _from: _from, _to: _to, _ids: _ids, _values: _values, _data: _data })
      });
      return tx.wait();
    }

safeTransferFrom = async (_from: string, _to: string, _id: bigint, _value: bigint, _data: Uint8Array): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.safeTransferFrom({ _from: _from, _to: _to, _id: _id, _value: _value, _data: _data })
      });
      return tx.wait();
    }

setApprovalForAll = async (_operator: string, _approved: boolean): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.setApprovalForAll({ _operator: _operator, _approved: _approved })
      });
      return tx.wait();
    }

stop = async (): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.stop()
      });
      return tx.wait();
    }

trust = async (_trustReceiver: string, _expiry: bigint): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.trust({ _trustReceiver: _trustReceiver, _expiry: _expiry })
      });
      return tx.wait();
    }

wrap = async (_avatar: string, _amount: bigint, _type: bigint): Promise<ethers.TransactionReceipt | null> => {
       const tx = await this.sendTransaction({
         to: this.address,
         data: this.callEncoder.wrap({ _avatar: _avatar, _amount: _amount, _type: _type })
      });
      return tx.wait();
    }

}
