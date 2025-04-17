import { V1Avatar } from './v1/v1Avatar';
import { ContractTransactionReceipt, parseEther, TransactionReceipt } from 'ethers';
import { Sdk } from './sdk';
import { AvatarInterface, AvatarInterfaceV2 } from './AvatarInterface';
import {
  AvatarRow,
  CirclesQuery, GroupType, Observable,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { V2Avatar } from './v2/v2Avatar';
import { CirclesEvent } from '@circles-sdk/data';
import { Address, tcToCrc } from '@circles-sdk/utils';
import { Profile } from '@circles-sdk/profiles';
import { TokenBalanceRow } from '@circles-sdk/data';
import { TransactionResponse } from '@circles-sdk/adapter';
import { CMGAvatar } from './v2/cmgAvatar';
import { BaseGroupAvatar } from './v2/baseGroupAvatar';

/**
 * An Avatar represents a user registered at Circles.
 * It provides methods to interact with the Circles protocol, such as minting, transferring and trusting other avatars.
 */
export class Avatar implements AvatarInterfaceV2 {

  public readonly address: Address;

  /**
   * The actual avatar implementation to use behind this facade.
   * @private
   */
  private _avatar: AvatarInterface | undefined;
  private _avatarInfo: AvatarRow | undefined;
  private _sdk: Sdk;

  /**
   * After initialization, this property contains the avatar's basic information.
   */
  get avatarInfo(): AvatarRow | undefined {
    return this._avatarInfo;
  }

  private _tokenEventSubscription?: () => void = undefined;

  private _groupType: GroupType | undefined;

  /**
   * Creates a new Avatar instance that controls a Circles avatar at the given address.
   * @param sdk The SDK instance to use.
   * @param avatarAddress The address of the avatar to control.
   */
  constructor(sdk: Sdk, avatarAddress: Address) {
    this.address = avatarAddress;
    this._sdk = sdk;
  }

  /**
   * The events observable for this avatar.
   */
  public get events(): Observable<CirclesEvent> {
    if (!this._events) {
      throw new Error('Not initialized');
    }
    return this._events;
  }

  private _events: Observable<CirclesEvent> | undefined;

  unsubscribeFromEvents = () => {
    if (this._tokenEventSubscription) {
      this._tokenEventSubscription();
    }
  };

  subscribeToEvents = async () => {
    if (!this._avatarInfo) {
      throw new Error('Avatar is not initialized');
    }
    this._events = await this._sdk.data.subscribeToEvents(this._avatarInfo.avatar);
  };

  /**
   * Initializes the avatar.
   */
  initialize = async (subscribe: boolean = true) => {
    this.unsubscribeFromEvents();

    this._avatarInfo = await this._sdk.data.getAvatarInfo(this.address);
    if (!this._avatarInfo) {
      throw new Error('Avatar is not signed up at Circles');
    }

    const { version, hasV1 } = this._avatarInfo;
    const v1Person = () => new V1Avatar(this._sdk, this._avatarInfo!);
    const v2Person = () => new V2Avatar(this._sdk, this._avatarInfo!);
    const CMGroup = () => new CMGAvatar(this._sdk, this._avatarInfo!);
    const BaseGroup = () => new BaseGroupAvatar(this._sdk, this._avatarInfo!);

    this._groupType = await this._sdk.getGroupType(this.address);

    switch (version) {
      case 1:
        this._avatar = v1Person();
        break;

      case 2:
        if (this._groupType === 'CrcV2_CMGroupCreated') {
          this._avatar = CMGroup();
        } else if(this._groupType === 'CrcV2_BaseGroupCreated') {
          this._avatar = BaseGroup();
        } else if (!hasV1) {
          this._avatar = v2Person();
        } else {
          const v1Avatar = v1Person();
          const isHuman = await v1Avatar.avatarInfo.isHuman;

          // Handle edge case: organization migrated to v2 but still have v1 account
          // without token which is recognized as `isStopped == false`
          let isStopped = false;
          if(isHuman) {
            isStopped = await v1Avatar.v1Token?.stopped() || false;
            this._avatar = isStopped ? v2Person() : v1Person();
          } else {
            this._avatar = v2Person();
          }

          const avatarInfo = this._avatar.avatarInfo;
          if (avatarInfo) {
            avatarInfo.v1Stopped = isStopped;
          }
        }
        break;

      default:
        throw new Error('Unsupported avatar');
    }

    if (subscribe) {
      await this.subscribeToEvents();
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

  private onlyIfCoreMembersGroup<T>(func: (avatar: CMGAvatar) => T) {
    if (!this._avatar || this._avatarInfo?.version !== 2 || this._groupType !== 'CrcV2_CMGroupCreated') {

      throw new Error('CoreMembersGroup avatar is not initialized or is not a v2 avatar');
    }
    return func(<CMGAvatar>this._avatar);
  }

  private onlyIfBaseGroup<T>(func: (avatar: BaseGroupAvatar) => T) {
    if (!this._avatar || this._avatarInfo?.version !== 2 || this._groupType !== 'CrcV2_BaseGroupCreated') {

      throw new Error('BaseGroup avatar is not initialized or is not a v2 avatar');
    }
    return func(<BaseGroupAvatar>this._avatar);
  }

  private onlyIfGroup<T>(func: (avatar: CMGAvatar | BaseGroupAvatar) => T) {
    if (!this._avatar || this._avatarInfo?.version !== 2 || (this._groupType !== 'CrcV2_CMGroupCreated' && this._groupType !== 'CrcV2_BaseGroupCreated')) {

      throw new Error('Group avatar is not initialized or is not a v2 avatar');
    }
    return func(<BaseGroupAvatar>this._avatar);
  }

  /**
   * `human` avatars can mint 24 personal Circles per day. This method returns the amount of Circles that can be minted.
   *
   * Note: v2 avatars can mint at max. 14 days * 24 Circles = 336 Circles.
   *       v1 avatars on the other hand will stop minting after 90 days without minting.
   * @returns The amount of Circles that can be minted.
   */
  getMintableAmount = (): Promise<number> => this.onlyIfInitialized(() => this._avatar!.getMintableAmount());

  /**
   * Mints the available personal Circles for the avatar. Check `getMintableAmount()` to see how many Circles can be minted.
   * @returns The transaction receipt.
   */
  personalMint = (): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.personalMint());

  /**
   * Stops the avatar's token. This will prevent any future `personalMint()` calls and is not reversible.
   */
  stop = (): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.stop());

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
   * @returns The maximum amount that can be transferred.
   */
  getMaxTransferableAmount = (to: Address, tokenId?: Address, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<number> =>
    this.onlyIfInitialized(() => this._avatar!.getMaxTransferableAmount(to, tokenId, useWrappedBalances, fromTokens, toTokens));

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
   */
  transfer(to: Address, amount: number, token?: Address, txData?: Uint8Array, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<TransactionReceipt>;
  transfer(to: Address, amount: bigint, token?: Address, txData?: Uint8Array, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<TransactionReceipt>;
  transfer(to: Address, amount: number | bigint, token?: Address, txData?: Uint8Array, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<TransactionReceipt> {
    if (typeof amount === 'number') {
      const sendValue = this?.avatarInfo?.version === 1
        ? tcToCrc(new Date(), amount)
        : parseEther(amount.toString());

      return this.onlyIfInitialized(() => this._avatar!.transfer(to, sendValue, token, txData, useWrappedBalances, fromTokens, toTokens));
    }
    return this.onlyIfInitialized(() => this._avatar!.transfer(to, amount, token, txData, useWrappedBalances, fromTokens, toTokens));
  }

  /**
   * Trusts another avatar. Trusting an avatar means you're willing to accept Circles that have been issued by this avatar.
   *
   * This method has two modes:
   * - Basic trust: Pass only `avatarAddress` to trust the specified avatar(s)
   * - Timed trust: (Only for base group or core members group avatars) Include `expiry` to set a time limit on trust
   *
   * @param avatarAddress The address of the avatar to trust. Can be a single address or an array of addresses.
   * @param expiry (Optional) The expiration time of the trust relationship in Unix timestamp format.
   * @returns TransactionResponse
   */
  trust(avatarAddress: Address | Address[], expiry?: bigint): Promise<TransactionResponse> {
    if (this._groupType === 'CrcV2_BaseGroupCreated' || this._groupType === 'CrcV2_CMGroupCreated') {
      return this.onlyIfGroup((avatar) => avatar!.trust(avatarAddress, expiry));
    }
    return this.onlyIfInitialized(() => this._avatar!.trust(avatarAddress));
  }

  /**
   * Revokes trust from another avatar. This means you will no longer accept Circles issued by this avatar. This will not affect already received Circles.
   * @param avatar The address of the avatar to untrust.
   * @returns The transaction receipt.
   */
  untrust = (avatar: Address | Address[]): Promise<TransactionResponse> => this.onlyIfInitialized(() => this._avatar!.untrust(avatar));

  /**
   * Can be used to check if this avatar trusts the other avatar.
   * @param otherAvatar The address of the other avatar.
   * @return `true` if this avatar trusts the other avatar.
   */
  trusts = (otherAvatar: Address): Promise<boolean> => this.onlyIfInitialized(() => this._avatar!.trusts(otherAvatar));

  /**
   * Can be used to check if this avatar is trusted by the other avatar.
   * @param otherAvatar The address of the other avatar.
   * @return `true` if this avatar is trusted by the other avatar.
   */
  isTrustedBy = (otherAvatar: Address): Promise<boolean> => this.onlyIfInitialized(() => this._avatar!.isTrustedBy(otherAvatar));

  /**
   * Gets the trust relations of the avatar.
   * @returns An array of trust relations in this form: avatar1 - [trusts|trustedBy|mutuallyTrusts] -> avatar2.
   */
  getTrustRelations = (): Promise<TrustRelationRow[]> => this.onlyIfInitialized(() => this._avatar!.getTrustRelations());

  /**
   * Gets the Circles transaction history of the avatar. The history contains incoming/outgoing transactions and minting of personal Circles and Group Circles.
   * @param pageSize The maximum number of transactions per page.
   * @returns A query object that can be used to iterate over the transaction history.
   */
  getTransactionHistory = (pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> => this.onlyIfInitialized(() => this._avatar!.getTransactionHistory(pageSize));

  /**
   * Gets the avatar's total Circles balance.
   *
   * Note: This queries either the v1 or the v2 balance of an avatar. Check the `avatarInfo` property to see which version your avatar uses.
   *       Token holdings in v1 can be migrated to v2. Check out `Sdk.migrateAvatar` or `Sdk.migrateV1Tokens` for more information.
   */
  getTotalBalance = (): Promise<number> => this.onlyIfInitialized(() => this._avatar!.getTotalBalance());

  /**
   * Retrieves the token balances.
   *
   * This asynchronous function fetches the token balances available for the current context.
   * It requires the system to be initialized before it can be invoked.
   *
   * @returns {Promise<TokenBalanceRow[]>} A promise that resolves to an array of token balance rows.
   */
  getBalances = (): Promise<TokenBalanceRow[]> => this.onlyIfInitialized(() => this._avatar!.getBalances());

  /**
   * Gets the avatar's total balance of chain-native tokens.
   */
  getGasTokenBalance = (): Promise<bigint> => this.onlyIfInitialized(() => this._avatar!.getGasTokenBalance());

  /**
   * Use collateral, trusted by the group, to mint new Group Circles.
   * @param group The group which Circles to mint.
   * @param collateral The collateral tokens to use for minting.
   * @param amounts The amounts of the collateral tokens to use.
   * @param data Additional data for the minting operation.
   * @returns The transaction receipt.
   */
  groupMint = (group: Address, collateral: Address[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.groupMint(group, collateral, amounts, data));

  /**
   * Facilitates the redemption process for a specified group using the provided collateral and amounts.
   *
   * @param group - The address of the group for which the operation is being performed.
   * @param collateral - An array of collateral addresses to redeem.
   * @param amounts - An array of amounts corresponding to each collateral.
   * @returns A promise that resolves to the transaction receipt of the redemption process.
   */
  groupRedeem = (group: Address, collateral: Address[], amounts: bigint[]): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.groupRedeem(group, collateral, amounts));

  /**
   * Wraps the specified amount of personal Circles into demurraged ERC20 tokens for use outside the Circles protocol.
   * Note: This kind of token can be incompatible with services since it's demurraged and thus the balance changes over time.
   * @param avatarAddress The address of the avatar whose Circles should be wrapped.
   * @param amount The amount of Circles to wrap.
   */
  wrapDemurrageErc20 = (avatarAddress: Address, amount: bigint): Promise<Address> => this.onlyIfV2((avatar) => avatar.wrapDemurrageErc20(avatarAddress, amount));
  /**
   * Wraps the specified amount of inflation Circles into ERC20 tokens for use outside the Circles protocol.
   * In contrast to demurraged tokens, these token's balance does not change over time.
   * @param avatarAddress The address of the avatar whose Circles should be wrapped.
   * @param amount The amount of Circles to wrap.
   */
  wrapInflationErc20 = (avatarAddress: Address, amount: bigint): Promise<Address> => this.onlyIfV2((avatar) => avatar.wrapInflationErc20(avatarAddress, amount));
  /**
   * Unwraps the specified amount of demurraged ERC20 Circles back to personal Circles.
   * @param tokenAddress The token address of the ERC20 Circles.
   * @param amount The amount of ERC20 Circles to unwrap.
   */
  unwrapDemurrageErc20 = (tokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.unwrapDemurrageErc20(tokenAddress, amount));
  /**
   * Unwraps the specified amount of inflation ERC20 Circles back to personal Circles.
   * @param avatarAddress The address of the avatar whose Circles should be unwrapped.
   * @param amount The amount of ERC20 Circles to unwrap.
   */
  unwrapInflationErc20 = (avatarAddress: Address, amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.unwrapInflationErc20(avatarAddress, amount));
  /**
   * Invite a human avatar to join Circles.
   * @param avatar The address of any human controlled wallet.
   */
  inviteHuman = (avatar: Address): Promise<TransactionResponse> => this.onlyIfV2((_avatar) => _avatar.inviteHuman(avatar));
  /**
   * Updates the avatar's metadata (profile).
   * @param cid The IPFS content identifier of the metadata (Qm....).
   * @returns The transaction receipt confirming the update.
   */
  updateMetadata = (cid: string): Promise<ContractTransactionReceipt> => this.onlyIfInitialized(() => this._avatar!.updateMetadata(cid));

  /**
   * Gets the profile that's associated with the avatar or returns `undefined` if no profile is associated.
   * @returns The profile or `undefined`.
   */
  getProfile = (): Promise<Profile | undefined> => this.onlyIfV2((_avatar) => _avatar.getProfile());

  /**
   * Updates the avatar's profile.
   * @param profile The new profile.
   * @returns The IPFS CID of the updated profile.
   */
  updateProfile = (profile: Profile): Promise<string> => this.onlyIfV2((_avatar) => _avatar.updateProfile(profile));

  /**
   * Gets the total supply of either this avatar's Personal or Group Circles.
   */
  getTotalSupply = (): Promise<bigint> => this.onlyIfInitialized(() => this._avatar!.getTotalSupply());

  /// Methods for CMGAvatar

  /**
   * Retrieves the owner of the group.
   * @returns The address of the owner.
   */
  owner = (): Promise<Address> => this.onlyIfGroup((avatar) => avatar.owner());

  /**
   * Retrieves the mint handler address, responsible for minting new group tokens.
   * @returns The address of the mint handler.
   */
  mintHandler = (): Promise<Address> => this.onlyIfGroup((avatar) => avatar.mintHandler());

  /**
   * Retrieves the redemption handler address, responsible for handling group token redemptions.
   * @returns The address of the redemption handler.
   */
  redemptionHandler = (): Promise<Address> => this.onlyIfCoreMembersGroup((avatar) => avatar.redemptionHandler());

  /**
   * Retrieves the service address associated with the group contract.
   * @returns The address of the service.
   */
  service = (): Promise<Address> => this.onlyIfGroup((avatar) => avatar.service());

  /**
   * Gets the minimum deposit required for group mint operation.
   * @returns The minimum deposit amount as a `bigint`.
   */
  minimalDeposit = (): Promise<bigint> => this.onlyIfCoreMembersGroup((avatar) => avatar.minimalDeposit());

  /**
   * Gets the membership conditions required to enter the group.
   * @returns Set of addresses representing membership conditions.
   */
  getMembershipConditions = (): Promise<Address[]> => this.onlyIfGroup((avatar) => avatar.getMembershipConditions());

  /**
   * Updates the owner of the group to a new address.
   * This functionality is only available for Base Group avatars.
   * 
   * @param owner The address of the new owner
   * @returns A promise resolving to the transaction receipt
   * @throws Error if the avatar is not initialized or is not a Base Group avatar
   */
  setOwner = (owner: Address): Promise<ContractTransactionReceipt> => this.onlyIfBaseGroup((avatar) => avatar.setOwner(owner));

  /**
   * Sets the service address for the group contract.
   * @param service The new service address to be set.
   * @returns A promise resolving to the transaction receipt.
   */
  setService = (service: Address): Promise<ContractTransactionReceipt> => this.onlyIfGroup((avatar) => avatar.setService(service));

  /**
   * Assigns a new mint handler responsible for mint operations.
   * @param mintHandler The address of the new mint handler.
   * @returns A promise resolving to the transaction receipt.
   */
  setMintHandler = (mintHandler: Address): Promise<ContractTransactionReceipt> => this.onlyIfCoreMembersGroup((avatar) => avatar.setMintHandler(mintHandler));

  /**
   * Assigns a new redemption handler responsible for handling redemptions.
   * @param redemptionHandler The address of the new redemption handler.
   * @returns A promise resolving to the transaction receipt.
   */
  setRedemptionHandler = (redemptionHandler: Address): Promise<ContractTransactionReceipt> => this.onlyIfCoreMembersGroup((avatar) => avatar.setRedemptionHandler(redemptionHandler));

  /**
   * Sets the minimal deposit required for the group mint.
   * @param minimalDeposit The amount representing the minimal deposit requirement.
   * @returns A promise resolving to the transaction receipt.
   */
  setMinimalDeposit = (minimalDeposit: bigint): Promise<ContractTransactionReceipt> => this.onlyIfCoreMembersGroup((avatar) => avatar.setMinimalDeposit(minimalDeposit));

  /**
   * Assigns a new address for fee collection.
   * @param feeCollection The address of the new fee collection entity.
   * @returns A promise resolving to the transaction receipt.
   */
  setFeeCollection = (feeCollection: Address): Promise<ContractTransactionReceipt> => this.onlyIfGroup((avatar) => avatar.setFeeCollection(feeCollection));

  /**
   * Sets or updates a membership condition for the group.
   * This functionality is only available for Base Group avatars.
   * 
   * @param condition The address representing a membership condition
   * @param enabled Boolean flag indicating whether the condition should be enabled or disabled
   * @returns A promise resolving to the transaction receipt
   * @throws Error if the avatar is not initialized or is not a Base Group avatar
   */
  setMembershipCondition = (condition: Address, enabled: boolean): Promise<ContractTransactionReceipt> => this.onlyIfBaseGroup((avatar) => avatar.setMembershipCondition(condition, enabled));

  /**
   * Registers a short name for the group using a nonce value.
   * This functionality is only available for Base Group avatars.
   * 
   * @param nonce A user-provided nonce to handle name collisions or concurrency issues
   * @returns A promise resolving to the transaction receipt
   * @throws Error if the avatar is not initialized or is not a Base Group avatar or if registration fails
   */
  registerShortNameWithNonce = (nonce: number): Promise<ContractTransactionReceipt> => this.onlyIfBaseGroup((avatar) => avatar.registerShortNameWithNonce(nonce));

  /**
   * Establishes trust relationships with multiple addresses in a single transaction with expiry conditions.
   * This functionality is only available for Base Group avatars.
   * 
   * @param members An array of addresses to trust
   * @param expiry Optional timestamp when the trust relationships will expire (defaults to 0)
   * @returns A promise resolving to the transaction receipt
   * @throws Error if the avatar is not initialized or is not a Base Group avatar
   */
  trustBatchWithConditions = (members: Address[], expiry?: bigint): Promise<ContractTransactionReceipt> => this.onlyIfBaseGroup((avatar) => avatar.trustBatchWithConditions(members, expiry));
}