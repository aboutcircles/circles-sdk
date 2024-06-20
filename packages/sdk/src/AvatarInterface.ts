import {
  AvatarRow, CirclesEvent,
  CirclesQuery, Observable,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { ContractTransactionReceipt, TransactionReceipt } from 'ethers';

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
  // TODO: re-implement events
  // readonly events: Observable<AvatarEvent>;

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
  transfer(to: string, amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Trusts another avatar. Trusting an avatar means you're willing to accept Circles that have been issued by this avatar.
   * @param avatar The address of the avatar to trust.
   */
  trust(avatar: string): Promise<ContractTransactionReceipt>;

  /**
   * Revokes trust from another avatar. This means you will no longer accept Circles issued by this avatar.
   * @param avatar
   */
  untrust(avatar: string): Promise<ContractTransactionReceipt>;

  /**
   * Gets the amount available to mint via `personalMint()`.
   * @returns The amount available to mint or '0'.
   */
  getMintableAmount(): Promise<bigint>;

  /**
   * Mints the available CRC for the avatar.
   */
  personalMint(): Promise<ContractTransactionReceipt>;

  /**
   * Stops the avatar's token. This will prevent any future `personalMint()` calls.
   */
  stop(): Promise<ContractTransactionReceipt>;

  /**
   * Gets all trust relations of the avatar.
   */
  getTrustRelations(): Promise<TrustRelationRow[]>;

  /**
   * Gets a paged query of the transaction history of the avatar.
   * @param pageSize The maximum number of transactions per page.
   */
  getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>>;

  /**
   * Gets the avatar's total circles balance.
   */
  getTotalBalance(): Promise<number>;
}

export interface AvatarInterfaceV2 extends AvatarInterface {
  groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt>;

  wrapDemurrageErc20(amount: bigint): Promise<ContractTransactionReceipt>;

  wrapInflationErc20(amount: bigint): Promise<ContractTransactionReceipt>;
}