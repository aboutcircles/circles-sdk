import {AvatarInterfaceV2} from '../AvatarInterface';
import {
  ContractTransactionReceipt,
  ethers,
  formatEther,
  TransactionReceipt,
  ZeroAddress
} from 'ethers';
import {Sdk} from '../sdk';
import {
  attoCirclesToCircles,
  AvatarRow,
  CirclesQuery,
  TokenBalanceRow,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import {addressToUInt256, cidV0ToUint8Array} from '@circles-sdk/utils';
import {Pathfinder} from './pathfinderV2';
import {Profile} from "@circles-sdk/profiles";
import {TokenType} from "@circles-sdk/data/dist/rows/tokenInfoRow";
import {BatchRun, TransactionRequest, TransactionResponse} from "@circles-sdk/adapter";

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

  async getMaxTransferableAmount(to: string, tokenId?: string): Promise<number> {
    this.throwIfV2IsNotAvailable();

    if (tokenId) {
      const tokenInfo = await this.sdk.data.getTokenInfo(tokenId);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const tokenBalances = await this.sdk.data.getTokenBalances(this.address);
      const tokenBalance = tokenBalances.filter(b => b.version === 2 && b.tokenOwner.toString() === tokenInfo.token.toString())[0];
      return tokenBalance?.circles ?? 0;
    }

    const largeAmount = BigInt('79228162514264337593543950335');
    const transferPath = await this.sdk.v2Pathfinder!.getTransferPath(
      this.address,
      to,
      largeAmount);

    if (transferPath.transferSteps.length == 0) {
      return 0;
    }

    if (!transferPath.isValid) {
      return 0;
    }

    return attoCirclesToCircles(transferPath.maxFlow);
  }

  async getMintableAmount(): Promise<number> {
    this.throwIfV2IsNotAvailable();
    const [a, _, __] = await this.sdk.v2Hub!.calculateIssuance(this.address);
    return parseFloat(formatEther(a));
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
    return this.sdk.data.getAggregatedTrustRelations(this.address);
  }

  async getBalances(): Promise<TokenBalanceRow[]> {
    return await this.sdk.data.getTokenBalances(this.address);
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

  private async transitiveTransfer(to: string, amount: bigint, batch: BatchRun) {
    this.throwIfV2IsNotAvailable();

    const pathfinder = new Pathfinder(this.sdk.circlesConfig.v2PathfinderUrl!);
    const flowMatrix = await pathfinder.getArgsForPath(this.address, to, amount.toString());

    if (!this.sdk.v2Hub || this.sdk.contractRunner) {
      throw new Error('V2Hub or contract runner not available');
    }

    const operateFlowMatrixCallData = this.sdk.v2Hub.interface.encodeFunctionData("operateFlowMatrix", [flowMatrix.flowVertices, flowMatrix.flowEdges, flowMatrix.streams, flowMatrix.packedCoordinates]);
    const personalMintTx: TransactionRequest = {
      to: this.sdk.circlesConfig.v2HubAddress!,
      data: operateFlowMatrixCallData,
      value: 0n,
    };

    batch.addTransaction(personalMintTx);
  }

  private async directTransfer(to: string, amount: bigint, tokenAddress: string): Promise<TransactionReceipt> {
    const tokenInf = await this.sdk.data.getTokenInfo(tokenAddress);
    console.log(`Direct transfer - of: ${amount} - tokenId: ${tokenInf?.token} - to: ${to}`);
    if (!tokenInf) {
      throw new Error('Token not found');
    }

    const erc1155Types = new Set<TokenType>(['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup']);
    const erc20Types = new Set<TokenType>(['CrcV2_ERC20WrapperDeployed_Demurraged', 'CrcV2_ERC20WrapperDeployed_Inflationary', 'CrcV1_Signup']);

    if (erc1155Types.has(tokenInf.type)) {
      return await this.transferErc1155(tokenAddress, to, amount);
    } else if (erc20Types.has(tokenInf.type)) {
      return <TransactionReceipt><unknown>await this.transferErc20(to, amount, tokenAddress);
    }
    throw new Error(`Token type ${tokenInf.type} not supported`);
  }

  private async transferErc20(to: string, amount: bigint, tokenAddress: string) {
    const iface = new ethers.Interface(['function transfer(address to, uint256 value)']);
    const data = iface.encodeFunctionData('transfer', [to, amount]);

    if (!this.sdk?.contractRunner?.sendTransaction) {
      throw new Error('ContractRunner not available');
    }

    return await this.sdk.contractRunner.sendTransaction({
      to: tokenAddress,
      data: data,
      value: 0n
    });
  }

  private async transferErc1155(tokenAddress: string, to: string, amount: bigint) {
    const numericTokenId = addressToUInt256(tokenAddress);
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

  async transfer(to: string, amount: bigint, tokenAddress?: string): Promise<TransactionReceipt> {
    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }
    if (!tokenAddress) {
      const batch = this.sdk.contractRunner.sendBatchTransaction();

      const approvalStatus = await this.sdk.v2Hub!.isApprovedForAll(this.address, this.address);
      if (!approvalStatus) {
        const tx = this.sdk.v2Hub!.interface.encodeFunctionData("setApprovalForAll", [this.address, true]);
        batch.addTransaction({
          to: this.sdk.circlesConfig.v2HubAddress!,
          data: tx,
          value: 0n
        });
      }
      console.log(`Approval by ${this.address} for ${this.address} successful`);

      await this.transitiveTransfer(to, amount, batch);

      return <TransactionReceipt><unknown>(await batch.run());
    } else {
      return this.directTransfer(to, amount, tokenAddress);
    }
  }

  async trust(avatar: string | string[]): Promise<TransactionResponse> {
    this.throwIfV2IsNotAvailable();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.sdk.v2Hub!.interface.encodeFunctionData("trust", [av, BigInt('79228162514264337593543950335')]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v2HubAddress!,
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

  async untrust(avatar: string | string[]): Promise<TransactionResponse> {
    this.throwIfV2IsNotAvailable();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.sdk.v2Hub!.interface.encodeFunctionData("trust", [av, BigInt('0')]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v2HubAddress!,
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

    // TODO: Return the address of the wrapper
    //return await this.decodeErc20WrapperDeployed(receipt);
    return ZeroAddress;
  }

  async wrapInflationErc20(avatarAddress: string, amount: bigint): Promise<string> {
    const wrapResult = await this.sdk.v2Hub?.wrap(avatarAddress, amount, 1n /*Inflation*/);
    const receipt = await wrapResult?.wait();
    console.log(`wrapInflationErc20 receipt: ${receipt}`);

    if (!receipt) {
      throw new Error('Wrap failed');
    }

    // TODO: Return the address of the wrapper
    //return await this.decodeErc20WrapperDeployed(receipt);
    return ZeroAddress;
  }

  async unwrapDemurrageErc20(wrapperTokenAddress: string, amount: bigint): Promise<ContractTransactionReceipt> {
    const demurragedWrapper = await this.sdk.getDemurragedWrapper(wrapperTokenAddress);
    const tx = await demurragedWrapper.unwrap(amount);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Unwrap failed');
    }
    return receipt;
  }

  async unwrapInflationErc20(wrapperTokenAddress: string, amount: bigint): Promise<ContractTransactionReceipt> {
    const inflationWrapper = await this.sdk.getInflationaryWrapper(wrapperTokenAddress);
    const tx = await inflationWrapper.unwrap(amount);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Unwrap failed');
    }
    return receipt;
  }

  /**
   * Invite a user to Circles.
   * @param avatar The address of the avatar to invite. Can be either a v1 address or an address that's not signed up yet.
   */
  async inviteHuman(avatar: string): Promise<TransactionResponse> {
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
}