export interface ChainConfig {
  readonly pathfinderUrl?: string;
  readonly circlesRpcUrl: string;
  readonly v1HubAddress: string;
  readonly v2HubAddress?: string;
  readonly migrationAddress?: string;
}