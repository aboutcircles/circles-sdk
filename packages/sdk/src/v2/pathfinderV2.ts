import { CirclesRpc } from '@circles-sdk/data';
import { Address, CirclesConverter } from '@circles-sdk/utils';
import {
  findMaxFlow, findPath,
  FindPathParams,
  PathfindingResult
} from '@circles-sdk/pathfinder';

export class V2Pathfinder {
  private readonly rpc: CirclesRpc;
  private readonly rpcUrl: string;

  constructor(circlesRpcUrl: string) {
    this.rpcUrl = circlesRpcUrl;
    this.rpc = new CirclesRpc(circlesRpcUrl); // Using CirclesRpc class
  }

  async getMaxFlow(
    from: Address,
    to: Address,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[]): Promise<bigint> {
    to = to.toLowerCase() as Address;

    const result = await findMaxFlow(
      from,
      <FindPathParams>{
        to,
        useWrappedBalances,
        fromTokens,
        toTokens,
        excludeFromTokens,
        excludeToTokens
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
    excludeToTokens?: Address[]): Promise<PathfindingResult> {

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
        excludeToTokens
      }
    );
  }
}