import {
  ContractTransactionReceipt
} from 'ethers';
import { Sdk } from '../sdk';
import { AvatarInterface } from '../AvatarInterface';
import { Token, Token__factory } from '@circles-sdk/abi-v1';
import {
  AvatarRow,
  CirclesQuery,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';

export class V1Person implements AvatarInterface {
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
      this._v1Token = Token__factory.connect(this.avatarInfo.v1Token, this.sdk.signer);
    }
  }

  /**
   * Utilizes the pathfinder to find the max. transferable amount from the avatar to `to`.
   * @param to The recipient
   * @returns The max. transferable amount at the time.
   */
  async getMaxTransferableAmount(to: string): Promise<bigint> {
    this.throwIfNotInitialized();

    const largeAmount = BigInt('999999999999999999999999999999');
    const transferPath = await this.sdk.v1Pathfinder.getTransferPath(
      this.address,
      to,
      largeAmount);

    if (!transferPath.isValid) {
      return Promise.resolve(BigInt(0));
    }

    return transferPath.maxFlow;
  }

  /**
   * Utilizes the pathfinder to transitively send `amount` Circles to `to`.
   * @param to The recipient
   * @param amount The amount to send
   */
  async transfer(to: string, amount: bigint): Promise<ContractTransactionReceipt> {
    this.throwIfNotInitialized();

    const transferPath = await this.sdk.v1Pathfinder.getTransferPath(
      this.address,
      to,
      amount);

    if (!transferPath.isValid || transferPath.transferSteps.length === 0) {
      throw new Error(`Couldn't find a valid path from ${this.address} to ${to} for ${amount}.`);
    }

    const tokenOwners = transferPath.transferSteps.map(o => o.token_owner);
    const srcs = transferPath.transferSteps.map(o => o.from);
    const dests = transferPath.transferSteps.map(o => o.to);
    const wads = transferPath.transferSteps.map(o => BigInt(o.value));

    const tx = await this.sdk.v1Hub.transferThrough(tokenOwners, srcs, dests, wads);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error(`The transferThrough call for '${this.address} -> ${to}: ${amount}' didn't yield a receipt.`);
    }

    return receipt;
  }

  async trust(avatar: string) {
    this.throwIfNotInitialized();

    const tx = await this.sdk.v1Hub.trust(avatar, BigInt(100));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error(`The trust call for '${this.address} -> ${avatar}' didn't yield a receipt.`);
    }
    return receipt;
  }

  async untrust(avatar: string) {
    this.throwIfNotInitialized();

    const tx = await this.sdk.v1Hub.trust(avatar, BigInt(0));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error(`The untrust call for '${this.address} -> ${avatar}' didn't yield a receipt.`);
    }
    return receipt;
  }

  getMintableAmount(): Promise<bigint> {
    if (!this.v1Token) {
      return Promise.resolve(BigInt(0));
    }

    return this.v1Token.look();
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
}