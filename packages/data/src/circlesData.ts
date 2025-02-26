import { CirclesQuery } from './pagedQuery/circlesQuery';
import { TransactionHistoryRow } from './rows/transactionHistoryRow';
import { TrustListRow } from './rows/trustListRow';
import { TokenBalanceRow } from './rows/tokenBalanceRow';
import { CirclesRpc } from './circlesRpc';
import { AvatarRow } from './rows/avatarRow';
import {
  Address,
  attoCirclesToCircles,
  attoCirclesToStaticAttoCircles, circlesToAttoCircles,
  crcToTc,
  hexStringToUint8Array, staticAttoCirclesToAttoCircles,
  tcToCrc,
  uint8ArrayToCidV0
} from '@circles-sdk/utils';
import { TrustRelation, TrustRelationRow } from './rows/trustRelationRow';
import { CirclesDataInterface, GroupQueryParams } from './circlesDataInterface';
import { Observable } from './observable';
import { CirclesEvent } from './events/events';
import { InvitationRow } from './rows/invitationRow';
import { PagedQueryParams } from './pagedQuery/pagedQueryParams';
import { Filter } from './rpcSchema/filter';
import { GroupMembershipRow } from './rows/groupMembershipRow';
import { GroupRow } from './rows/groupRow';
import { TokenInfoRow } from './rows/tokenInfoRow';
import { parseRpcSubscriptionMessage, RcpSubscriptionEvent } from './events/parser';
import { FilterPredicate } from "./rpcSchema/filterPredicate";
import { EventRow } from "./pagedQuery/eventRow";

export type TrustEvent = {
  blockNumber: number;
  timestamp: number;
  transactionIndex: number;
  logIndex: number;
  transactionHash: string;
  trustee: Address;
  truster: Address;
  expiryTime: number;
};

export type TokenInfo = {
  isErc20: boolean,
  isErc1155: boolean,
  isWrapped: boolean,
  isInflationary: boolean,
  isGroup: boolean
};

export const TokenTypes: Record<string, TokenInfo> = {
  "CrcV1_Signup": {
    isErc20: true,
    isErc1155: false,
    isWrapped: false,
    isInflationary: true,
    isGroup: false
  },
  "CrcV2_RegisterHuman": {
    isErc20: false,
    isErc1155: true,
    isWrapped: false,
    isInflationary: false,
    isGroup: false
  },
  "CrcV2_RegisterGroup": {
    isErc20: false,
    isErc1155: true,
    isWrapped: false,
    isInflationary: false,
    isGroup: true
  },
  "CrcV2_ERC20WrapperDeployed_Inflationary": {
    isErc20: true,
    isErc1155: false,
    isWrapped: true,
    isInflationary: true,
    isGroup: false
  },
  "CrcV2_ERC20WrapperDeployed_Demurraged": {
    isErc20: true,
    isErc1155: false,
    isWrapped: true,
    isInflationary: false,
    isGroup: false
  }
}

