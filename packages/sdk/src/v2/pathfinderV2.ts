import { CirclesRpc } from '@circles-sdk/data';
import { Address } from '@circles-sdk/utils';
import {
  FlowEdge,
  FlowMatrix,
  MaxFlowResponse,
  Stream,
  TransferPathStep
} from '../pathfinderTypes';

export class V2Pathfinder {
  private rpc: CirclesRpc;

  constructor(circlesRpcUrl: string) {
    this.rpc = new CirclesRpc(circlesRpcUrl); // Using CirclesRpc class
  }

  async getMaxFlow(from: Address, to: Address, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<bigint> {
    const requestBody = {
      Source: from,
      Sink: to,
      TargetFlow: '99999999999999999999999999999999999999', // A large target flow
      WithWrap: useWrappedBalances,
      FromTokens: fromTokens,
      ToTokens: toTokens
    };

    const response = await this.rpc.call<MaxFlowResponse>('circlesV2_findPath', [requestBody]);
    return BigInt(response.result.maxFlow);
  }

  async getPath(from: Address, to: Address, value: string, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<MaxFlowResponse> {
    const requestBody = {
      Source: from,
      Sink: to,
      TargetFlow: value.toString(),
      WithWrap: useWrappedBalances,
      FromTokens: fromTokens,
      ToTokens: toTokens
    };

    const response = await this.rpc.call<MaxFlowResponse>('circlesV2_findPath', [requestBody]);
    return response.result;
  }

  createFlowMatrix(from: Address, to: Address, value: string, transfers: TransferPathStep[]): FlowMatrix {
    from = from.toLowerCase() as Address;
    to = to.toLowerCase() as Address;
    transfers = transfers.map(t => ({
      ...t,
      from: t.from.toLowerCase() as Address,
      to: t.to.toLowerCase() as Address,
      tokenOwner: t.tokenOwner.toLowerCase() as Address
    }));

    const expectedValue = BigInt(value);

    // Transform transfers to flow matrix structure with normalized addresses
    const {
      sortedAddresses,
      lookUpMap
    } = transformToFlowVertices(transfers, from, to);

    // Initialize flow edges
    const flowEdges: FlowEdge[] = transfers.map((transfer) => ({
      streamSinkId: transfer.to === to ? 1 : 0, // Set streamSinkId to 1 if transfer.to matches the given 'to' address
      amount: BigInt(transfer.value) // Convert string value to bigint
    }));

    // Ensure at least one terminal edge is marked
    if (!flowEdges.some((edge) => edge.streamSinkId === 1)) {
      // Find the last edge where transfer.to matches the sink address
      const lastIndex = transfers.map((t) => t.to).lastIndexOf(to);
      if (lastIndex !== -1) {
        flowEdges[lastIndex].streamSinkId = 1;
      } else {
        // If not found, set the last edge as terminal by default
        flowEdges[flowEdges.length - 1].streamSinkId = 1;
      }
    }

    // Check if the sum of terminal amounts matches the provided value
    const totalTerminalAmount = flowEdges
      .filter((edge) => edge.streamSinkId === 1)
      .reduce((sum, edge) => sum + edge.amount, BigInt(0));

    if (totalTerminalAmount !== expectedValue) {
      throw new Error(`The total terminal amount (${totalTerminalAmount}) does not match the provided value (${expectedValue}).`);
    }

    // Initialize stream object
    const flowEdgeIds: number[] = flowEdges
      .map((edge, index) => (edge.streamSinkId === 1 ? index : -1))
      .filter((index) => index !== -1);

    const stream: Stream = {
      sourceCoordinate: lookUpMap[from],
      flowEdgeIds: flowEdgeIds,
      data: new Uint8Array() // Empty bytes for now
    };

    // Get coordinates for each triple (tokenOwner, sender, receiver) and pack them
    const coordinates: number[] = [];
    for (const transfer of transfers) {
      coordinates.push(lookUpMap[transfer.tokenOwner]);
      coordinates.push(lookUpMap[transfer.from]);
      coordinates.push(lookUpMap[transfer.to]);
    }
    const packedCoordinates = packCoordinates(coordinates);

    return {
      flowVertices: sortedAddresses,
      flowEdges: flowEdges,
      streams: [stream],
      packedCoordinates: packedCoordinates,
      sourceCoordinate: lookUpMap[from] // Add sourceCoordinate using the lookup map
    };
  }

  // async getArgsForPath(from: Address, to: Address, value: string, useWrappedBalances?: boolean, fromTokens?: Address[], toTokens?: Address[]): Promise<FlowMatrix> {
  //   const requestBody = {
  //     Source: from,
  //     Sink: to,
  //     TargetFlow: value.toString(),
  //     WithWrap: useWrappedBalances,
  //     FromTokens: fromTokens,
  //     ToTokens: toTokens
  //   };
  //
  //   const response = await this.rpc.call<MaxFlowResponse>('circlesV2_findPath', [requestBody]);
  //   const transfers = response.result.transfers;
  //
  //   if (transfers.length > 0) {
  //     return createFlowMatrix(from, to, value, transfers);
  //   } else {
  //     throw new Error('No transfers found in response from pathfinder');
  //   }
  // }
}

function transformToFlowVertices(transfers: TransferPathStep[], from: Address, to: Address) {
  from = from.toLowerCase() as Address;
  to = to.toLowerCase() as Address;
  transfers = transfers.map(t => ({
    ...t,
    from: t.from.toLowerCase() as Address,
    to: t.to.toLowerCase() as Address,
    tokenOwner: t.tokenOwner.toLowerCase() as Address
  }));
  // Normalize and extract all unique addresses from transfers
  const addressSet = new Set<string>();
  addressSet.add(from);
  addressSet.add(to);
  for (const transfer of transfers) {
    addressSet.add(transfer.from);
    addressSet.add(transfer.to);
    addressSet.add(transfer.tokenOwner);
  }

  // Convert addresses to BigInt and sort
  const sortedAddresses = Array.from(addressSet).sort((a, b) => {
    const uint160A = BigInt(a);
    const uint160B = BigInt(b);
    return uint160A < uint160B ? -1 : uint160A > uint160B ? 1 : 0;
  });

  // Create the lookup map
  const lookUpMap: { [address: string]: number } = {};
  sortedAddresses.forEach((address, index) => {
    lookUpMap[address] = index;
  });

  return {
    sortedAddresses: sortedAddresses,
    lookUpMap: lookUpMap
  };
}

function packCoordinates(coordinates: number[]): Uint8Array {
  const packedCoordinates = new Uint8Array(coordinates.length * 2);
  for (let i = 0; i < coordinates.length; i++) {
    packedCoordinates[2 * i] = coordinates[i] >> 8; // High byte
    packedCoordinates[2 * i + 1] = coordinates[i] & 0xff; // Low byte
  }
  return packedCoordinates;
}
