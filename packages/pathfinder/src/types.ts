import { ethers } from "ethers";

export type PathfindingResult = {
  maxFlow: string;
  transfers: TransferStep[];
};

export type TransferStep = {
  from: string;
  to: string;
  tokenOwner: string;
  value: string;
};

export interface FlowEdge {
  streamSinkId: number;
  amount: ethers.BigNumberish;
}

export interface Stream {
  sourceCoordinate: number;
  flowEdgeIds: number[];
  data: Uint8Array;
}

export interface FlowMatrix {
  flowVertices: string[]; // address[]
  flowEdges: FlowEdge[]; // tuple(uint16,uint192)[]
  streams: Stream[]; // tuple(uint16,uint16[],bytes)[]
  packedCoordinates: string; // hex bytes
  sourceCoordinate: number; // convenience, not part of ABI
}