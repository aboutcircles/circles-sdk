import {
  AvatarRow, CirclesQuery, TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { ContractTransactionReceipt } from 'ethers';

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
   * @param token The token to transfer (address). Leave empty to allow transitive transfers.
   */
  transfer(to: string, amount: bigint, token?: string): Promise<ContractTransactionReceipt>;

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
  getMintableAmount(): Promise<number>;

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

/**
 * V2 avatars have additional capabilities that are described in this interface.
 */
export interface AvatarInterfaceV2 extends AvatarInterface {
  /**
   * Uses holdings of the avatar as collateral to mint new group tokens.
   * @param group The group which is minting the tokens.
   * @param collateral The owners of the token used as collateral.
   * @param amounts The amounts of the collateral tokens to use.
   * @param data Additional data for the minting operation.
   */
  groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt>;

  /**
   * Wraps ERC115 Circles into demurraged ERC20 Circles.
   * @param amount The amount of ERC115 Circles to wrap.
   */
  wrapDemurrageErc20(amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Wraps inflation ERC20 Circles into demurraged ERC20 Circles.
   * @param amount The amount of inflation ERC20 Circles to wrap.
   */
  wrapInflationErc20(amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Invites an address as human to Circles v2.
   * @param avatar The avatar's avatar.
   */
  inviteHuman(avatar: string): Promise<ContractTransactionReceipt>;

  /**
   * Updates the avatar's metadata (profile).
   * @param cid The IPFS CID of the metadata.
   */
  updateMetadata(cid: string): Promise<ContractTransactionReceipt>;
}