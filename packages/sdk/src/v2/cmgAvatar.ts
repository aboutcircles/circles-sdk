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
import { Address, cidV0ToUint8Array } from '@circles-sdk/utils';
import { Profile } from '@circles-sdk/profiles';
import { TransactionResponse } from '@circles-sdk/adapter';
import { CoreMembersGroup, CoreMembersGroup__factory } from '@circles-sdk/abi-v2';

import { Sdk } from '../sdk';
import { AvatarInterfaceV2 } from '../AvatarInterface';

export class CMGAvatar implements AvatarInterfaceV2 {
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

  groupRedeem(group: Address, collateral: Address[], amounts: bigint[]): Promise<ContractTransactionReceipt> {
    throw this.NotSupportedError();
  }

  async trust(avatar: Address | Address[], expiry?: bigint): Promise<TransactionResponse> {
    expiry = BigInt(expiry || Number.MAX_SAFE_INTEGER);

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.coreMemberGroup!.interface.encodeFunctionData('trust', [av, expiry]);
      batch.addTransaction({
        to: this.address!,
        data: txData,
        value: 0n
      });
    }

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Trust failed');
    }

    return receipt;
  }

  async untrust(avatar: Address | Address[]): Promise<TransactionResponse> {
    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.coreMemberGroup!.interface.encodeFunctionData('trust', [av, BigInt('0')]);
      batch.addTransaction({
        to: this.address!,
        data: txData,
        value: 0n
      });
    }

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Untrust failed');
    }

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

  getMembershipConditions(): Promise<Address[]> {
    return this.coreMemberGroup.getMembershipConditions() as Promise<Address[]>;
  }

  trusts(otherAvatar: Address): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(this.address, otherAvatar);
  }

  isTrustedBy(otherAvatar: Address): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(otherAvatar, this.address);
  }

  async updateMetadata(cid: string): Promise<ContractTransactionReceipt> {
    const digest = cidV0ToUint8Array(cid);
    const tx = await this.coreMemberGroup.updateMetadataDigest(digest);
    const receipt = await tx?.wait();
    if (!receipt) {
      throw new Error('Updating Metadata Digest failed');
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

  async setService(service: Address): Promise<ContractTransactionReceipt> {
    const tx = await this.coreMemberGroup.setService(service);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Updating service failed');
    }

    return receipt;
  }

  async setMintHandler(mintHandler: Address): Promise<ContractTransactionReceipt> {
    const tx = await this.coreMemberGroup.setMintHandler(mintHandler);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Updating group mint handler failed');
    }

    return receipt;
  }

  async setRedemptionHandler(service: Address): Promise<ContractTransactionReceipt> {
    const tx = await this.coreMemberGroup.setRedemptionHandler(service);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Updating group redemption handler failed');
    }

    return receipt;
  }

  async setMinimalDeposit(minimalDeposit: bigint): Promise<ContractTransactionReceipt> {
    const tx = await this.coreMemberGroup.setMinimalDeposit(minimalDeposit);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Updating minimal deposit failed');
    }

    return receipt;
  }

  async setFeeCollection(feeCollection: Address): Promise<ContractTransactionReceipt> {
    const tx = await this.coreMemberGroup.setFeeCollection(feeCollection);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Updating fee collection failed');
    }

    return receipt;
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

  private NotSupportedError() {
    return new Error('CoreMembersGroup avatar does not support this function.');
  }
}