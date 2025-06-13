import { TypeDefinitions } from '@circles-sdk/abi-v2/dist/hub/Hub';
import FlowEdgeStruct = TypeDefinitions.FlowEdgeStruct;
import StreamStruct = TypeDefinitions.StreamStruct;

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

export interface FlowMatrix {
  flowVertices: string[]; // address[]
  flowEdges: FlowEdgeStruct[]; // tuple(uint16,uint192)[]
  streams: StreamStruct[]; // tuple(uint16,uint16[],bytes)[]
  packedCoordinates: string; // hex bytes
  sourceCoordinate: number; // convenience, not part of ABI
}