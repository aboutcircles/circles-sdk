import {
  AvatarRow, CirclesQuery, TokenBalanceRow, TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { ContractTransactionReceipt, TransactionReceipt } from 'ethers';
import { Profile } from '@circles-sdk/profiles';
import { TransactionResponse } from '@circles-sdk/adapter';
import { Address } from '@circles-sdk/utils';


/**
 * An Avatar represents a user registered at Circles v2.
 */
export interface AvatarInterface {
  /**
   * The avatar's address.
   */
  readonly address: Address;

  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address.
   * If the avatar is initialized and this field is `undefined`, the avatar is not signed up at Circles.
   */
  readonly avatarInfo: AvatarRow | undefined;

  /**
   * Calculates the maximum Circles amount that can be transferred to another avatar.
   *
   * NOTE: This operation can be long-running.
   * NOTE: The max. transferable amount can be lower than the avatar's balance depending on its trust relations and token holdings.
   *       Use the `getMaxTransferableAmount()` method to calculate the max. transferable amount if you need to know it beforehand.
   *
   *
   * @param to The address of the avatar to transfer to.
   * @param tokenId The token to transfer (address). Leave empty to allow transitive transfers.
   * @param useWrappedBalances If wrapped Circles should be considered in the transfers.
   * @param fromTokens If specified, makes sure that only the given tokens are used at the source.
   * @param toTokens If specified, makes sure that only the given tokens arrive at the sink.
   * @param excludeFromTokens If specified, makes sure that the given tokens are not used at the source.
   * @param excludeToTokens If specified, makes sure that the given tokens are not used at the sink.
   * @returns The maximum amount that can be transferred.
   */
  getMaxTransferableAmount(
    to: Address,
    tokenId?: Address,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[]): Promise<number>;

  /**
   * Transfers Circles to another avatar.
   *
   * NOTE: This operation can be long-running.
   *
   * @param to The address of the avatar to transfer to.
   * @param amount The amount to transfer.
   * @param txData The data to send with the transaction.
   * @param token The token to transfer (address). Leave empty to allow transitive transfers.
   * @param useWrappedBalances If wrapped Circles should be considered in the transfers.
   * @param fromTokens If specified, makes sure that only the given tokens are used at the source.
   * @param toTokens If specified, makes sure that only the given tokens arrive at the sink.
   * @param excludeFromTokens If specified, makes sure that the given tokens are not used at the source.
   * @param excludeToTokens If specified, makes sure that the given tokens are not used at the sink.
   */
  transfer(
    to: Address,
    amount: bigint,
    token?: Address,
    txData?: Uint8Array,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[]): Promise<TransactionReceipt>;

  /**
   * Trusts another avatar. Trusting an avatar means you're willing to accept Circles that have been issued by this avatar.
   * @param avatar The address of the avatar to trust.
   */
  trust(avatar: Address | Address[]): Promise<TransactionResponse>;

  /**
   * Revokes trust from another avatar. This means you will no longer accept Circles issued by this avatar.
   * @param avatar
   */
  untrust(avatar: Address | Address[]): Promise<TransactionResponse>;

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

  /**
   * Gets the avatar's balance of chain native token (e.g. xDai).
   */
  getGasTokenBalance(): Promise<bigint>;

  /**
   * Can be used to check if this avatar trusts the other avatar.
   * @param otherAvatar The address of the other avatar.
   * @return `true` if this avatar trusts the other avatar.
   */
  trusts(otherAvatar: Address): Promise<boolean>;

  /**
   * Can be used to check if this avatar is trusted by the other avatar.
   * @param otherAvatar The address of the other avatar.
   * @return `true` if this avatar is trusted by the other avatar.
   */
  isTrustedBy(otherAvatar: Address): Promise<boolean>;

  /**
   * Gets the token balances of the avatar.
   * @returns The token balances.
   */
  getBalances(): Promise<TokenBalanceRow[]>;

  /**
   * Gets the total supply of either this avatar's Personal or Group Circles.
   */
  getTotalSupply(): Promise<bigint>;

  /**
   * Updates the avatar's metadata (profile).
   * @param cid The IPFS CID of the metadata.
   */
  updateMetadata(cid: string): Promise<ContractTransactionReceipt>;

  /**
   * Uses holdings of the avatar as collateral to mint new group tokens.
   * @param group The group which is minting the tokens.
   * @param collateral The owners of the token used as collateral.
   * @param amounts The amounts of the collateral tokens to use.
   * @param data Additional data for the minting operation.
   */
  groupMint(group: Address, collateral: Address[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt>;

  /**
   * Redeems collateral from a group in exchange for the group tokens.
   *
   * @param group - The address of the group to redeem from.
   * @param collaterals - An array of collateral addresses involved in the redemption.
   * @param amounts - An array of amounts corresponding to the collateral to redeem.
   * @return A promise that resolves to the transaction receipt of the redemption.
   */
  groupRedeem(group: Address, collaterals: Address[], amounts: bigint[]): Promise<ContractTransactionReceipt | TransactionReceipt>;

  /**
   * Automatically redeems collateral tokens from a Base Group's treasury
   * 
   * @param group The address of the Base Group from which to redeem collateral tokens
   * @param amount The amount of group tokens to redeem for collateral (must be > 0 and <= max redeemable)
   * @return A Promise resolving to the transaction receipt upon successful automatic redemption
   */
  groupRedeemAuto?(group: Address, amount: bigint): Promise<TransactionReceipt>;

  /**
   * Wraps ERC115 Circles into demurraged ERC20 Circles.
   * @param avatarAddress The address of the avatar whose Circles should be wrapped.
   * @param amount The amount of ERC115 Circles to wrap.
   * @returns The token address of the ERC20 Circles.
   */
  wrapDemurrageErc20(avatarAddress: Address, amount: bigint): Promise<Address>;

  /**
   * Unwraps demurraged ERC20 Circles into personal ERC115 Circles.
   * @param wrapperTokenAddress The token address of the ERC20 Circles.
   * @param amount The amount of ERC20 Circles to unwrap.
   */
  unwrapDemurrageErc20(wrapperTokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Wraps inflation ERC20 Circles into demurraged ERC20 Circles.
   * @param avatarAddress The address of the avatar whose Circles should be wrapped.
   * @param amount The amount of inflation ERC20 Circles to wrap.
   * @returns The token address of the ERC20 Circles.
   */
  wrapInflationErc20(avatarAddress: Address, amount: bigint): Promise<Address>;

  /**
   * Unwraps inflation ERC20 Circles into personal ERC115 Circles.
   * @param wrapperTokenAddress The avatar address.
   * @param amount The amount of ERC20 Circles to unwrap.
   */
  unwrapInflationErc20(wrapperTokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Invites an address as human to Circles v2.
   * @param avatar The avatar's avatar.
   */
  inviteHuman(avatar: Address): Promise<TransactionResponse>;

  /**
   * Gets the profile that's associated with the avatar or returns `undefined` if no profile is associated.
   * @returns The profile or `undefined`.
   */
  getProfile(): Promise<Profile | undefined>;

  /**
   * Updates the avatar's metadata (profile).
   * @param profile The new profile.
   * @returns The IPFS CID of the updated profile.
   */
  updateProfile(profile: Profile): Promise<string>;
}
