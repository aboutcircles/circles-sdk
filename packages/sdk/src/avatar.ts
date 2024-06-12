import { V1Avatar } from './v1/v1Avatar';
import { ContractTransactionResponse } from 'ethers';
import { Sdk } from './sdk';
import { AvatarRow, CirclesQuery, TransactionHistoryRow } from '@circles-sdk/data';
import { AvatarInterface, TrustRelationRow } from './AvatarInterface';
import { Observable } from './observable';

// export type AvatarEvent =
//   ParsedV1HubEvent<V1HubEvent>
//   | ParsedV1TokenEvent<V1TokenEvent>;

/**
 * An Avatar represents a user registered at Circles.
 * It provides methods to interact with the Circles protocol, such as minting, transferring and trusting other avatars.
 */
export class Avatar implements AvatarInterface {

  public readonly address: string;

  /**
   * The actual avatar implementation to use behind this facade.
   * @private
   */
  private readonly v1Avatar: V1Avatar;

  // public readonly events: Observable<AvatarEvent>;
  // private readonly emitEvent: (event: AvatarEvent) => void;

  get avatarInfo(): AvatarRow | undefined {
    return this.v1Avatar.avatarInfo;
  }

  private _tokenEventSubscription?: () => void = undefined;

  constructor(sdk: Sdk, avatarAddress: string) {
    this.address = avatarAddress.toLowerCase();

    // TODO: re-implement events
    // const eventsProperty = Observable.create<AvatarEvent>();
    // this.events = eventsProperty.property;
    // this.emitEvent = eventsProperty.emit;
    // sdk.v1Hub.events.subscribe(this.emitEvent);

    this.v1Avatar = new V1Avatar(sdk, avatarAddress);
  }

  /**
   * Initializes the avatar.
   */
  initialize = async () => {
    if (this._tokenEventSubscription) {
      this._tokenEventSubscription();
    }

    await this.v1Avatar.initialize();

    if (this.v1Avatar.v1Token) {
      // TODO: re-implement events
      // this._tokenEventSubscription = this.v1Avatar.v1Token.events.subscribe(this.emitEvent);
    }
  };

  getMintableAmount = (): Promise<bigint> => this.v1Avatar.getMintableAmount();
  personalMint = (): Promise<ContractTransactionResponse> => this.v1Avatar.personalMint();
  stop = (): Promise<ContractTransactionResponse> => this.v1Avatar.stop();
  getMaxTransferableAmount = (to: string): Promise<bigint> => this.v1Avatar.getMaxTransferableAmount(to);
  transfer = (to: string, amount: bigint): Promise<ContractTransactionResponse> => this.v1Avatar.transfer(to, amount);
  trust = (avatar: string): Promise<ContractTransactionResponse> => this.v1Avatar.trust(avatar);
  untrust = (avatar: string): Promise<ContractTransactionResponse> => this.v1Avatar.untrust(avatar);
  getTrustRelations = (): Promise<TrustRelationRow[]> => this.v1Avatar.getTrustRelations();
  getTransactionHistory = (pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> => this.v1Avatar.getTransactionHistory(pageSize);
  getTotalBalance = (): Promise<number> => this.v1Avatar.getTotalBalance();
}