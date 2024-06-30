import { CirclesQuery } from './pagedQuery/circlesQuery';
import { TransactionHistoryRow } from './rows/transactionHistoryRow';
import { TrustListRow } from './rows/trustListRow';
import { TokenBalanceRow } from './rows/tokenBalanceRow';
import { CirclesRpc } from './circlesRpc';
import { AvatarRow } from './rows/avatarRow';
import { crcToTc } from '@circles-sdk/utils';
import { ethers } from 'ethers';
import { TrustRelation, TrustRelationRow } from './rows/trustRelationRow';
import { CirclesDataInterface, GroupQueryParams } from './circlesDataInterface';
import { Observable } from './observable';
import { CirclesEvent } from './events/events';
import { InvitationRow } from './rows/invitationRow';
import { PagedQueryParams } from './pagedQuery/pagedQueryParams';
import { Filter } from './rpcSchema/filter';
import { GroupMembershipRow } from './rows/groupMembershipRow';
import { GroupRow } from './rows/groupRow';

export class CirclesData implements CirclesDataInterface {
  readonly rpc: CirclesRpc;

  constructor(rpc: CirclesRpc) {
    this.rpc = rpc;
  }

  /**
   * Gets the total CRC v1 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   */
  async getTotalBalance(avatar: string, asTimeCircles: boolean = true): Promise<string> {
    const response = await this.rpc.call<string>('circles_getTotalBalance', [avatar, asTimeCircles]);
    return response.result;
  }

  /**
   * Gets the total CRC v2 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   */
  async getTotalBalanceV2(avatar: string, asTimeCircles: boolean = true): Promise<string> {
    const response = await this.rpc.call<string>('circlesV2_getTotalBalance', [avatar, asTimeCircles]);
    return response.result;
  }

  /**
   * Gets the detailed CRC v1 token balances of an address.
   * @param avatar The address to get the token balances for.
   * @param asTimeCircles Whether to return the balances as TimeCircles or not (default: true).
   */
  async getTokenBalances(avatar: string, asTimeCircles: boolean = true): Promise<TokenBalanceRow[]> {
    const response = await this.rpc.call<TokenBalanceRow[]>('circles_getTokenBalances', [avatar, asTimeCircles]);
    return response.result;
  }

  /**
   * Gets the detailed CRC v2 token balances of an address.
   * @param avatar The address to get the token balances for.
   * @param asTimeCircles Whether to return the balances as TimeCircles or not (default: true).
   */
  async getTokenBalancesV2(avatar: string, asTimeCircles: boolean = true): Promise<TokenBalanceRow[]> {
    const response = await this.rpc.call<TokenBalanceRow[]>('circlesV2_getTokenBalances', [avatar, asTimeCircles]);
    return response.result;
  }

