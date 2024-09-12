import { EventRow } from '../pagedQuery/eventRow';

export type TokenType = "CrcV1_Signup!" | "CrcV2_RegisterHuman" | "CrcV2_RegisterGroup" | "CrcV2_ERC20WrapperDeployed_Inflationary" | "CrcV2_ERC20WrapperDeployed_Demurraged";

export interface TokenInfoRow extends EventRow {
  /*

        "blockNumber",
        "timestamp",
        "transactionIndex",
        "logIndex",
        "transactionHash",
        "version",
        "type",
        "token",
        "tokenOwner"
   */
  timestamp: number;
  transactionHash: string;
  version: number;
  type: TokenType;
  token: string;
  tokenOwner: string;
}