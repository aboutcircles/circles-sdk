import { CirclesQuery } from './pagedQuery/circlesQuery';
import { TransactionHistoryRow } from './rows/transactionHistoryRow';
import { TrustListRow } from './rows/trustListRow';
import { TokenBalanceRow } from './rows/tokenBalanceRow';
import { CirclesRpc } from './circlesRpc';
import { AvatarRow } from './rows/avatarRow';
import { crcToTc } from '@circles-sdk/utils';
import { ethers } from 'ethers';

export interface ICirclesData {
  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address/id.
   * @param avatar The address to check.
   * @returns The avatar information or undefined if the address is not an avatar.
   */
  getAvatarInfo(avatar: string): Promise<AvatarRow | undefined>;

  /**
   * Gets the total CRC v1 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   * @returns The total CRC balance (either as TC 'number' or as CRC in 'wei').
   */
  getTotalBalance(avatar: string, asTimeCircles: boolean): Promise<string>;

  /**
   * Gets the total CRC v2 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   */
  getTotalBalanceV2(avatar: string, asTimeCircles: boolean): Promise<string>;

  /**
   * Gets the detailed CRC v1 token balances of an address.
   * @param avatar The address to get the token balances for.
   * @param asTimeCircles Whether to return the balances as TimeCircles or not (default: true).
   */
  getTokenBalances(avatar: string, asTimeCircles: boolean): Promise<TokenBalanceRow[]>;

  /**
   * Gets the detailed CRC v2 token balances of an address.
   * @param avatar The address to get the token balances for.
   * @param asTimeCircles Whether to return the balances as TimeCircles or not (default: true).
   */
  getTokenBalancesV2(avatar: string, asTimeCircles: boolean): Promise<TokenBalanceRow[]>;

  /**
   * Gets the transaction history of an address.
   * This contains incoming/outgoing transactions and minting of CRC (in v1 and v2).
   * @param avatar The address to get the transaction history for.
   * @param pageSize The maximum number of transactions per page.
   */
  getTransactionHistory(avatar: string, pageSize: number): CirclesQuery<TransactionHistoryRow>;

  /**
   * Gets the current incoming and outgoing trust relations of an address (in v1 and v2).
   * @param avatar The address to get the trust list for.
   * @param pageSize The maximum number of trust relations per page.
   */
  getTrustRelations(avatar: string, pageSize: number): CirclesQuery<TrustListRow>;
}

export class CirclesData implements ICirclesData {
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
      sortOrder: 'DESC',
      limit: 1
    });

    if (!await circlesQuery.queryNextPage()) {
      return undefined;
    }

    return circlesQuery.currentPage?.results[0];
  }
}