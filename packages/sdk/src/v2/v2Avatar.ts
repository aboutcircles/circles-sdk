import {AvatarInterfaceV2} from '../AvatarInterface';
import {
  ContractTransactionReceipt, ethers,
  formatEther
} from 'ethers';
import {Sdk} from '../sdk';
import {
  AvatarRow,
  CirclesQuery,
  TokenBalanceRow,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import {addressToUInt256, cidV0ToUint8Array} from '@circles-sdk/utils';
import {Pathfinder} from './pathfinderV2';
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

  trusts(otherAvatar: string): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(this.address, otherAvatar);
  }
  isTrustedBy(otherAvatar: string): Promise<boolean> {
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

  async getMaxTransferableAmount(to: string, tokenId?: string): Promise<bigint> {
    this.throwIfV2IsNotAvailable();

    if (tokenId) {
      const tokenInfo = await this.sdk.data.getTokenInfo(tokenId);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const tokenBalances = await this.sdk.data.getTokenBalances(this.address);
      const tokenBalance = tokenBalances.filter(b => b.version === 2 && b.tokenOwner.toString() === tokenInfo.token.toString())[0];
      return BigInt(tokenBalance?.attoCircles ?? "0");
    }

    const largeAmount = BigInt('79228162514264337593543950335');
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

  async getBalances(): Promise<TokenBalanceRow[]> {
    const allBalances = await this.sdk.data.getTokenBalances(this.address);
    return allBalances.filter(o => o.version === 2);
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
    console.log(`Direct transfer - of: ${amount} - tokenId: ${tokenInf?.token} - to: ${to}`);
    if (!tokenInf) {
      throw new Error('Token not found');
    }

    const numericTokenId = addressToUInt256(tokenInf.token);
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

  async wrapDemurrageErc20(avatarAddress: string, amount: bigint): Promise<string> {
    const wrapResult = await this.sdk.v2Hub?.wrap(avatarAddress, amount, 0n /*Demurrage*/);
    const receipt = await wrapResult?.wait();
    console.log(`wrapDemurrageErc20 receipt: ${receipt}`);

    if (!receipt) {
      throw new Error('Wrap failed');
    }

    return await this.decodeErc20WrapperDeployed(receipt);
  }

  async wrapInflationErc20(avatarAddress: string, amount: bigint): Promise<string> {
    const wrapResult = await this.sdk.v2Hub?.wrap(avatarAddress, amount, 1n /*Inflation*/);
    const receipt = await wrapResult?.wait();
    console.log(`wrapInflationErc20 receipt: ${receipt}`);

    if (!receipt) {
      throw new Error('Wrap failed');
    }

    return await this.decodeErc20WrapperDeployed(receipt);
  }

  async unwrapDemurrageErc20(avatarAddress: string, amount: bigint): Promise<ContractTransactionReceipt> {
  //   const wrapResult = await this.sdk.v2Hub?.wrap)
  //   const receipt = await wrapResult?.wait();
  //   console.log(`unwrapDemurrageErc20 receipt: ${receipt}`);
  //
  //   if (!receipt) {
  //     throw new Error('Unwrap failed');
  //   }
  //   return receipt;
    throw new Error('Not implemented');
  }

  async unwrapInflationErc20(avatarAddress: string, amount: bigint): Promise<ContractTransactionReceipt> {
  //   const wrapResult = await this.sdk.v2Hub?.unwrap(avatarAddress, amount, 1n /*Inflation*/);
  //   const receipt = await wrapResult?.wait();
  //   console.log(`unwrapInflationErc20 receipt: ${receipt}`);
  //
  //   if (!receipt) {
  //     throw new Error('Unwrap failed');
  //   }
  //   return receipt;
    throw new Error('Not implemented');
  }

  /**
   * Decode the ERC20WrapperDeployed event from the receipt.
   * @param receipt The receipt of the transaction that deployed the ERC20 wrapper.
   * @return The address of the deployed ERC20 wrapper.
   */
  async decodeErc20WrapperDeployed(receipt: ContractTransactionReceipt): Promise<string> {
    // Decode: event ERC20WrapperDeployed(address indexed avatar, address indexed erc20Wrapper, CirclesType circlesType);
    const decoded = this.sdk.v2Hub?.interface.parseLog(receipt.logs[0]);
    console.log(`decoded: ${JSON.stringify(decoded)}`);

    throw new Error('Not implemented');
  }

  /**
   * Invite a user to Circles.
   * @param avatar The address of the avatar to invite. Can be either a v1 address or an address that's not signed up yet.
   */
  async inviteHuman(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();

    const avatarInfo = await this.sdk.data.getAvatarInfo(avatar);
    if (avatarInfo?.version == 2) {
      throw new Error('Avatar is already a v2 avatar');
    }

    const receipt = await this.trust(avatar);
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