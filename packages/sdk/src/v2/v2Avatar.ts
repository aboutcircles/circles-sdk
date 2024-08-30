import { AvatarInterfaceV2 } from '../AvatarInterface';
import {
  ContractTransactionReceipt, ethers,
  formatEther
} from 'ethers';
import { Sdk } from '../sdk';
import {
  AvatarRow,
  CirclesQuery,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { addressToUInt256, cidV0ToUint8Array } from '@circles-sdk/utils';
import { Pathfinder } from './pathfinderV2';
import {Profile} from "@circles-sdk/profiles";

export type FlowEdge = {
  streamSinkId: bigint;
  amount: bigint;
};

export type Stream = {
  sourceCoordinate: bigint,
  flowEdgeIds: bigint[],
  data: Uint8Array
}

export class V2Avatar implements AvatarInterfaceV2 {
  public readonly sdk: Sdk;

  get address(): string {
    return this.avatarInfo.avatar;
  }

  public readonly avatarInfo: AvatarRow;

  private _cachedProfile: Profile | undefined;
  private _cachedProfileCid: string | undefined;

  constructor(sdk: Sdk, avatarInfo: AvatarRow) {
    this.sdk = sdk;
    this.avatarInfo = avatarInfo;

    if (this.avatarInfo.version != 2) {
      throw new Error('Avatar is not a v2 avatar');
    }
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

  async getMaxTransferableAmount(to: string, tokenId?: string): Promise<bigint> {
    this.throwIfV2IsNotAvailable();

    if (tokenId) {
      const tokenInfo = await this.sdk.data.getTokenInfo(tokenId);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const tokenBalances = await this.sdk.data.getTokenBalancesV2(this.address);
      const tokenBalance = tokenBalances.filter(b => b.tokenOwner.toString() === tokenInfo.tokenId.toString());
      console.log(`Token balance:`, tokenBalance);
      return !tokenBalance[0].balance ? 0n : ethers.parseEther(tokenBalance[0].balance.toString());
    }

    const largeAmount = BigInt('999999999999999999999999999999');
    const transferPath = await this.sdk.v2Pathfinder!.getTransferPath(
      this.address,
      to,
      largeAmount);

    if (!transferPath.isValid) {
      return Promise.resolve(BigInt(0));
    }

    return transferPath.maxFlow;
  }

  async getMintableAmount(): Promise<number> {
    this.throwIfV2IsNotAvailable();
    const [a, b, c] = await this.sdk.v2Hub!.calculateIssuance(this.address);
    return parseFloat(formatEther(a));
  }

  async getTotalBalance(): Promise<number> {
    return parseFloat(await this.sdk.data.getTotalBalanceV2(this.address, true));
  }

  async getGasTokenBalance(): Promise<bigint> {
    return await this.sdk.contractRunner.provider?.getBalance(this.address) ?? 0n;
  }

  async getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> {
    const query = this.sdk.data.getTransactionHistory(this.address, pageSize);
    await query.queryNextPage();

    return query;
  }

  async getTrustRelations(): Promise<TrustRelationRow[]> {
    return this.sdk.data.getAggregatedTrustRelations(this.address);
  }

  async personalMint(): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.personalMint();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Personal mint failed');
    }

    return receipt;
  }

  async stop(): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.stop();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Stop failed');
    }

    return receipt;
  }

  private async transitiveTransfer(to: string, amount: bigint): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();

    const pathfinder = new Pathfinder(this.sdk.circlesConfig.v2PathfinderUrl!);
    const flowMatrix = await pathfinder.getArgsForPath(this.address, to, amount.toString());
    const result = await this.sdk.v2Hub?.operateFlowMatrix(flowMatrix.flowVertices, flowMatrix.flowEdges, flowMatrix.streams, flowMatrix.packedCoordinates);
    const receipt = await result?.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }
    return receipt;
  }

  private async directTransfer(to: string, amount: bigint, tokenAddress: string): Promise<ContractTransactionReceipt> {
    const tokenInf = await this.sdk.data.getTokenInfo(tokenAddress);
    console.log(`Direct transfer - of: ${amount} - tokenId: ${tokenInf?.tokenId} - to: ${to}`);
    if (!tokenInf) {
      throw new Error('Token not found');
    }

    const numericTokenId = addressToUInt256(tokenInf.tokenId);
    console.log(`numericTokenId: ${numericTokenId}`);
    const tx = await this.sdk.v2Hub?.safeTransferFrom(
      this.address,
      to,
      numericTokenId,
      amount,
      new Uint8Array(0));

    const receipt = await tx?.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }

    return receipt;
  }

  async transfer(to: string, amount: bigint, tokenAddress?: string): Promise<ContractTransactionReceipt> {
    if (!tokenAddress) {
      const approvalStatus = await this.sdk.v2Hub!.isApprovedForAll(this.address, this.address);
      if (!approvalStatus) {
        const tx = await this.sdk.v2Hub!.setApprovalForAll(this.address, true);
        const receipt = await tx.wait();
        if (!receipt) {
          throw new Error('Approval failed');
        }
      }
      console.log(`Approval by ${this.address} for ${this.address} successful`);

      return this.transitiveTransfer(to, amount);
    } else {
      return this.directTransfer(to, amount, tokenAddress);
    }
  }

  async trust(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.trust(avatar, BigInt('79228162514264337593543950335'));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Trust failed');
    }

    return receipt;
  }

  async untrust(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.trust(avatar, BigInt('0'));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Untrust failed');
    }

    return receipt;
  }

  async groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.groupMint(group, collateral, amounts, data);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Group mint failed');
    }

    return receipt;
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

  wrapDemurrageErc20(amount: bigint): Promise<ContractTransactionReceipt> {
    throw new Error('Not implemented');
  }

  wrapInflationErc20(amount: bigint): Promise<ContractTransactionReceipt> {
    throw new Error('Not implemented');
  }

    /**
   * Invite a user to Circles (TODO: May cost you invite fees).
   * @param avatar The address of the avatar to invite. Can be either a v1 address or an address that's not signed up yet.
   */
  async inviteHuman(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.inviteHuman(avatar);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Invite failed');
    }

    return receipt;
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
}