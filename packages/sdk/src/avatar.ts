import { V1Avatar } from './v1/v1Avatar';
import { TransactionReceipt } from 'ethers';
import { ObservableProperty } from './observableProperty';
import { ParsedV1HubEvent, V1HubEvent } from '@circles-sdk/abi-v1/dist/V1HubEvents';
import { ParsedV1TokenEvent, V1TokenEvent } from '@circles-sdk/abi-v1/dist/V1TokenEvents';
import { Sdk } from './sdk';
import { AvatarRow } from '@circles-sdk/data';
import { AvatarInterface, TrustRelationRow } from './AvatarInterface';

export type AvatarEvent =
  ParsedV1HubEvent<V1HubEvent>
  | ParsedV1TokenEvent<V1TokenEvent>;

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

  public readonly lastEvent: ObservableProperty<AvatarEvent>;
  private readonly setLastEvent: (event: AvatarEvent) => void;

  get avatarInfo(): AvatarRow | undefined {
    return this.v1Avatar.avatarInfo;
  }

  private _tokenEventSubscription?: () => void = undefined;

  constructor(sdk: Sdk, avatarAddress: string) {
    this.address = avatarAddress;

    const lastEventProperty = ObservableProperty.create<AvatarEvent>();
    this.lastEvent = lastEventProperty.property;
    this.setLastEvent = lastEventProperty.emit;
    sdk.v1Hub.events.subscribe(this.setLastEvent);

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
      this._tokenEventSubscription = this.v1Avatar.v1Token.events.subscribe(this.setLastEvent);
    }
  };

  getMintableAmount = (): Promise<bigint> => this.v1Avatar.getMintableAmount();
  personalMint = (): Promise<TransactionReceipt> => this.v1Avatar.personalMint();
  stop = (): Promise<TransactionReceipt> => this.v1Avatar.stop();
  getMaxTransferableAmount = (to: string): Promise<bigint> => this.v1Avatar.getMaxTransferableAmount(to);
  transfer = (to: string, amount: bigint): Promise<TransactionReceipt> => this.v1Avatar.transfer(to, amount);
  trust = (avatar: string): Promise<TransactionReceipt> => this.v1Avatar.trust(avatar);
  untrust = (avatar: string): Promise<TransactionReceipt> => this.v1Avatar.untrust(avatar);
  getTrustRelations = (): Promise<TrustRelationRow[]> => this.v1Avatar.getTrustRelations();
}