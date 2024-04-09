import { Avatar } from './avatar';
import { V1Hub } from '@circles-sdk/abi-v1';
import { V2Hub } from '@circles-sdk/abi-v2';
import { ethers } from 'ethers';

export class Sdk {
  private readonly provider: ethers.Provider;

  public readonly hubV1Address: string;
  public readonly v1Hub: V1Hub;

  public readonly hubV2Address: string;
  public readonly v2Hub: V2Hub;

  public readonly migrationAddress: string;

  public readonly rpcUrl: string;

  constructor(hubV1Address: string, hubV2Address: string, migrationAddress:string, provider: ethers.Provider, rpcUrl:string) {
    this.provider = provider;

    this.hubV1Address = hubV1Address;
    this.v1Hub = new V1Hub(provider, hubV1Address);

    this.hubV2Address = hubV2Address;
    this.v2Hub = new V2Hub(provider, hubV2Address);

    this.migrationAddress = migrationAddress;
    this.rpcUrl = rpcUrl;
  }

  // getInvitationFee = async () =>
  //   (await this.v2Hub.WELCOME_BONUS()) * BigInt(2);

  isRegistrationPeriodOver: () => Promise<boolean> = async () =>
    (await this.v2Hub.invitationOnlyTime()) < BigInt(Date.now() / 1000);

  getAvatar = async (avatarAddress: string) =>
    new Avatar(this.v1Hub, this.v2Hub, avatarAddress, this.migrationAddress, this.provider, this.rpcUrl);
}