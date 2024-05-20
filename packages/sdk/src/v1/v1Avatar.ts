import { TransactionReceipt } from 'ethers';
import { V1Token } from '@circles-sdk/abi-v1';
import { Sdk } from '../sdk';
import { AvatarRow, TrustListRow } from '@circles-sdk/data';
import { AvatarInterface, TrustRelation, TrustRelationRow } from '../AvatarInterface';

export class V1Avatar implements AvatarInterface {
  public readonly sdk: Sdk;
  readonly address: string;

  get v1Token(): V1Token | undefined {
    return this._v1Token;
  }

  private _v1Token?: V1Token;

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
      this._v1Token = new V1Token(this.sdk.signer, this.avatarInfo.tokenId);
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
  async transfer(to: string, amount: bigint): Promise<TransactionReceipt> {
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

  async personalMint(): Promise<TransactionReceipt> {
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

  async stop(): Promise<TransactionReceipt> {
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
    const trustsQuery = this.sdk.data.getTrustRelations(this.address, 1000);
    let trustListRows: TrustListRow[] = [];

    // Make sure we get all trust relations
    while (await trustsQuery.queryNextPage()) {
      const resultRows = trustsQuery.currentPage?.results;
      if (!resultRows || resultRows.length === 0) {
        break;
      }
      trustListRows = trustListRows.concat(resultRows);
    }

    // Create a bucket for each truster and trustee we encounter (excluding the avatar itself)
    // and collect all trust list rows in these buckets.
    const trustBucket: { [avatar: string]: TrustListRow[] } = {};
    for (const trustListRow of trustListRows) {
      if (trustListRow.truster !== this.address) {
        if (!trustBucket[trustListRow.truster]) {
          trustBucket[trustListRow.truster] = [];
        }
        trustBucket[trustListRow.truster].push(trustListRow);
      }

      if (trustListRow.trustee !== this.address) {
        if (!trustBucket[trustListRow.trustee]) {
          trustBucket[trustListRow.trustee] = [];
        }
        trustBucket[trustListRow.trustee].push(trustListRow);
      }
    }

    const trustRelations: TrustRelationRow[] = [];

    // Every bucket can have 1 or 2 trust list rows.
    // If it has 2, the trust relation is mutual.
    for (const avatar in trustBucket) {
      const trustListRowsInBucket = trustBucket[avatar];
      const maxTimestamp = Math.max(...trustListRowsInBucket.map(o => o.timestamp));

      if (this.address == avatar) {
        continue;
      }

      let relation: TrustRelation;

      if (trustListRowsInBucket.length === 2) {
        relation = 'mutuallyTrusts';
      } else {
        if (trustListRowsInBucket[0].trustee === this.address) {
          relation = 'trustedBy';
        } else if (trustListRowsInBucket[0].truster === this.address) {
          relation = 'trusts';
        } else {
          throw new Error(`Unexpected trust list row. Couldn't determine trust relation.`);
        }
      }
      const trustRelation: TrustRelationRow = {
        subjectAvatar: this.address,
        relation: relation,
        objectAvatar: avatar,
        timestamp: maxTimestamp
      };

      trustRelations.push(trustRelation);
    }

    return trustRelations;
  }
}