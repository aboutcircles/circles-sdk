export interface CirclesConfig {
  readonly v2PathfinderUrl?: string;
  readonly pathfinderUrl?: string;
  readonly circlesRpcUrl: string;
  readonly profileServiceUrl?: string;
  readonly v1HubAddress: string;
  readonly v2HubAddress?: string;
  readonly nameRegistryAddress?: string;
  readonly migrationAddress?: string;
  readonly baseGroupMintPolicy?: string;
  readonly standardTreasuryPolicy?: string;
}