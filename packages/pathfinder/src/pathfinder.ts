import { PathfindingResult } from './types.js';
import { Address } from '@circles-sdk/utils';
import { CirclesRpc } from '@circles-sdk/data';

export interface FindPathParams {
  from: Address,
  to: Address,
  targetFlow: string,
  useWrappedBalances?: boolean,
  fromTokens?: Address[],
  toTokens?: Address[],
  excludeFromTokens?: Address[],
  excludeToTokens?: Address[],
  maxTransfers?: number
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
    excludeToTokens,
    maxTransfers = 300
  }: FindPathParams
): Promise<PathfindingResult> {
  const res = await new CirclesRpc(rpcUrl).call<PathfindingResult>('circlesV2_findPath', [{
    Source: from,
    Sink: to,
    TargetFlow: targetFlow,
    WithWrap: useWrappedBalances,
    MaxTransfers: maxTransfers,
    FromTokens: fromTokens,
    ToTokens: toTokens,
    ExcludedFromTokens: excludeFromTokens,
    ExcludedToTokens: excludeToTokens
  }]);

  return res.result;
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
    excludeToTokens,
    maxTransfers
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
    excludeToTokens,
    maxTransfers
  });

  return BigInt(path.maxFlow);
}