import { FlowEdge, FlowMatrix, Stream, TransferStep } from './types';
import { packCoordinates, transformToFlowVertices } from './packing';
import { Address } from '@circles-sdk/utils';

/**
 * Create an ABI‑ready FlowMatrix object from a list of TransferSteps.
 */
export function createFlowMatrix(
  from: Address,
  to: Address,
  value: string,
  transfers: TransferStep[]
): FlowMatrix {
  const sender = from.toLowerCase();
  const receiver = to.toLowerCase();

  const { sorted: flowVertices, idx } = transformToFlowVertices(
    transfers,
    sender,
    receiver
  );

  const flowEdges: FlowEdge[] = transfers.map((t) => {
    const isTerminal = t.to.toLowerCase() === receiver;
    return {
      streamSinkId: isTerminal ? 1 : 0,
      amount: t.value // keep as string – ethers will convert
    };
  });

  // Ensure at least one terminal edge
  const hasTerminalEdge = flowEdges.some((e) => e.streamSinkId === 1);
  if (!hasTerminalEdge) {
    const lastEdgeIndex = transfers
      .map((t) => t.to.toLowerCase())
      .lastIndexOf(receiver);
    const fallbackIndex =
      lastEdgeIndex === -1 ? flowEdges.length - 1 : lastEdgeIndex;
    flowEdges[fallbackIndex].streamSinkId = 1;
  }

  const termEdgeIds = flowEdges
    .map((e, i) => (e.streamSinkId === 1 ? i : -1))
    .filter((i) => i !== -1);

  const streams: Stream[] = [
    {
      sourceCoordinate: idx[sender],
      flowEdgeIds: termEdgeIds,
      data: new Uint8Array(0)
    }
  ];

  const coords: number[] = [];
  transfers.forEach((t) => {
    coords.push(idx[t.tokenOwner.toLowerCase()]);
    coords.push(idx[t.from.toLowerCase()]);
    coords.push(idx[t.to.toLowerCase()]);
  });

  const packedCoordinates = packCoordinates(coords);

  const expected = BigInt(value);
  const terminalSum = flowEdges
    .filter((e) => e.streamSinkId === 1)
    .reduce((sum, e) => sum + BigInt(e.amount.toString()), BigInt(0));

  const isBalanced = terminalSum === expected;
  if (!isBalanced) {
    throw new Error(`Terminal sum ${terminalSum} does not equal expected ${expected}`);
  }

  return {
    flowVertices,
    flowEdges,
    streams,
    packedCoordinates,
    sourceCoordinate: idx[sender]
  };
}