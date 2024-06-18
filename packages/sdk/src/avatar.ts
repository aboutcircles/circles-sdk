import { V1Avatar } from './v1/v1Avatar';
import { ContractTransactionResponse } from 'ethers';
import { Sdk } from './sdk';
import { AvatarInterface, AvatarInterfaceV2 } from './AvatarInterface';
import {
  AvatarRow,
  CirclesQuery,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { V2Avatar } from './v2/v2Avatar';

// export type AvatarEvent =
//   ParsedV1HubEvent<V1HubEvent>
//   | ParsedV1TokenEvent<V1TokenEvent>;

/**
 * An Avatar represents a user registered at Circles.
 * It provides methods to interact with the Circles protocol, such as minting, transferring and trusting other avatars.
 */
export class Avatar implements AvatarInterfaceV2 {

  public readonly address: string;

  /**
   * The actual avatar implementation to use behind this facade.
   * @private
   */
  private _avatar: AvatarInterface | undefined;
  private _avatarInfo: AvatarRow | undefined;
  private _sdk: Sdk;

  // public readonly events: Observable<AvatarEvent>;
  // private readonly emitEvent: (event: AvatarEvent) => void;

  get avatarInfo(): AvatarRow | undefined {
    return this._avatarInfo;
  }

  private _tokenEventSubscription?: () => void = undefined;

  constructor(sdk: Sdk, avatarAddress: string) {
    this.address = avatarAddress.toLowerCase();
    this._sdk = sdk;

    // TODO: re-implement events
    // const eventsProperty = Observable.create<AvatarEvent>();
    // this.events = eventsProperty.property;
    // this.emitEvent = eventsProperty.emit;
    // sdk.v1Hub.events.subscribe(this.emitEvent);
  }

  /**
   * Initializes the avatar.
   */
  initialize = async () => {
    if (this._tokenEventSubscription) {
      this._tokenEventSubscription();
    }

    this._avatarInfo = await this._sdk.data.getAvatarInfo(this.address);
    if (!this._avatarInfo) {
      throw new Error('Avatar is not signed up at Circles');
    }

    if (this._avatarInfo.version === 1) {
      this._avatar = new V1Avatar(this._sdk, this._avatarInfo);
    } else if (this._avatarInfo.version === 2) {
      this._avatar = new V2Avatar(this._sdk, this._avatarInfo);
    } else {
      throw new Error('Unsupported avatar');
    }
  };

  private onlyIfInitialized<T>(func: () => T) {
    if (!this._avatar) {
      throw new Error('Avatar is not initialized');
    }
    return func();
  }

  private onlyIfV2<T>(func: (avatar: AvatarInterfaceV2) => T) {
    if (!this._avatar || this._avatarInfo?.version !== 2) {
      throw new Error('Avatar is not initialized or is not a v2 avatar');
    }
    return func(<AvatarInterfaceV2>this._avatar);
  }

  getMintableAmount = (): Promise<bigint> => this.onlyIfInitialized(() => this._avatar!.getMintableAmount());
  personalMint = (): Promise<ContractTransactionResponse> => this.onlyIfInitialized(() => this._avatar!.personalMint());
  stop = (): Promise<ContractTransactionResponse> => this.onlyIfInitialized(() => this._avatar!.stop());
  getMaxTransferableAmount = (to: string): Promise<bigint> => this.onlyIfInitialized(() => this._avatar!.getMaxTransferableAmount(to));
  transfer = (to: string, amount: bigint): Promise<ContractTransactionResponse> => this.onlyIfInitialized(() => this._avatar!.transfer(to, amount));
  trust = (avatar: string): Promise<ContractTransactionResponse> => this.onlyIfInitialized(() => this._avatar!.trust(avatar));
  untrust = (avatar: string): Promise<ContractTransactionResponse> => this.onlyIfInitialized(() => this._avatar!.untrust(avatar));
  getTrustRelations = (): Promise<TrustRelationRow[]> => this.onlyIfInitialized(() => this._avatar!.getTrustRelations());
  getTransactionHistory = (pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> => this.onlyIfInitialized(() => this._avatar!.getTransactionHistory(pageSize));
  getTotalBalance = (): Promise<number> => this.onlyIfInitialized(() => this._avatar!.getTotalBalance());
  groupMint = (group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionResponse> => this.onlyIfV2((avatar) => avatar.groupMint(group, collateral, amounts, data));
  wrapDemurrageErc20 = (amount: bigint): Promise<ContractTransactionResponse> => this.onlyIfV2((avatar) => avatar.wrapDemurrageErc20(amount));
  wrapInflationErc20 = (amount: bigint): Promise<ContractTransactionResponse> => this.onlyIfV2((avatar) => avatar.wrapInflationErc20(amount));
}