import { V1Person } from './v1/v1Person';
import { ContractTransactionReceipt, ContractTransactionResponse } from 'ethers';
import { Sdk } from './sdk';
import { AvatarInterface, AvatarInterfaceV2 } from './AvatarInterface';
import {
  AvatarRow,
  CirclesQuery, Observable,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { V2Person } from './v2/v2Person';
import { CirclesEvent } from '@circles-sdk/data';

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

  get avatarInfo(): AvatarRow | undefined {
    return this._avatarInfo;
  }

  private _tokenEventSubscription?: () => void = undefined;

  constructor(sdk: Sdk, avatarAddress: string) {
    this.address = avatarAddress.toLowerCase();
    this._sdk = sdk;
  }

  public get events(): Observable<CirclesEvent> {
    if (!this._events) {
      throw new Error('Not initialized');
    }
    return this._events;
  }

  private _events: Observable<CirclesEvent> | undefined;

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

    const { version, hasV1 } = this._avatarInfo;
    const v1Person = () => new V1Person(this._sdk, this._avatarInfo!);
    const v2Person = () => new V2Person(this._sdk, this._avatarInfo!);

    switch (version) {
      case 1:
        this._avatar = v1Person();
        break;

      case 2:
        if (!hasV1) {
          this._avatar = v2Person();
        } else {
          const v1Avatar = v1Person();
          const isStopped = await v1Avatar.v1Token?.stopped();
          this._avatar = isStopped ? v2Person() : v1Person();
          const avatarInfo = this._avatar.avatarInfo;
          if (avatarInfo) {
            avatarInfo.v1Stopped = isStopped;
          }
        }
        break;

      default:
        throw new Error('Unsupported avatar');
    }

    this._events = await this._sdk.data.subscribeToEvents(this._avatarInfo.avatar);
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
  personalMint = (): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.personalMint());
  stop = (): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.stop());
  getMaxTransferableAmount = (to: string): Promise<bigint> => this.onlyIfInitialized(() => this._avatar!.getMaxTransferableAmount(to));
  transfer = (to: string, amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.transfer(to, amount));
  trust = (avatar: string): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.trust(avatar));
  untrust = (avatar: string): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.untrust(avatar));
  getTrustRelations = (): Promise<TrustRelationRow[]> => this.onlyIfInitialized(() => this._avatar!.getTrustRelations());
  getTransactionHistory = (pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> => this.onlyIfInitialized(() => this._avatar!.getTransactionHistory(pageSize));
  getTotalBalance = (): Promise<number> => this.onlyIfInitialized(() => this._avatar!.getTotalBalance());
  groupMint = (group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.groupMint(group, collateral, amounts, data));
  wrapDemurrageErc20 = (amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.wrapDemurrageErc20(amount));
  wrapInflationErc20 = (amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.wrapInflationErc20(amount));
  inviteHuman = (avatar: string): Promise<ContractTransactionReceipt> => this.onlyIfV2((_avatar) => _avatar.inviteHuman(avatar));
}