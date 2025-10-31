import { Address, CirclesConverter } from '@circles-sdk/utils';
import {
  findMaxFlow, findPath,
  FindPathParams,
  PathfindingResult
} from '@circles-sdk/pathfinder';

export class V2Pathfinder {
  private readonly rpcUrl: string;

  constructor(circlesRpcUrl: string) {
    this.rpcUrl = circlesRpcUrl;
  }

  async getMaxFlow(
    from: Address,
    to: Address,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[],
    maxTransfers?: number): Promise<bigint> {
    to = to.toLowerCase() as Address;

    const result = await findMaxFlow(
      this.rpcUrl,
      <FindPathParams>{
        from,
        to,
        useWrappedBalances,
        fromTokens,
        toTokens,
        excludeFromTokens,
        excludeToTokens,
        maxTransfers
      });

    return CirclesConverter.truncateToSixDecimals(result);
  }

  async getPath(
    from: Address,
    to: Address,
    value: string,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[],
    maxTransfers?: number): Promise<PathfindingResult> {

    return await findPath(
      this.rpcUrl,
      {
        from,
        to,
        targetFlow: value,
        useWrappedBalances,
        fromTokens,
        toTokens,
        excludeFromTokens,
        excludeToTokens,
        maxTransfers
      }
    );
  }
}