import { ContractTransactionResponse } from 'ethers';
import { Sdk } from '../sdk';
import { AvatarRow, CirclesQuery, TransactionHistoryRow, TrustListRow } from '@circles-sdk/data';
import { AvatarInterface, TrustRelation, TrustRelationRow } from '../AvatarInterface';
import { AvatarEvent } from '../avatar';
import { Observable } from '../observable';
import { Token } from '@circles-sdk/abi-v1/dist/Token';
import { Token__factory } from '@circles-sdk/abi-v1/dist/token';

export class V1Avatar implements AvatarInterface {
  public readonly sdk: Sdk;
  readonly address: string;

  // TODO: Empty stream makes no sense
  readonly events: Observable<AvatarEvent> = Observable.create<AvatarEvent>().property;

  get v1Token(): Token | undefined {
    return this._v1Token;
  }

  private _v1Token?: Token;

  get avatarInfo(): AvatarRow | undefined {
    return this._avatarInfo;
  }

  private _avatarInfo?: AvatarRow;

  constructor(sdk: Sdk, avatarAddress: string) {
    this.sdk = sdk;
    this.address = avatarAddress.toLowerCase();
  }

  async initialize() {
    this._avatarInfo = await this.sdk.data.getAvatarInfo(this.address);

    if (!this.avatarInfo) {
      throw new Error(`Couldn't find avatar info for ${this.address}`);
    }

    if (this.avatarInfo && this.avatarInfo.version > 1) {
      throw new Error('Avatar is not a v1 avatar');
    }

    if (this.avatarInfo && this.avatarInfo.tokenId) {
      this._v1Token = Token__factory.connect(this.avatarInfo.tokenId, this.sdk.signer);
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
    const transferPath = await this.sdk.pathfinder.getTransferPath(
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
  async transfer(to: string, amount: bigint): Promise<ContractTransactionResponse> {
    this.throwIfNotInitialized();

    const transferPath = await this.sdk.pathfinder.getTransferPath(
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

    const receipt = await this.sdk.v1Hub.transferThrough(tokenOwners, srcs, dests, wads);
    if (!receipt) {
      throw new Error(`The transferThrough call for '${this.address} -> ${to}: ${amount}' didn't yield a receipt.`);
    }

    return receipt;
  }

  async trust(avatar: string) {
    this.throwIfNotInitialized();

    const receipt = await this.sdk.v1Hub.trust(avatar, BigInt(100));
    if (!receipt) {
      throw new Error('The trust call didn\'t yield a receipt');
    }

    return receipt;
  }

  async untrust(avatar: string) {
    this.throwIfNotInitialized();

    const receipt = await this.sdk.v1Hub.trust(avatar, BigInt(0));
    if (!receipt) {
      throw new Error('The untust call didn\'t yield a receipt');
    }

    return receipt;
  }

  getMintableAmount(): Promise<bigint> {
    if (!this.v1Token) {
      return Promise.resolve(BigInt(0));
    }

    return this.v1Token.look();
  }

  async personalMint(): Promise<ContractTransactionResponse> {
    this.throwIfNotInitialized();

    if (!this.v1Token) {
      throw new Error('Avatar does not have a token to mint');
    }
    if (await this.v1Token.stopped()) {
      throw new Error('Avatar token is stopped');
    }

    const receipt = await this.v1Token.update();
    if (!receipt) {
      throw new Error('The update call for personalMint didn\'t yield a receipt');
    }

    return receipt;
  }

  async stop(): Promise<ContractTransactionResponse> {
    this.throwIfNotInitialized();

    if (!this.v1Token) {
      throw new Error('Avatar does not have a token to stop');
    }
    if (await this.v1Token.stopped()) {
      throw new Error('Avatar token is already stopped');
    }

    const receipt = await this.v1Token.stop();
    if (!receipt) {
      throw new Error('The stop call didn\'t yield a receipt');
    }

    return receipt;
  }

  private throwIfNotInitialized() {
    if (this._avatarInfo) {
      return;
    }
    throw new Error('Avatar is either not initialized or is not signed up at Circles.');
  }

  async getTrustRelations(): Promise<TrustRelationRow[]> {
    // TODO: Remove magic number `1000`
    //       https://github.com/CirclesUBI/circles-nethermind-plugin/blob/206841901f26d53eefc6bf40cded518695439454/Circles.Index.Query/Select.cs#L15
    const pageSize = 1000;
    const trustsQuery = this.sdk.data.getTrustRelations(this.address, pageSize);
    const trustListRows: TrustListRow[] = [];

    // Fetch all trust relations
    while (await trustsQuery.queryNextPage()) {
      const resultRows = trustsQuery.currentPage?.results ?? [];
      if (resultRows.length === 0) break;
      trustListRows.push(...resultRows);
      if (resultRows.length < pageSize) break;
    }

    // Group trust list rows by truster and trustee
    const trustBucket: { [avatar: string]: TrustListRow[] } = {};
    trustListRows.forEach(row => {
      if (row.truster !== this.address) {
        trustBucket[row.truster] = trustBucket[row.truster] || [];
        trustBucket[row.truster].push(row);
      }
      if (row.trustee !== this.address) {
        trustBucket[row.trustee] = trustBucket[row.trustee] || [];
        trustBucket[row.trustee].push(row);
      }
    });

    // Determine trust relations
    return Object.entries(trustBucket)
      .filter(([avatar]) => avatar !== this.address)
      .map(([avatar, rows]) => {
        const maxTimestamp = Math.max(...rows.map(o => o.timestamp));
        let relation: TrustRelation;

        if (rows.length === 2) {
          relation = 'mutuallyTrusts';
        } else if (rows[0].trustee === this.address) {
          relation = 'trustedBy';
        } else if (rows[0].truster === this.address) {
          relation = 'trusts';
        } else {
          throw new Error(`Unexpected trust list row. Couldn't determine trust relation.`);
        }

        return {
          subjectAvatar: this.address,
          relation: relation,
          objectAvatar: avatar,
          timestamp: maxTimestamp
        };
      });
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