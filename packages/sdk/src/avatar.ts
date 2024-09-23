import {V1Avatar} from './v1/v1Avatar';
import {ContractTransactionReceipt, parseEther, TransactionReceipt} from 'ethers';
import {Sdk} from './sdk';
import {AvatarInterface, AvatarInterfaceV2} from './AvatarInterface';
import {
  AvatarRow,
  CirclesQuery, Observable,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import {V2Avatar} from './v2/v2Avatar';
import {CirclesEvent} from '@circles-sdk/data';
import {tcToCrc} from '@circles-sdk/utils';
import {Profile} from "@circles-sdk/profiles";
import {TokenBalanceRow} from "../../data";
import {TransactionResponse} from "@circles-sdk/adapter";

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

  /**
   * After initialization, this property contains the avatar's basic information.
   */
  get avatarInfo(): AvatarRow | undefined {
    return this._avatarInfo;
  }

  private _tokenEventSubscription?: () => void = undefined;

  /**
   * Creates a new Avatar instance that controls a Circles avatar at the given address.
   * @param sdk The SDK instance to use.
   * @param avatarAddress The address of the avatar to control.
   */
  constructor(sdk: Sdk, avatarAddress: string) {
    this.address = avatarAddress.toLowerCase();
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
  }

  subscribeToEvents = async () => {
    if (!this._avatarInfo) {
      throw new Error('Avatar is not initialized');
    }
    this._events = await this._sdk.data.subscribeToEvents(this._avatarInfo.avatar);
  }

  /**
   * Initializes the avatar.
   */
  initialize = async (subscribe: boolean = true) => {
    this.unsubscribeFromEvents();

    this._avatarInfo = await this._sdk.data.getAvatarInfo(this.address);
    if (!this._avatarInfo) {
      throw new Error('Avatar is not signed up at Circles');
    }

    const {version, hasV1} = this._avatarInfo;
    const v1Person = () => new V1Avatar(this._sdk, this._avatarInfo!);
    const v2Person = () => new V2Avatar(this._sdk, this._avatarInfo!);

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
   * Utilizes the pathfinder to find the maximum Circles amount that can be transferred from this Avatar to the other avatar.
   * @param to The address to transfer the Circles to.
   * @param tokenId The token ID to transfer. If not specified, a transitve transfer is calculated.
   * @returns The maximum Circles amount that can be transferred.
   */
  getMaxTransferableAmount = (to: string, tokenId?: string): Promise<number> => this.onlyIfInitialized(() => this._avatar!.getMaxTransferableAmount(to, tokenId));

  /**
   * Transfers Circles to another avatar.
   *
   * Note: The max. transferable amount can be lower than the avatar's balance depending on its trust relations and token holdings.
   *       Use the `getMaxTransferableAmount()` method to calculate the max. transferable amount if you need to know it beforehand.
   * @param to The address of the avatar to transfer to.
   * @param amount The amount to transfer.
   * @param token The token to transfer. Leave empty to allow transitive transfers.
   */
  transfer(to: string, amount: number, token?: string): Promise<TransactionReceipt>;
  transfer(to: string, amount: bigint, token?: string): Promise<TransactionReceipt>;
  transfer(to: string, amount: number | bigint, token?: string): Promise<TransactionReceipt> {
    if (typeof amount === 'number') {
      const sendValue = this?.avatarInfo?.version === 1
        ? tcToCrc(new Date(), amount)
        : parseEther(amount.toString());

      return this.onlyIfInitialized(() => this._avatar!.transfer(to, sendValue, token))
    }
    return this.onlyIfInitialized(() => this._avatar!.transfer(to, amount, token))
  }

  /**
   * Trusts another avatar. Trusting an avatar means you're willing to accept Circles that have been issued by this avatar.
   * @param avatar The address of the avatar to trust.
   * @returns The transaction receipt.
   */
  trust = (avatar: string|string[]): Promise<TransactionResponse> => this.onlyIfInitialized(() => this._avatar!.trust(avatar));
  /**
   * Revokes trust from another avatar. This means you will no longer accept Circles issued by this avatar. This will not affect already received Circles.
   * @param avatar The address of the avatar to untrust.
   * @returns The transaction receipt.
   */
  untrust = (avatar: string|string[]): Promise<TransactionResponse> => this.onlyIfInitialized(() => this._avatar!.untrust(avatar));

  /**
   * Can be used to check if this avatar trusts the other avatar.
   * @param otherAvatar The address of the other avatar.
   * @return `true` if this avatar trusts the other avatar.
   */
  trusts = (otherAvatar: string): Promise<boolean> => this.onlyIfInitialized(() => this._avatar!.trusts(otherAvatar));

  /**
   * Can be used to check if this avatar is trusted by the other avatar.
   * @param otherAvatar The address of the other avatar.
   * @return `true` if this avatar is trusted by the other avatar.
   */
  isTrustedBy = (otherAvatar: string): Promise<boolean> => this.onlyIfInitialized(() => this._avatar!.isTrustedBy(otherAvatar));

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
  groupMint = (group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.groupMint(group, collateral, amounts, data));
  /**
   * Wraps the specified amount of personal Circles into demurraged ERC20 tokens for use outside the Circles protocol.
   * Note: This kind of token can be incompatible with services since it's demurraged and thus the balance changes over time.
   * @param avatarAddress The address of the avatar whose Circles should be wrapped.
   * @param amount The amount of Circles to wrap.
   */
  wrapDemurrageErc20 = (avatarAddress: string, amount: bigint): Promise<string> => this.onlyIfV2((avatar) => avatar.wrapDemurrageErc20(avatarAddress, amount));
  /**
   * Wraps the specified amount of inflation Circles into ERC20 tokens for use outside the Circles protocol.
   * In contrast to demurraged tokens, these token's balance does not change over time.
   * @param avatarAddress The address of the avatar whose Circles should be wrapped.
   * @param amount The amount of Circles to wrap.
   */
  wrapInflationErc20 = (avatarAddress: string, amount: bigint): Promise<string> => this.onlyIfV2((avatar) => avatar.wrapInflationErc20(avatarAddress, amount));
  /**
   * Unwraps the specified amount of demurraged ERC20 Circles back to personal Circles.
   * @param tokenAddress The token address of the ERC20 Circles.
   * @param amount The amount of ERC20 Circles to unwrap.
   */
  unwrapDemurrageErc20 = (tokenAddress: string, amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.unwrapDemurrageErc20(tokenAddress, amount));
  /**
   * Unwraps the specified amount of inflation ERC20 Circles back to personal Circles.
   * @param avatarAddress The address of the avatar whose Circles should be unwrapped.
   * @param amount The amount of ERC20 Circles to unwrap.
   */
  unwrapInflationErc20 = (avatarAddress: string, amount: bigint): Promise<ContractTransactionReceipt> => this.onlyIfV2((avatar) => avatar.unwrapInflationErc20(avatarAddress, amount));
  /**
   * Invite a human avatar to join Circles.
   * @param avatar The address of any human controlled wallet.
   */
  inviteHuman = (avatar: string): Promise<TransactionResponse> => this.onlyIfV2((_avatar) => _avatar.inviteHuman(avatar));
  /**
   * Updates the avatar's metadata (profile).
   * @param cid The IPFS content identifier of the metadata (Qm....).
   */
  updateMetadata = (cid: string): Promise<ContractTransactionReceipt> => this.onlyIfV2((_avatar) => _avatar.updateMetadata(cid));

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
}