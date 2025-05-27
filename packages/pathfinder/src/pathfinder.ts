import { PathfindingResult } from './types.js';
import { Address } from '@circles-sdk/utils';

export interface FindPathParams {
  from: Address,
  to: Address,
  targetFlow: string,
  useWrappedBalances?: boolean,
  fromTokens?: Address[],
  toTokens?: Address[],
  excludeFromTokens?: Address[],
  excludeToTokens?: Address[]
}

/**
 * Call Circles RPC `circlesV2_findPath` and return the raw path result.
 */
export async function findPath(
  rpcUrl: string,
  {
    from,
    to,
    targetFlow,
    useWrappedBalances,
    fromTokens,
    toTokens,
    excludeFromTokens,
    excludeToTokens
  }: FindPathParams
): Promise<PathfindingResult> {
  const requestBody = {
    jsonrpc: '2.0',
    id: 1,
    method: 'circlesV2_findPath',
    params: [
      {
        Source: from,
        Sink: to,
        TargetFlow: targetFlow,
        WithWrap: useWrappedBalances,
        FromTokens: fromTokens,
        ToTokens: toTokens,
        ExcludedFromTokens: excludeFromTokens,
        ExcludedToTokens: excludeToTokens
      }
    ]
  } as const;

  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    throw new Error(`Pathfinder RPC returned HTTP ${res.status}`);
  }

  const json = await res.json();
  if (!json.result) {
    throw new Error(`Pathfinder RPC error: ${JSON.stringify(json.error ?? json)}`);
  }

  return json.result as PathfindingResult;
}

export async function findMaxFlow(
  rpcUrl: string,
  {
    from,
    to,
    useWrappedBalances,
    fromTokens,
    toTokens,
    excludeFromTokens,
    excludeToTokens
  }: Omit<FindPathParams, 'targetFlow'>
): Promise<bigint> {
  const targetFlow = '9999999999999999999999999999999999999';
  const path = await findPath(rpcUrl, {
    from,
    to,
    targetFlow,
    useWrappedBalances,
    fromTokens,
    toTokens,
    excludeFromTokens,
    excludeToTokens
  });

  return BigInt(path.maxFlow);
}