import { Address } from '@circles-sdk/utils';

export interface TransferPathStep {
  readonly from: Address;
  readonly to: Address;
  readonly tokenOwner: Address;
  readonly value: string;
}

export type MaxFlowResponse = {
  maxFlow: string;
  transfers: TransferPathStep[];
};

export interface TransferPathStep {
  readonly from: Address;
  readonly to: Address;
  readonly tokenOwner: Address;
  readonly value: string;
}