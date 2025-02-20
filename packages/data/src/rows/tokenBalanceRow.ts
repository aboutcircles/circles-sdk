import { Address } from "@circles-sdk/utils";

export interface TokenBalanceRow {
  tokenAddress: Address;
  tokenId: string;
  tokenOwner: Address;
  tokenType: string;
  version: number;
  attoCircles: string;
  circles: number;
  staticAttoCircles: string;
  staticCircles: number;
  attoCrc: string;
  crc: number;
  isErc20: boolean,
  isErc1155: boolean,
  isWrapped: boolean,
  isInflationary: boolean
  isGroup: boolean;
}