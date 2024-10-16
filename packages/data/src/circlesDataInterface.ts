import { AvatarRow } from './rows/avatarRow';
import { TokenBalanceRow } from './rows/tokenBalanceRow';
import { CirclesQuery } from './pagedQuery/circlesQuery';
import { TransactionHistoryRow } from './rows/transactionHistoryRow';
import { TrustListRow } from './rows/trustListRow';
import { TrustRelationRow } from './rows/trustRelationRow';
import { Observable } from './observable';
import { CirclesEvent } from './events/events';
import { InvitationRow } from './rows/invitationRow';
import { GroupRow } from './rows/groupRow';
import { GroupMembershipRow } from './rows/groupMembershipRow';
import { TokenInfoRow } from './rows/tokenInfoRow';

export interface GroupQueryParams {
  nameStartsWith?: string;
  symbolStartsWith?: string;
  groupAddressIn?: string[];
  sortBy?: 'age_asc' | 'age_desc' | 'name_asc' | 'name_desc' | 'symbol_asc' | 'symbol_desc' | 'memberCount_desc' | 'memberCount_asc' | 'trustedCount_desc' | 'trustedCount_asc';
}

export interface CirclesDataInterface {
  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address/id.
   * @param avatar The address to check.
   * @returns The avatar information or undefined if the address is not an avatar.
   */
  getAvatarInfo(avatar: string): Promise<AvatarRow | undefined>;

  /**
   * Gets the token info for a given token address.
   * @param address The address of the token.
   * @returns The token info or undefined if the token is not found.
   */
  getTokenInfo(address: string): Promise<TokenInfoRow | undefined>;

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

  /**
   * Gets all trust relations of an avatar and groups mutual trust relations together.
   * @param avatar The address to get the trust relations for.
   */
  getAggregatedTrustRelations(avatar: string): Promise<TrustRelationRow[]>;

  /**
   * Subscribes to Circles events.
   * @param avatar The address to subscribe to events for. If not provided, subscribes to all events.
   */
  subscribeToEvents(avatar?: string): Promise<Observable<CirclesEvent>>;

  /**
   * Gets the list of avatars that have invited the given avatar.
   * @param avatar The address to get the invitations for.
   * @param pageSize The maximum number of invitations per page.
   */
  getInvitations(avatar: string, pageSize: number): CirclesQuery<InvitationRow>;

  /**
   * Gets the avatar that invited the given avatar.
   * @param avatar The address to get the inviter for.
   */
  getInvitedBy(avatar: string): Promise<string | undefined>;

  /**
   * Gets the list of groups.
   * @param pageSize The maximum number of groups per page.
   * @param params The query parameters to filter the groups.
   */
  findGroups(pageSize: number, params?: GroupQueryParams): CirclesQuery<GroupRow>;

  /**
   * Gets the list of groups that the given avatar is a member of.
   * @param avatar The address to get the group memberships for.
   * @param pageSize The maximum number of group memberships per page.
   */
  getGroupMemberships(avatar: string, pageSize: number): CirclesQuery<GroupMembershipRow>;
}