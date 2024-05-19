import { Avatar } from './avatar';
import { V1Hub } from '@circles-sdk/abi-v1';
import { V2Hub } from '@circles-sdk/abi-v2';
import { ethers } from 'ethers';
import { ChainConfig } from './chainConfig';
import { CirclesData, Rpc } from '@circles-sdk/data';

export class Sdk {
  private readonly provider: ethers.BaseWallet;

  public readonly chainConfig: ChainConfig;

  public readonly circlesRpc: Rpc;
  public readonly data: CirclesData;
  public readonly v1Hub: V1Hub;
  public readonly v2Hub: V2Hub;

  constructor(chainConfig: ChainConfig, provider: ethers.BaseWallet) {
    this.provider = provider;
    this.chainConfig = chainConfig;

    this.circlesRpc = new Rpc(chainConfig.circlesRpcUrl);
    this.data = new CirclesData(this.circlesRpc);
    this.v1Hub = new V1Hub(provider, chainConfig.v1HubAddress);
    this.v2Hub = new V2Hub(provider, chainConfig.v2HubAddress);
  }

  getAvatar = async (avatarAddress: string) =>
    new Avatar(
      this.v1Hub
      , this.v2Hub
      , this.data
      , avatarAddress
      , this.chainConfig.migrationAddress
      , this.provider);
}