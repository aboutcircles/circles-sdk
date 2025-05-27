import {
  PathfindingResult,
  TransferStep
} from './types';
import { CirclesData, CirclesRpc, TokenInfoRow } from '@circles-sdk/data';
import { Address, CirclesConverter } from '@circles-sdk/utils';

export async function getTokenInfoMapFromPath(
  rpcUrl: string,
  transferPath: PathfindingResult
): Promise<Map<string, TokenInfoRow>> {
  const tokenInfoMap = new Map<string, TokenInfoRow>();
  const uniqueAddresses = new Set<string>();

  transferPath.transfers.forEach((t) => {
    uniqueAddresses.add(t.tokenOwner.toLowerCase());
  });

  const circlesData = new CirclesData(new CirclesRpc(rpcUrl));
  const batch = await circlesData.getTokenInfoBatch(
    Array.from(uniqueAddresses) as Address[]
  );
  batch.forEach((info) => {
    tokenInfoMap.set(info.token.toLowerCase(), info);
  });
  return tokenInfoMap;
}

export function getWrappedTokenTotalsFromPath(
  transferPath: PathfindingResult,
  tokenInfoMap: Map<string, TokenInfoRow>
): Record<string, [bigint, string]> {
  const wrappedEdgeTotals: Record<string, [bigint, string]> = {};

  transferPath.transfers.forEach((t) => {
    const info = tokenInfoMap.get(t.tokenOwner.toLowerCase());
    const isWrapper = info && info.type.startsWith('CrcV2_ERC20WrapperDeployed');

    if (isWrapper) {
      if (!wrappedEdgeTotals[t.tokenOwner]) {
        wrappedEdgeTotals[t.tokenOwner] = [BigInt(0), info!.type];
      }
      wrappedEdgeTotals[t.tokenOwner][0] += BigInt(t.value);
    }
  });

  return wrappedEdgeTotals;
}

export function getExpectedUnwrappedTokenTotals(
  wrappedTotals: Record<string, [bigint, string]>,
  tokenInfoMap: Map<string, TokenInfoRow>
): Record<string, [bigint, string]> {
  const unwrapped: Record<string, [bigint, string]> = {};

  Object.entries(wrappedTotals).forEach(([wrapperAddr, [total, type]]) => {
    const info = tokenInfoMap.get(wrapperAddr.toLowerCase());
    if (!info) return;

    const isDemurraged = type === 'CrcV2_ERC20WrapperDeployed_Demurraged';
    const isInflationary = type === 'CrcV2_ERC20WrapperDeployed_Inflationary';

    const unwrapAmount = isDemurraged
      ? total
      : isInflationary
        ? CirclesConverter.attoCirclesToAttoStaticCircles(total)
        : total;

    const availableAfterUnwrap = isDemurraged
      ? unwrapAmount
      : CirclesConverter.attoStaticCirclesToAttoCircles(unwrapAmount);

    unwrapped[wrapperAddr] = [availableAfterUnwrap, info.tokenOwner];
  });

  return unwrapped;
}

export function replaceWrappedTokens(
  path: PathfindingResult,
  unwrapped: Record<string, [bigint, string]>
): PathfindingResult {
  const rewritten = path.transfers.map((edge) => {
    const unwrap = unwrapped[edge.tokenOwner.toLowerCase()];
    const hasUnwrap = Boolean(unwrap);
    const tokenOwner = hasUnwrap ? unwrap[1] : edge.tokenOwner;
    return { ...edge, tokenOwner };
  });

  return { ...path, transfers: rewritten };
}

export function shrinkPathValues(
  path: PathfindingResult,
  retainBps: bigint = BigInt(999_999_999_999)
): PathfindingResult {
  type Edge = TransferStep & { _idx: number };

  const incomingToSink = new Map<string, bigint>();
  const scaled: Edge[] = [];

  const DENOM = BigInt(1_000_000_000_000);

  path.transfers.forEach((edge, i) => {
    const scaledValue = (BigInt(edge.value) * retainBps) / DENOM;
    const isZero = scaledValue === BigInt(0);
    if (isZero) {
      return; // drop sub‑unit flows
    }

    scaled.push({ ...edge, value: scaledValue.toString(), _idx: i });
    incomingToSink.set(edge.to, (incomingToSink.get(edge.to) ?? BigInt(0)) + scaledValue);
  });

  const senders = new Set(scaled.map((e) => e.from.toLowerCase()));
  const sink = scaled.find((e) => !senders.has(e.to.toLowerCase()))?.to;

  const maxFlow = sink ? incomingToSink.get(sink.toLowerCase()) ?? BigInt(0) : BigInt(0);

  // Re‑establish original order for deterministic unit tests
  scaled.sort((a, b) => a._idx - b._idx);

  return {
    maxFlow: maxFlow.toString(),
    transfers: scaled.map(({ _idx, ...rest }) => rest)
  };
}

export function assertNoNettedFlowMismatch(path: PathfindingResult): void {
  const { source, sink } = getSourceAndSink(path);
  const net = computeNettedFlow(path);

  net.forEach((balance, addr) => {
    const isSource = addr === source;
    const isSink = addr === sink;

    if (isSource && balance >= BigInt(0)) {
      throw new Error(`Source ${addr} should be net negative, got ${balance}`);
    }
    if (isSink && balance <= BigInt(0)) {
      throw new Error(`Sink ${addr} should be net positive, got ${balance}`);
    }
    const isIntermediate = !isSource && !isSink;
    if (isIntermediate && balance !== BigInt(0)) {
      throw new Error(`Vertex ${addr} is unbalanced: ${balance}`);
    }
  });
}

function getSourceAndSink(path: PathfindingResult): {
  source: string;
  sink: string;
} {
  const senders = new Set(path.transfers.map((t) => t.from.toLowerCase()));
  const receivers = new Set(path.transfers.map((t) => t.to.toLowerCase()));

  const source = [...senders].find((a) => !receivers.has(a));
  const sink = [...receivers].find((a) => !senders.has(a));

  if (!source || !sink) {
    throw new Error("Could not determine unique source / sink");
  }

  return { source, sink };
}

export function computeNettedFlow(path: PathfindingResult): Map<string, bigint> {
  const net = new Map<string, bigint>();

  path.transfers.forEach(({ from, to, value }) => {
    const amount = BigInt(value);
    net.set(from.toLowerCase(), (net.get(from.toLowerCase()) ?? BigInt(0)) - amount);
    net.set(to.toLowerCase(), (net.get(to.toLowerCase()) ?? BigInt(0)) + amount);
  });

  return net;
}