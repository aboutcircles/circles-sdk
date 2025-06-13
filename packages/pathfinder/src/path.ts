import {
  PathfindingResult,
  TransferStep
} from './types';
import { CirclesData, TokenInfoRow } from '@circles-sdk/data';
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

  const circlesData = new CirclesData(rpcUrl);
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

    if (type === 'CrcV2_ERC20WrapperDeployed_Demurraged') {
      unwrapped[wrapperAddr] = [total, info.tokenOwner];
    }

    if (type === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
      unwrapped[wrapperAddr] = [CirclesConverter.attoStaticCirclesToAttoCircles(total), info.tokenOwner];
    }
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
  sink: string,
  retainBps: bigint = BigInt(999_999_999_999)
): PathfindingResult {
  const incomingToSink = new Map<string, bigint>();
  const scaled: TransferStep[] = [];

  const DENOM = BigInt(1_000_000_000_000);

  path.transfers.forEach((edge) => {
    const scaledValue = (BigInt(edge.value) * retainBps) / DENOM;
    const isZero = scaledValue === BigInt(0);
    if (isZero) {
      return; // drop sub‑unit flows
    }

    scaled.push({ ...edge, value: scaledValue.toString() });
    incomingToSink.set(edge.to, (incomingToSink.get(edge.to) ?? BigInt(0)) + scaledValue);
  });

  const maxFlow = sink ? incomingToSink.get(sink.toLowerCase()) ?? BigInt(0) : BigInt(0);

  return {
    maxFlow: maxFlow.toString(),
    transfers: scaled
  };
}

export function assertNoNettedFlowMismatch(
  path: PathfindingResult,
  overrideSource?: string,
  overrideSink?: string
): void {
  const net = computeNettedFlow(path);
  const { source, sink } = getSourceAndSink(path, overrideSource, overrideSink);

  const endpointsCoincide = source === sink;

  net.forEach((balance, addr) => {
    /* ----------------------------------------------------------------
     * Closed-loop case → every vertex must net to zero
     * -------------------------------------------------------------- */
    if (endpointsCoincide) {
      if (balance !== BigInt(0)) {
        throw new Error(`Vertex ${addr} is unbalanced: ${balance}`);
      }
      return; // done – nothing else to check for this addr
    }

    /* ----------------------------------------------------------------
     * Ordinary DAG case → classic source / sink / intermediate rules
     * -------------------------------------------------------------- */
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

function getSourceAndSink(path: PathfindingResult, overrideSource?: string, overrideSink?: string): {
  source: string;
  sink: string;
} {
  const senders = new Set(path.transfers.map((t) => t.from.toLowerCase()));
  const receivers = new Set(path.transfers.map((t) => t.to.toLowerCase()));

  const source = [...senders].find((a) => !receivers.has(a));
  const sink = [...receivers].find((a) => !senders.has(a));

  if (!(source ?? overrideSource) || !(sink ?? overrideSink)) {
    throw new Error('Could not determine unique source / sink');
  }

  return { source: (source ?? overrideSource)!, sink: (sink ?? overrideSink)! };
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