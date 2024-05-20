import { ethers, TransactionReceipt } from 'ethers';
import { ObservableProperty } from '../observableProperty';
import { V1Hub } from '@circles-sdk/abi-v1';
import { V1Token } from '@circles-sdk/abi-v1';

export enum V1AvatarState {
  NotInitialized,
  Unregistered,
  Human,
  StoppedHuman,
  Organization
}

export class V1Avatar {
  private readonly provider: ethers.AbstractSigner;
  private readonly v1Hub: V1Hub;
  private readonly avatarAddress: string;

  get v1Token(): V1Token | undefined {
    return this._v1Token;
  }

  private _v1Token?: V1Token;

  public readonly state: ObservableProperty<V1AvatarState>;
  private readonly setState: (state: V1AvatarState) => void;

  constructor(v1Hub: V1Hub, avatarAddress: string, provider: ethers.AbstractSigner) {
    this.v1Hub = v1Hub;
    this.avatarAddress = avatarAddress;
    this.provider = provider;

    const stateProperty = ObservableProperty.create<V1AvatarState>();
    this.state = stateProperty.property;
    this.setState = stateProperty.emit;
  }

  async initialize() {
    const [isOrganization, tokenAddress] = await Promise.all([
      this.v1Hub.organizations(this.avatarAddress),
      this.v1Hub.userToToken(this.avatarAddress)
    ]);

    let newState: V1AvatarState = isOrganization
      ? V1AvatarState.Organization
      : V1AvatarState.Unregistered;

    this._v1Token = tokenAddress && tokenAddress != ethers.ZeroAddress
      ? new V1Token(this.provider, tokenAddress)
      : undefined;

    if (this.v1Token) {
      newState = V1AvatarState.Human;

      const stopped = await this.v1Token.stopped();
      if (stopped) {
        newState = V1AvatarState.StoppedHuman;
      }
    }

    this.setState(newState);
  }

  async transfer(to: string, amount: bigint): Promise<TransactionReceipt> {
    // TODO: Validate inputs
    // const transferPath: TransferPath = await calculatePath({
    //   from: this.avatarAddress,
    //   to,
    //   amount: amount
    // });
    //
    // return await this.v1Hub.transferThrough(
    //   transferPath.path.map(step => step.tokenOwner),
    //   transferPath.path.map(step => step.from),
    //   transferPath.path.map(step => step.to),
    //   transferPath.path.map(step => step.amount)
    // );

    throw new Error("Not implemented");
  }

  async trust(avatar: string) {
    return await this.v1Hub.trust(avatar, BigInt(100));
  }

  async untust(avatar: string) {
    return await this.v1Hub.trust(avatar, BigInt(0));
  }
}