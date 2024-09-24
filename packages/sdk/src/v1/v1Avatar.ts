import {
  ContractRunner,
  ContractTransactionReceipt, ethers, TransactionReceipt
} from 'ethers';
import {Sdk} from '../sdk';
import {AvatarInterface} from '../AvatarInterface';
import {Token, Token__factory} from '@circles-sdk/abi-v1';
import {
  AvatarRow,
  CirclesQuery,
  TokenBalanceRow,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import {crcToTc} from '@circles-sdk/utils';
import {TransactionResponse} from "@circles-sdk/adapter";

export class V1Avatar implements AvatarInterface {
  public readonly sdk: Sdk;

  get address(): string {
    if (!this.avatarInfo) {
      throw new Error('Avatar is not initialized');
    }
    return this.avatarInfo.avatar;
  }

  // TODO: Empty stream makes no sense
  // readonly events: Observable<AvatarEvent> = Observable.create<AvatarEvent>().property;

  get v1Token(): Token | undefined {
    return this._v1Token;
  }

  private _v1Token?: Token;

  public readonly avatarInfo: AvatarRow;

  constructor(sdk: Sdk, avatarInfo: AvatarRow) {
    this.sdk = sdk;
    this.avatarInfo = avatarInfo;

    if (!this.avatarInfo.hasV1) {
      throw new Error('Avatar is not a v1 avatar');
    }

    if (this.avatarInfo.v1Token) {
      this._v1Token = Token__factory.connect(this.avatarInfo.v1Token, <ContractRunner>this.sdk.contractRunner);
    }
  }

  async getBalances(): Promise<TokenBalanceRow[]> {
    return await this.sdk.data.getTokenBalances(this.address);
  }

  /**
   * Utilizes the pathfinder to find the max. transferable amount from the avatar to `to`.
   * @param to The recipient
   * @param tokenId The token to transfer (address). Leave empty to allow transitive transfers.
   * @returns The max. transferable amount at the time.
   */
  async getMaxTransferableAmount(to: string, tokenId?: string): Promise<number> {
    this.throwIfNotInitialized();

    if (tokenId) {
      const tokenInfo = await this.sdk.data.getTokenInfo(tokenId);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const tokenBalances = await this.sdk.data.getTokenBalances(this.address);
      const tokenBalance = tokenBalances.filter(b => b.version === 1 && b.tokenAddress === tokenId)[0]?.circles;
      return tokenBalance ?? "0";
    }

    this.throwIfPathfinderIsNotAvailable();

    const largeAmount = BigInt('999999999999999999999999999999');
    const transferPath = await this.sdk.v1Pathfinder!.getTransferPath(
      this.address,
      to,
      largeAmount);

    if (!transferPath.isValid) {
      return 0;
    }

    return crcToTc(new Date(), transferPath.maxFlow);
  }

  /**
   * Utilizes the pathfinder to transitively send `amount` Circles to `to`.
   * @param to The recipient
   * @param amount The amount to send
   * @param token The token to transfer (address). Leave empty to allow transitive transfers.
   */
  async transfer(to: string, amount: bigint, token?: string): Promise<TransactionReceipt> {
    this.throwIfNotInitialized();
    let receipt: TransactionReceipt | null = null;
    if (!token) {
      this.throwIfPathfinderIsNotAvailable();
      // transitive transfer
      const transferPath = await this.sdk.v1Pathfinder!.getTransferPath(
        this.address,
        to,
        amount);

      if (!transferPath.isValid || transferPath.transferSteps.length === 0) {
        throw new Error(`Couldn't find a valid path from ${this.address} to ${to} for ${amount}.`);
      }

      console.log('transferPath', transferPath);

      const tokenOwners = transferPath.transferSteps.map(o => o.token_owner);
      const srcs = transferPath.transferSteps.map(o => o.from);
      const dests = transferPath.transferSteps.map(o => o.to);
      const wads = transferPath.transferSteps.map(o => BigInt(o.value));
      const tx = await this.sdk.v1Hub.transferThrough(tokenOwners, srcs, dests, wads);

      receipt = await tx.wait();
    } else {
      // erc20 transfer via ethers.Interface
      const iface = new ethers.Interface(['function transfer(address to, uint256 value)']);
      const data = iface.encodeFunctionData('transfer', [to, amount]);

      if (!this.sdk?.contractRunner?.sendTransaction) {
        throw new Error('ContractRunner not available');
      }

      const tx = await this.sdk.contractRunner.sendTransaction({
        to: token,
        data: data,
        value: 0n,
      });

      receipt = <TransactionReceipt><unknown>tx;
    }

    if (!receipt) {
      throw new Error(`The transferThrough call for '${this.address} -> ${to}: ${amount}' didn't yield a receipt.`);
    }

    return receipt;
  }

  async trust(avatar: string | string[]): Promise<TransactionResponse> {
    this.throwIfNotInitialized();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.sdk.v1Hub.interface.encodeFunctionData('trust', [av, BigInt(100)]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v1HubAddress,
        data: txData,
        value: 0n,
      });
    }

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Trust failed');
    }

    return receipt;
  }

  async untrust(avatar: string | string[]): Promise<TransactionResponse> {
    this.throwIfNotInitialized();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.sdk.v1Hub.interface.encodeFunctionData('trust', [av, BigInt(0)]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v1HubAddress,
        data: txData,
        value: 0n,
      });
    }

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Untrust failed');
    }

    return receipt;
  }


  async getMintableAmount(): Promise<number> {
    if (!this.v1Token) {
      return 0;
    }

    const availableCrcToMint = await this.v1Token.look();
    return crcToTc(new Date(), availableCrcToMint);
  }

  async personalMint(): Promise<ContractTransactionReceipt> {
    this.throwIfNotInitialized();

    if (!this.v1Token) {
      throw new Error('Avatar does not have a token to mint');
    }
    if (await this.v1Token.stopped()) {
      throw new Error('Avatar token is stopped');
    }

    const tx = await this.v1Token.update();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('The update call didn\'t yield a receipt');
    }

    return receipt;
  }

  async stop(): Promise<ContractTransactionReceipt> {
    this.throwIfNotInitialized();

    if (!this.v1Token) {
      throw new Error('Avatar does not have a token to stop');
    }
    if (await this.v1Token.stopped()) {
      throw new Error('Avatar token is already stopped');
    }

    const tx = await this.v1Token.stop();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('The stop call didn\'t yield a receipt');
    }

    return receipt;
  }

  private throwIfNotInitialized() {
    if (this.avatarInfo) {
      return;
    }
    throw new Error('Avatar is either not initialized or is not signed up at Circles.');
  }

  async getTrustRelations(): Promise<TrustRelationRow[]> {
    return this.sdk.data.getAggregatedTrustRelations(this.address);
  }

  async getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> {
    const query = this.sdk.data.getTransactionHistory(this.address, pageSize);
    await query.queryNextPage();

    return query;
  }

  async getTotalBalance(): Promise<number> {
    return parseFloat(await this.sdk.data.getTotalBalance(this.address, true));
  }

  async getGasTokenBalance(): Promise<bigint> {
    // TODO: re-implement
    // return await this.sdk.contractRunner.provider?.getBalance(this.address) ?? 0n;
    return 0n;
  }

  async trusts(otherAvatar: string): Promise<boolean> {
    return (await this.sdk.v1Hub.limits(this.address, otherAvatar)) > 0n;
  }

  async isTrustedBy(otherAvatar: string): Promise<boolean> {
    return (await this.sdk.v1Hub.limits(otherAvatar, this.address)) > 0n;
  }

  /**
   * Gets the total supply of either this avatar's Personal Circles.
   * Returns '0' for organizations or if the avatar is not signed up at Circles.
   */
  async getTotalSupply(): Promise<bigint> {
    this.throwIfNotInitialized();
    return await this._v1Token?.totalSupply() ?? 0n;
  }

  private throwIfPathfinderIsNotAvailable() {
    if (!this.sdk.v1Pathfinder) {
      throw new Error('Pathfinder is not available');
    }
  }
}