  /**
   * Gets the transaction history of an address.
   * This contains incoming/outgoing transactions and minting of CRC.
   * @param avatar The address to get the transaction history for.
   * @param pageSize The maximum number of transactions per page.
   */
  getTransactionHistory(avatar: string, pageSize: number): CirclesQuery<TransactionHistoryRow> {
    return new CirclesQuery<any>(this.rpc, {
      namespace: 'V_Crc',
      table: 'Transfers',
      sortOrder: 'DESC',
      limit: pageSize,
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'batchIndex',
        'transactionHash',
        'version',
        'operator',
        'from',
        'to',
        'id',
        'value'
      ],
      filter: [
        {
          Type: 'Conjunction',
          ConjunctionType: 'Or',
          Predicates: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'from',
              Value: avatar.toLowerCase()
            },
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'to',
              Value: avatar.toLowerCase()
            }
          ]
        }
      ]
    }, [{
      name: 'timeCircles',
      generator: (row: TransactionHistoryRow) => {
        if (row.version === 1) {
          const timestamp = new Date(row.timestamp * 1000);
          return crcToTc(timestamp, BigInt(row.value)).toFixed(2);
        } else {
          return parseFloat(ethers.formatEther(row.value)).toFixed(2);
        }
      }
    }]);
  }

  /**
   * Gets the current incoming and outgoing trust relations of an address.
   * Expired or revoked trust relations are not included.
   * @param avatar The address to get the trust list for.
   * @param pageSize The maximum number of trust relations per page.
   */
  getTrustRelations(avatar: string, pageSize: number): CirclesQuery<TrustListRow> {
    return new CirclesQuery<any>(this.rpc, {
      namespace: 'V_Crc',
      table: 'TrustRelations',
      sortOrder: 'DESC',
      limit: pageSize,
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'transactionHash',
        'version',
        'trustee',
        'truster',
        'expiryTime',
        'limit'
      ],
      filter: [
        {
          Type: 'Conjunction',
          ConjunctionType: 'Or',
          Predicates: [
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'trustee',
              Value: avatar.toLowerCase()
            },
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'truster',
              Value: avatar.toLowerCase()
            }
          ]
        }
      ]
    });
  }

  async getAggregatedTrustRelations(avatarAddress: string): Promise<TrustRelationRow[]> {
    const pageSize = 1000;
    const trustsQuery = this.getTrustRelations(avatarAddress, pageSize);
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
      if (row.truster !== avatarAddress) {
        trustBucket[row.truster] = trustBucket[row.truster] || [];
        trustBucket[row.truster].push(row);
      }
      if (row.trustee !== avatarAddress) {
        trustBucket[row.trustee] = trustBucket[row.trustee] || [];
        trustBucket[row.trustee].push(row);
      }
    });

    // Determine trust relations
    return Object.entries(trustBucket)
      .filter(([avatar]) => avatar !== avatarAddress)
      .map(([avatar, rows]) => {
        const maxTimestamp = Math.max(...rows.map(o => o.timestamp));
        let relation: TrustRelation;

        if (rows.length === 2) {
          relation = 'mutuallyTrusts';
        } else if (rows[0].trustee === avatarAddress) {
          relation = 'trustedBy';
        } else if (rows[0].truster === avatarAddress) {
          relation = 'trusts';
        } else {
          throw new Error(`Unexpected trust list row. Couldn't determine trust relation.`);
        }

        return {
          subjectAvatar: avatarAddress,
          relation: relation,
          objectAvatar: avatar,
          timestamp: maxTimestamp
        };
      });
  }

  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address/id.
   * @param avatar The address to check.
   */
  async getAvatarInfo(avatar: string): Promise<AvatarRow | undefined> {
    const circlesQuery = new CirclesQuery<AvatarRow>(this.rpc, {
      namespace: 'V_Crc',
      table: 'Avatars',
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'transactionHash',
        'version',
        'type',
        'avatar',
        'tokenId'
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'avatar',
          Value: avatar.toLowerCase()
        }
      ],
      sortOrder: 'ASC',
      limit: 1000
    });

    if (!await circlesQuery.queryNextPage()) {
      return undefined;
    }

    const result = circlesQuery.currentPage?.results ?? [];
    let returnValue: AvatarRow | undefined = undefined;

    for (const avatarRow of result) {
      if (returnValue === undefined) {
        returnValue = avatarRow;
      }

      if (avatarRow.version === 1) {
        returnValue.hasV1 = true;
        returnValue.v1Token = avatarRow.tokenId;
      } else {
        returnValue = {
          ...returnValue,
          ...avatarRow
        };
      }
    }

    return returnValue;
  }

  /**
   * Subscribes to Circles events.
   * @param avatar The avatar to subscribe to. If not provided, all events are subscribed to.
   */
  subscribeToEvents(avatar?: string): Promise<Observable<CirclesEvent>> {
    return this.rpc.subscribe(avatar);
  }

  /**
   * Gets the invitations sent by an avatar.
   * @param avatar The avatar to get the invitations for.
   * @param pageSize The maximum number of invitations per page.
   * @returns A CirclesQuery object to fetch the invitations.
   */
  getInvitations(avatar: string, pageSize: number): CirclesQuery<InvitationRow> {
    return new CirclesQuery<InvitationRow>(this.rpc, {
      namespace: 'CrcV2',
      table: 'InviteHuman',
      columns: [
        'blockNumber',
        'transactionIndex',
        'logIndex',
        'timestamp',
        'transactionHash',
        'inviter',
        'invited'
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'inviter',
          Value: avatar.toLowerCase()
        }
      ],
      sortOrder: 'DESC',
      limit: pageSize
    });
  }

  /**
   * Gets the avatar that invited the given avatar.
   * @param avatar The address of the invited avatar.
   * @returns The address of the inviting avatar or undefined if not found.
   */
  async getInvitedBy(avatar: string): Promise<string | undefined> {
    const circlesQuery = new CirclesQuery<InvitationRow>(this.rpc, {
      namespace: 'CrcV2',
      table: 'InviteHuman',
      columns: [
        'inviter'
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'invited',
          Value: avatar.toLowerCase()
        }
      ],
      sortOrder: 'DESC',
      limit: 1
    });

    const page = await circlesQuery.queryNextPage();
    if (!page) {
      return undefined;
    }

    return circlesQuery.currentPage?.results[0].inviter;
  }

  /**
   * Gets the list of groups.
   * @param pageSize The maximum number of groups per page.
   * @param params The query parameters to filter the groups.
   */
  findGroups(pageSize: number, params?: GroupQueryParams): CirclesQuery<GroupRow> {
    const queryDefintion: PagedQueryParams = {
      namespace: 'CrcV2',
      table: 'RegisterGroup',
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'transactionHash',
        'group',
        'mint',
        'treasury',
        'name',
        'symbol'
      ],
      sortOrder: 'DESC',
      limit: pageSize
    };

    if (!params) {
      return new CirclesQuery<GroupRow>(this.rpc, queryDefintion);
    }

    let filter: Filter[] = [];

    if (params.nameStartsWith) {
      filter.push({
        Type: 'FilterPredicate',
        FilterType: 'Like',
        Column: 'name',
        Value: params.symbolStartsWith + '%'
      });
    }

    if (params.symbolStartsWith) {
      filter.push({
        Type: 'FilterPredicate',
        FilterType: 'Like',
        Column: 'symbol',
        Value: params.symbolStartsWith + '%'
      });
    }

    if (params.groupAddressIn) {
      filter.push({
        Type: 'FilterPredicate',
        FilterType: 'In',
        Column: 'group',
        Value: params.groupAddressIn
      });
    }

    if (filter.length > 1) {
      filter = [{
        Type: 'Conjunction',
        Predicates: filter,
        ConjunctionType: 'And'
      }];
    }

    queryDefintion.filter = filter;

    return new CirclesQuery<any>(this.rpc, queryDefintion);
  }

  /**
   * Gets the group memberships of an avatar.
   * @param avatar The avatar to get the group memberships for.
   * @param pageSize The maximum number of group memberships per page.
   */
  getGroupMemberships(avatar: string, pageSize: number): CirclesQuery<GroupMembershipRow> {
    return new CirclesQuery<GroupMembershipRow>(this.rpc, {
      namespace: 'V_CrcV2',
      table: 'GroupMemberships',
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'transactionHash',
        'group',
        'member',
        'expiryTime'
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'member',
          Value: avatar.toLowerCase()
        }
      ],
      sortOrder: 'DESC',
      limit: pageSize
    });
  }
}