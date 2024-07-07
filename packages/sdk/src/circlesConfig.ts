export interface CirclesConfig {
  readonly pathfinderUrl?: string;
  readonly circlesRpcUrl: string;
  readonly profileServiceUrl?: string;
  readonly v1HubAddress: string;
  readonly v2HubAddress?: string;
  readonly nameRegistryAddress?: string;
  readonly migrationAddress?: string;
}