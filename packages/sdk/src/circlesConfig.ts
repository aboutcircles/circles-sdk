import { Address } from "@circles-sdk/utils";

export interface CirclesConfig {
  readonly pathfinderUrl?: string;
  readonly circlesRpcUrl: string;
  readonly profileServiceUrl?: string;
  readonly v1HubAddress: Address;
  readonly v2HubAddress?: Address;
  readonly nameRegistryAddress?: Address;
  readonly v1NameRegistryAddress?: Address;
  readonly migrationAddress?: Address;
  readonly baseGroupMintPolicy?: string;
  readonly standardTreasury?: string;
  readonly coreMembersGroupDeployer?: string;
  readonly baseGroupDeployer?: string;
}