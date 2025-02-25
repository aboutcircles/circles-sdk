import {
  ContractRunner,
  ContractTransactionReceipt,
  TransactionReceipt
} from 'ethers';

import {
  AvatarRow,
  CirclesQuery,
  TokenBalanceRow,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import {Address, cidV0ToUint8Array} from '@circles-sdk/utils';
import {Profile} from "@circles-sdk/profiles";
import {TransactionResponse} from "@circles-sdk/adapter";
import {CoreMembersGroup, CoreMembersGroup__factory } from '@circles-sdk/abi-v2';

import {Sdk} from '../sdk';
import {CoreMembersGroupInterface} from '../AvatarInterface';

export class CMGAvatar implements CoreMembersGroupInterface {
  public readonly sdk: Sdk;

  get address(): Address {
    return this.avatarInfo.avatar;
  }

  public readonly avatarInfo: AvatarRow;
  public coreMemberGroup: CoreMembersGroup;

  private _cachedProfile: Profile | undefined;
  private _cachedProfileCid: string | undefined;


  constructor(sdk: Sdk, avatarInfo: AvatarRow) {
    this.sdk = sdk;
    this.avatarInfo = avatarInfo;

    this.coreMemberGroup = CoreMembersGroup__factory.connect(this.address, <ContractRunner>sdk.contractRunner);

    if (this.avatarInfo.version != 2) {
      throw new Error('Avatar is not a v2 avatar');
    }
  }
  // @notice Address[] and batch transaction is used for compatibility purpose
  async trust(trustReceiver: Address | Address[], expiry?: bigint): Promise<TransactionResponse> {
    if(Array.isArray(trustReceiver)) {
      throw this.NotSupportedError();
    }

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    const txData = this.coreMemberGroup!.interface.encodeFunctionData("trust", [trustReceiver, BigInt(expiry || 0)]);
    batch.addTransaction({
      to: this.address,
      data: txData,
      value: 0n,
    });

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Trust failed');
    }

    return receipt;
  }

  async trustBatch(coreMembers: Address[], expiry: bigint): Promise<ContractTransactionReceipt> {
    const tx = await this.coreMemberGroup.trustBatch(coreMembers, expiry);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Batch Trust operation failed');
    }
    return receipt;
  }


  async untrust(avatar: Address | Address[]): Promise<TransactionResponse> {
    this.throwIfV2IsNotAvailable();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    const txData = this.coreMemberGroup!.interface.encodeFunctionData("trustBatch", [avatars, BigInt('0')]);
    batch.addTransaction({
      to: this.address!,
      data: txData,
      value: 0n
    });

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Untrust failed');
    }

    return receipt;
  }

  async updateMetadataDigest(metadataDigest: string): Promise<ContractTransactionReceipt> {
    const digest = cidV0ToUint8Array(metadataDigest);
    const tx = await this.coreMemberGroup.updateMetadataDigest(digest);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Updating Metadata Digest failed');
    }

    this.avatarInfo.cidV0 = metadataDigest;

    return receipt;
  }

  owner(): Promise<Address> {
    return this.coreMemberGroup.owner() as Promise<Address>;
  }

  mintHandler(): Promise<Address> {
    return this.coreMemberGroup.mintHandler() as Promise<Address>;
  }

  redemptionHandler(): Promise<Address> {
    return this.coreMemberGroup.redemptionHandler() as Promise<Address>;
  }

  service(): Promise<Address> {
    return this.coreMemberGroup.service() as Promise<Address>;
  }

  minimalDeposit(): Promise<bigint> {
    return this.coreMemberGroup.minimalDeposit();
  }

  trusts(otherAvatar: Address): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(this.address, otherAvatar);
  }

  isTrustedBy(otherAvatar: Address): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(otherAvatar, this.address);
  }

  async updateMetadata(cid: string): Promise<ContractTransactionReceipt> {
    this.throwIfNameRegistryIsNotAvailable();

    const digest = cidV0ToUint8Array(cid);
    const tx = await this.sdk.nameRegistry?.updateMetadataDigest(digest);
    const receipt = await tx?.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }

    this.avatarInfo.cidV0 = cid;

    return receipt;
  }

  async getMaxTransferableAmount(to: Address, tokenId?: Address): Promise<number> {
    throw this.NotSupportedError();
  }

  async getMintableAmount(): Promise<number> {
    throw this.NotSupportedError();
  }

  async getTotalBalance(): Promise<number> {
    return parseFloat(await this.sdk.data.getTotalBalanceV2(this.address, true));
  }

  async getGasTokenBalance(): Promise<bigint> {
    // TODO: re-implement
    // return await this.sdk.contractRunner.provider?.getBalance(this.address) ?? 0n;
    return 0n;
  }

  async getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> {
    const query = this.sdk.data.getTransactionHistory(this.address, pageSize);
    await query.queryNextPage();

    return query;
  }

  async getTrustRelations(): Promise<TrustRelationRow[]> {
    return this.sdk.data.getAggregatedTrustRelations(this.address, 2);
  }

  async getBalances(): Promise<TokenBalanceRow[]> {
    return await this.sdk.data.getTokenBalances(this.address);
  }

  async personalMint(): Promise<ContractTransactionReceipt> {
    throw this.NotSupportedError();
  }

  async stop(): Promise<ContractTransactionReceipt> {
    throw this.NotSupportedError();
  }

  async transfer(to: Address, amount: bigint, tokenAddress?: Address): Promise<TransactionReceipt> {
    throw this.NotSupportedError();
  }

  async groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> {
    throw this.NotSupportedError();
  }

  async getProfile(): Promise<Profile | undefined> {
    const profileCid = this.avatarInfo?.cidV0;
    if (this._cachedProfile && this._cachedProfileCid === profileCid) {
      return this._cachedProfile;
    }

    if (profileCid) {
      try {
        const profileData = await this.sdk?.profiles?.get(profileCid);
        if (profileData) {
          this._cachedProfile = profileData;
          this._cachedProfileCid = profileCid;

          return this._cachedProfile;
        }
      } catch (e) {
        console.warn(`Couldn't load profile for CID ${profileCid}`, e);
      }
    }

    return undefined;
  }

  async updateProfile(profile: Profile): Promise<string> {
    const result = await this.sdk?.profiles?.create(profile);
    if (!result) {
      throw new Error('Failed to update profile. The profile service did not return a CID.');
    }

    const updateCidResult = await this.updateMetadata(result);
    if (!updateCidResult) {
      throw new Error('Failed to update profile. The CID was not updated.');
    }

    this.avatarInfo.cidV0 = result;

    return result;
  }

  async wrapDemurrageErc20(avatarAddress: Address, amount: bigint): Promise<Address> {
    throw this.NotSupportedError();
  }

  async wrapInflationErc20(avatarAddress: Address, amount: bigint): Promise<Address> {
    throw this.NotSupportedError();
  }

  async unwrapDemurrageErc20(wrapperTokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt> {
    throw this.NotSupportedError();
  }

  async unwrapInflationErc20(wrapperTokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt> {
    throw this.NotSupportedError();
  }

  /**
   * Invite a user to Circles.
   * @param avatar The address of the avatar to invite. Can be either a v1 address or an address that's not signed up yet.
   */
  async inviteHuman(avatar: Address): Promise<TransactionResponse> {
    throw this.NotSupportedError();
  }

  /**
   * Gets the total supply of either this avatar's Personal- or Group-Circles, depending on the avatar's type.
   * Returns '0' for organizations or if the avatar is not signed up at Circles.
   */
  async getTotalSupply(): Promise<bigint> {
    this.throwIfV2IsNotAvailable();
    return await this.sdk.v2Hub!.totalSupply(this.address);
  }

  private throwIfV2IsNotAvailable() {
    if (!this.sdk.circlesConfig.v2HubAddress) {
      throw new Error('V2 is not available');
    }
  }

  private throwIfNameRegistryIsNotAvailable() {
    if (!this.sdk.nameRegistry) {
      throw new Error('Name registry is not available');
    }
  }

  private NotSupportedError() {
    return new Error('CoreMembersGroup avatar does not support this function.');
  }
}