import { CirclesRpc } from "@circles-sdk/data";
import { Address } from "@circles-sdk/utils";
import { MaxFlowResponse } from '../pathfinderTypes';

export class V1Pathfinder {
  private rpc: CirclesRpc;

  constructor(circlesRpcUrl: string) {
    this.rpc = new CirclesRpc(circlesRpcUrl); // Using CirclesRpc class
  }

  async getMaxFlow(from: Address, to: Address): Promise<bigint> {
    const requestBody = {
      Source: from,
      Sink: to,
      TargetFlow: "99999999999999999999999999999999999999", // A large target flow
    };

    const response = await this.rpc.call<MaxFlowResponse>('circlesV1_findPath', [requestBody]);
    return BigInt(response.result.maxFlow);
  }

  async getPath(from: Address, to: Address, value: string): Promise<MaxFlowResponse> {
    const requestBody = {
      Source: from,
      Sink: to,
      TargetFlow: value.toString(),
    };

    const response = await this.rpc.call<MaxFlowResponse>('circlesV1_findPath', [requestBody]);
    return response.result;
  }
}