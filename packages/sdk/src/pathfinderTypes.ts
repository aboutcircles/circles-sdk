import { Address } from '@circles-sdk/utils';

export interface TransferPathStep {
  readonly from: Address;
  readonly to: Address;
  readonly tokenOwner: Address;
  readonly value: string;
}

export type FlowEdge = {
  streamSinkId: number;
  amount: bigint;
};

export type Stream = {
  sourceCoordinate: number;
  flowEdgeIds: number[];
  data: Uint8Array;
};

export type FlowMatrix = {
  flowVertices: string[];
  flowEdges: FlowEdge[];
  streams: Stream[];
  packedCoordinates: Uint8Array;
  sourceCoordinate: number;
};

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