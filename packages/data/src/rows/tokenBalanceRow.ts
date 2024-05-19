import { Row } from '../pagedQuery/row';

export interface TokenBalanceRow extends Row {
  token: string;
  balance: string;
  tokenOwner: string;
}