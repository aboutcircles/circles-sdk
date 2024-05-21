import { AvatarRow } from '@circles-sdk/data';
import { TransactionReceipt } from 'ethers';
import { ObservableProperty } from './observableProperty';
import { AvatarEvent } from './avatar';

/**
 * A trust relation between two avatars.
 */
export type TrustRelation =
  'trusts'
  | 'trustedBy'
  | 'mutuallyTrusts'
  | 'selfTrusts';

/**
 * A single avatar to avatar trust relation that can be either one-way or mutual.
 */
export interface TrustRelationRow {
  /**
   * The avatar.
   */
  subjectAvatar: string;
  /**
   * The trust relation.
   */
  relation: TrustRelation;
  /**
   * Who's trusted by or is trusting the avatar.
   */
  objectAvatar: string;

  /**
   * When the last trust relation (in either direction) was last established.
   */
  timestamp: number;
}

/**
 * An Avatar represents a user registered at Circles.
 */
export interface AvatarInterface {
  /**
   * The avatar's address.
   */
  readonly address: string;

  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address.
   * If the avatar is initialized and this field is `undefined`, the avatar is not signed up at Circles.
   */
  readonly avatarInfo: AvatarRow | undefined;

  /**
   * A stream of events that have been caused by the avatar executing transactions.
   */
  readonly lastEvent: ObservableProperty<AvatarEvent>;

  /**
   * Calculates the maximum Circles amount that can be transferred to another avatar.
   *
   * NOTE: This operation can be long-running (minutes).
   *
   * @param to The address of the avatar to transfer to.
   * @returns The maximum amount that can be transferred.
   */
  getMaxTransferableAmount(to: string): Promise<bigint>;

  /**
   * Transfers Circles to another avatar.
   *
   * NOTE: This operation can be long-running (minutes).
   *
   * @param to The address of the avatar to transfer to.
   * @param amount The amount to transfer.
   */
  transfer(to: string, amount: bigint): Promise<TransactionReceipt>;

  /**
   * Trusts another avatar. Trusting an avatar means you're willing to accept Circles that have been issued by this avatar.
   * @param avatar The address of the avatar to trust.
   */
  trust(avatar: string): Promise<TransactionReceipt>;

  /**
   * Revokes trust from another avatar. This means you will no longer accept Circles issued by this avatar.
   * @param avatar
   */
  untrust(avatar: string): Promise<TransactionReceipt>;

  /**
   * Gets the amount available to mint via `personalMint()`.
   * @returns The amount available to mint or '0'.
   */
  getMintableAmount(): Promise<bigint>;

  /**
   * Mints the available CRC for the avatar.
   */
  personalMint(): Promise<TransactionReceipt>;

  /**
   * Stops the avatar's token. This will prevent any future `personalMint()` calls.
   */
  stop(): Promise<TransactionReceipt>;

  /**
   * Gets all trust relations of the avatar.
   */
  getTrustRelations(): Promise<TrustRelationRow[]>;
}