function calculateBalances(row: TransactionHistoryRow) {
  try {
    const rawBalance = row.value;
    let tokenInfo: TokenInfo;

    if (row.version === 1) {
      // CrcHubTransfer
      tokenInfo = {
        isErc20: true,
        isErc1155: false,
        isGroup: false,
        isInflationary: true,
        isWrapped: false
      };
    } else {
      tokenInfo = {
        isErc20: false,
        isErc1155: true,
        isGroup: false,
        isInflationary: false,
        isWrapped: false
      };
    }

    let attoCircles: bigint;
    let circles: number;
    let staticAttoCircles: bigint;
    let staticCircles: number;
    let attoCrc: bigint;
    let crc: number;

    if (row.version === 1) {
      attoCrc = BigInt(rawBalance);
      crc = attoCirclesToCircles(attoCrc);

      circles = crcToTc(new Date(), attoCrc);
      attoCircles = circlesToAttoCircles(circles);

      staticAttoCircles = attoCirclesToStaticAttoCircles(attoCircles);
      staticCircles = attoCirclesToCircles(staticAttoCircles);
    } else {
      if (tokenInfo?.isInflationary) {
        staticAttoCircles = BigInt(rawBalance);
        staticCircles = attoCirclesToCircles(staticAttoCircles);

        attoCircles = staticAttoCirclesToAttoCircles(staticAttoCircles);
        circles = attoCirclesToCircles(attoCircles);

        attoCrc = tcToCrc(new Date(), circles);
        crc = attoCirclesToCircles(attoCrc);
      } else {
        attoCircles = BigInt(rawBalance);
        circles = attoCirclesToCircles(attoCircles);

        attoCrc = tcToCrc(new Date(), circles);
        crc = attoCirclesToCircles(attoCrc);

        staticAttoCircles = attoCirclesToStaticAttoCircles(attoCircles);
        staticCircles = attoCirclesToCircles(staticAttoCircles);
      }
    }

    return {
      attoCircles,
      circles,
      staticAttoCircles,
      staticCircles,
      attoCrc,
      crc
    };
  } catch (e) {
    // console.error(e);
    // console.log(row);
    return {
      attoCircles: 0n,
      circles: 0,
      staticAttoCircles: 0n,
      inflationaryCircles: 0,
      attoCrc: 0n,
      crc: 0
    }
  }
}

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
  async getTotalBalance(avatar: Address, asTimeCircles: boolean = true): Promise<string> {
    avatar = avatar.toLowerCase() as Address;
    const response = await this.rpc.call<string>('circles_getTotalBalance', [avatar, asTimeCircles]);
    return response.result;
  }

  /**
   * Gets the total CRC v2 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   */
  async getTotalBalanceV2(avatar: Address, asTimeCircles: boolean = true): Promise<string> {
    avatar = avatar.toLowerCase() as Address;
    const response = await this.rpc.call<string>('circlesV2_getTotalBalance', [avatar, asTimeCircles]);
    return response.result;
  }

  /**
   * Gets the detailed token balances of an address.
   * @param avatar The address to get the token balances for.
   */
  async getTokenBalances(avatar: Address): Promise<TokenBalanceRow[]> {
    avatar = avatar.toLowerCase() as Address;
    const response = await this.rpc.call<TokenBalanceRow[]>('circles_getTokenBalances', [avatar]);
    return response.result;
  }

  /**
   * Gets the transaction history of an address.
   * This contains incoming/outgoing transactions and minting of CRC.
   * @param avatar The address to get the transaction history for.
   * @param pageSize The maximum number of transactions per page.
   */
  getTransactionHistory(avatar: Address, pageSize: number): CirclesQuery<TransactionHistoryRow> {
    avatar = avatar.toLowerCase() as Address;
    return new CirclesQuery<any>(this.rpc, {
      namespace: 'V_Crc',
      table: 'TransferSummary',
      sortOrder: 'DESC',
      limit: pageSize,
      columns: [
        'blockNumber',
        'timestamp',
        'transactionIndex',
        'logIndex',
        'transactionHash',
        'version',
        'from',
        'to',
        'value',
        'events'
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
              Value: avatar
            },
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'to',
              Value: avatar
            }
          ]
        }
      ]
    }, [{
      name: "circles",
      generator: async (row: TransactionHistoryRow) => calculateBalances(row).circles
    }, {
      name: "attoCircles",
      generator: async (row: TransactionHistoryRow) => calculateBalances(row).attoCircles
    }, {
      name: "staticCircles",
      generator: async (row: TransactionHistoryRow) => calculateBalances(row).staticCircles
    }, {
      name: "staticAttoCircles",
      generator: async (row: TransactionHistoryRow) => calculateBalances(row).staticAttoCircles
    }, {
      name: "crc",
      generator: async (row: TransactionHistoryRow) => calculateBalances(row).crc
    }, {
      name: "attoCrc",
      generator: async (row: TransactionHistoryRow) => calculateBalances(row).attoCrc
    }]);
  }

  getIncomingTrustEvents(avatar: Address, pageSize: number): CirclesQuery<TrustEvent> {
    avatar = avatar.toLowerCase() as Address;
    return new CirclesQuery<TrustEvent>(this.rpc, {
      namespace: 'V_Crc',
      table: 'TrustRelations',
      sortOrder: 'DESC',
      limit: pageSize,
      columns: [
        "blockNumber",
        "timestamp",
        "transactionIndex",
        "logIndex",
        "transactionHash",
        "trustee",
        "truster",
        "expiryTime"
      ],
      filter: [
        {
          Type: 'Conjunction',
          ConjunctionType: 'And',
          Predicates: [{
            Type: 'FilterPredicate',
            FilterType: 'Equals',
            Column: 'trustee',
            Value: avatar
          }, {
            Type: 'FilterPredicate',
            FilterType: 'IsNotNull',
            Column: 'expiryTime',
            Value: true
          }]
        }
      ]
    });
  }

  /**
   * Gets the current incoming and outgoing trust relations of an address.
   * Expired or revoked trust relations are not included.
   * @param avatar The address to get the trust list for.
   * @param pageSize The maximum number of trust relations per page.
   */
  getTrustRelations(avatar: Address, pageSize: number): CirclesQuery<TrustListRow> {
    avatar = avatar.toLowerCase() as Address;
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
              Value: avatar
            },
            {
              Type: 'FilterPredicate',
              FilterType: 'Equals',
              Column: 'truster',
              Value: avatar
            }
          ]
        }
      ]
    });
  }

  /**
   * Gets all trust relations of an avatar and groups mutual trust relations together.
   * @param avatarAddress The address to get the trust relations for.
   * @param version The version of the trust relations to get (default: undefined - queries both).
   */
  /**
   * Retrieves and aggregates trust relations for a given avatar.
   *
   * - Fetches all trust relations involving the avatar.
   * - Groups trust relations based on the counterpart (truster/trustee).
   * - Determines the type of relationship: mutual trust, trusts, or trusted by.
   * - Handles cases where relationships differ across versions and includes detailed metadata.
   *
   * @param avatarAddress The address of the avatar to retrieve trust relations for.
   * @param version Optional version filter (defaults to retrieving all versions).
   * @returns Aggregated trust relations, including relation type, versions, and timestamp.
   */
  async getAggregatedTrustRelations(avatarAddress: Address, version?: number): Promise<TrustRelationRow[]> {
    avatarAddress = avatarAddress.toLowerCase() as Address;
    const pageSize = 1000;
    const trustsQuery = this.getTrustRelations(avatarAddress, pageSize);
    let trustListRows: TrustListRow[] = [];

    // Fetch all trust relations
    while (await trustsQuery.queryNextPage()) {
      const resultRows = trustsQuery.currentPage?.results ?? [];
      if (resultRows.length === 0) break;
      trustListRows.push(...resultRows);
      if (resultRows.length < pageSize) break;
    }

    // Filter by version if provided
    if (version !== undefined) {
      trustListRows = trustListRows.filter(row => row.version === version);
    }

    // Group trust list rows by truster and trustee
    const trustBucket: { [avatar: Address]: { rows: TrustListRow[]; version: Set<number> } } = {};
    trustListRows.forEach(row => {
      const addToBucket = (key: Address) => {
        if (!trustBucket[key]) {
          trustBucket[key] = { rows: [], version: new Set() };
        }
        trustBucket[key].rows.push(row);
        trustBucket[key].version.add(row.version);
      };

      if (row.truster !== avatarAddress) {
        addToBucket(row.truster);
      }
      if (row.trustee !== avatarAddress) {
        addToBucket(row.trustee);
      }
    });

    // Determine trust relations
    return Object.entries(trustBucket)
      .filter(([avatar]) => avatar !== avatarAddress)
      .map(([avatar, { rows, version }]) => {
        const versionRelations: { [key: number]: TrustRelation } = {};
        const maxTimestamp = Math.max(...rows.map(o => o.timestamp));

        // Process each version separately
        Array.from(version).forEach(ver => {
          const versionRows = rows.filter(row => row.version === ver);

          if (versionRows.length === 2) {
            versionRelations[ver] = 'mutuallyTrusts';
          } else if (versionRows[0]?.trustee === avatarAddress) {
            versionRelations[ver] = 'trustedBy';
          } else if (versionRows[0]?.truster === avatarAddress) {
            versionRelations[ver] = 'trusts';
          } else {
            throw new Error(`Unexpected trust list row for version ${ver}. Couldn't determine trust relation.`);
          }
        });

        // Combine relations for all versions
        const distinctRelations = Array.from(new Set(Object.values(versionRelations)));

        // If relations differ between versions, mark as "variesByVersion"
        const combinedRelation =
          distinctRelations.length === 1 ? distinctRelations[0] : 'variesByVersion';

        return {
          subjectAvatar: avatarAddress,
          relation: combinedRelation,
          objectAvatar: avatar as Address,
          timestamp: maxTimestamp,
          versions: Array.from(version),
          versionSpecificRelations: versionRelations
        };
      });
  }

  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address/id.
   * @param avatar The address to check.
   * @returns The avatar info or undefined if the avatar is not found.
   */
  async getAvatarInfo(avatar: Address): Promise<AvatarRow | undefined> {
    avatar = avatar.toLowerCase() as Address;
    const avatarInfos = await this.getAvatarInfoBatch([avatar]);
    return avatarInfos.length > 0 ? avatarInfos[0] : undefined;
  }

  /**
   * Gets basic information about multiple avatars.
   * @param avatars The addresses to check.
   * @returns An array of avatar info objects.
   */
  async getAvatarInfoBatch(avatars: Address[]): Promise<AvatarRow[]> {
    if (avatars.length === 0) {
      return [];
    }
    avatars = avatars.map(a => a.toLowerCase() as Address);

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
        'tokenId',
        'cidV0Digest',
        'name'
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'In',
          Column: 'avatar',
          Value: avatars
        }
      ],
      sortOrder: 'ASC',
      limit: 1000
    }, [{
      name: 'cidV0',
      generator: async (row: AvatarRow) => {
        try {
          if (!row.cidV0Digest) {
            return undefined;
          }

          row.isHuman = row.type == "CrcV2_RegisterHuman" || row.type == "CrcV1_Signup";

          const dataFromHexString = hexStringToUint8Array(row.cidV0Digest.substring(2));
          return uint8ArrayToCidV0(dataFromHexString);
        } catch (error) {
          console.error('Failed to convert cidV0Digest to CIDv0 string:', error);
          return undefined;
        }
      }
    }]);

    const results: AvatarRow[] = [];

    while (await circlesQuery.queryNextPage()) {
      const resultRows = circlesQuery.currentPage?.results ?? [];
      if (resultRows.length === 0) break;
      results.push(...resultRows);
      if (resultRows.length < 1000) break;
    }

    const avatarMap: { [key: string]: AvatarRow } = {};

    results.forEach(avatarRow => {
      if (!avatarMap[avatarRow.avatar]) {
        avatarMap[avatarRow.avatar] = avatarRow;
      }

      if (avatarRow.version === 1) {
        avatarMap[avatarRow.avatar].hasV1 = true;
        avatarMap[avatarRow.avatar].v1Token = avatarRow.tokenId as Address;
      } else {
        avatarMap[avatarRow.avatar] = {
          ...avatarMap[avatarRow.avatar],
          ...avatarRow
        };
      }
    });

    return avatars.map(avatar => avatarMap[avatar]).filter(row => row !== undefined);
  }

  /**
   * Gets the token info for a given token address.
   * @param address The address of the token.
   * @returns The token info or undefined if the token is not found.
   */
  async getTokenInfo(address: Address): Promise<TokenInfoRow | undefined> {
    address = address.toLowerCase() as Address;
    const circlesQuery = new CirclesQuery<TokenInfoRow>(this.rpc, {
      namespace: 'V_Crc',
      table: 'Tokens',
      columns: [
        "blockNumber",
        "timestamp",
        "transactionIndex",
        "logIndex",
        "transactionHash",
        "version",
        "type",
        "token",
        "tokenOwner"
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'token',
          Value: address
        }
      ],
      sortOrder: 'ASC',
      limit: 1
    });

    return await circlesQuery.getSingleRow();
  }

  /**
   * Subscribes to Circles events.
   * @param avatar The avatar to subscribe to. If not provided, all events are subscribed to.
   */
  subscribeToEvents(avatar?: Address): Promise<Observable<CirclesEvent>> {
    avatar = avatar?.toLowerCase() as Address;
    return this.rpc.subscribe(avatar);
  }

  /**
   * Gets the events for a given avatar in a block range.
   * @param avatar The avatar to get the events for.
   * @param fromBlock The block number to start from.
   * @param toBlock The block number to end at. If not provided, the latest block is used.
   * @param eventTypes The event types to filter for.
   * @param filters Additional filters to apply (filter columns must be present in all queried event types).
   * @param sortAscending Whether to sort the events ascending or not.
   */
  async getEvents(avatar?: Address, fromBlock?: number, toBlock?: number, eventTypes?: string[], filters?: FilterPredicate[], sortAscending?: boolean): Promise<CirclesEvent[]> {
    avatar = avatar?.toLowerCase() as Address;
    const response = await this.rpc.call<RcpSubscriptionEvent[]>(
      'circles_events',
      [avatar, fromBlock, toBlock, eventTypes, filters, sortAscending]
    );
    return parseRpcSubscriptionMessage(response.result);
  }

  /**
   * Checks if an avatar has been invited to circles by another avatar.
   * @param avatar The avatar to get the invitations for.
   * @returns A list of inviters or an empty list if no invitations are found (or the inviter doesn't have enough balance to pay for the invitation fees).
   */
  async getInvitations(avatar: Address): Promise<AvatarRow[]> {
    avatar = avatar.toLowerCase() as Address;
    const MIN_TOKENS_REQUIRED = 96;

    // Check if the avatar is still on v1 (else not interesting for invitations)
    const avatarInfo = await this.getAvatarInfo(avatar);
    if (avatarInfo?.version == 2) {
      return [];
    }

    // Find all avatars trusting the given avatar.
    // (mutual trust cannot exist in invitation state - to trust back, the avatar must be on v2 already)
    const v2Relations = await this.getAggregatedTrustRelations(avatar, 2);
    const v2Trusters = v2Relations
      .filter(o => o.relation == "trustedBy")
      .map(o => o.objectAvatar);

    const humanInviters: AvatarRow[] = [];
    const trusterInfoBatch = await this.getAvatarInfoBatch(v2Trusters);

    for (const trusterInfo of trusterInfoBatch) {
      // Only humans can inviter other humans
      if (!trusterInfo?.isHuman) {
        continue;
      }

      // If the inviter doesn't have enough tokens, the user cannot accept their invitation.
      // Invitation fees must be paid in the inviter's own token.
      const balances = await this.getTokenBalances(trusterInfo.avatar);
      const inviterOwnToken = balances.find(o => o.tokenAddress == trusterInfo.avatar);
      if (inviterOwnToken && inviterOwnToken.circles >= MIN_TOKENS_REQUIRED) {
        // The inviter has enough tokens to pay for the invitation
        humanInviters.push(trusterInfo);
      }
    }

    return humanInviters;
  }

  /**
   * Gets the avatar that invited the given avatar.
   * @param avatar The address of the invited avatar.
   * @returns The address of the inviting avatar or undefined if not found.
   */
  async getInvitedBy(avatar: Address): Promise<Address | undefined> {
    avatar = avatar.toLowerCase() as Address;
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
          Value: avatar
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
      namespace: 'V_CrcV2',
      table: 'Groups',
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
        'symbol',
        'cidV0Digest',
        'memberCount',
        'trustedCount'
      ],
      sortOrder: "DESC",
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
  getGroupMemberships(avatar: Address, pageSize: number): CirclesQuery<GroupMembershipRow> {
    avatar = avatar.toLowerCase() as Address;
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
          Value: avatar
        }
      ],
      sortOrder: 'DESC',
      limit: pageSize
    });
  }

  /**
   * Gets the metadata CID for an address.
   * @param address
   */
  async getMetadataCidForAddress(address: Address): Promise<string | undefined> {
    address = address.toLowerCase() as Address;
    // Get the newest CID for the given address
    const query = new CirclesQuery<EventRow & {
      metadataDigest: string
    }>(this.rpc, {
      namespace: 'CrcV2',
      table: 'UpdateMetadataDigest',
      columns: [
        'metadataDigest'
      ],
      filter: [
        {
          Type: 'FilterPredicate',
          FilterType: 'Equals',
          Column: 'avatar',
          Value: address
        }
      ],
      sortOrder: 'DESC',
      limit: 1
    });

    if (!await query.queryNextPage()) {
      return undefined;
    }
    const cidHex = query.currentPage?.results[0].metadataDigest;
    if (!cidHex) {
      return undefined;
    }
    const cidArr = hexStringToUint8Array(cidHex.substring(2));
    return uint8ArrayToCidV0(cidArr);
  }
}