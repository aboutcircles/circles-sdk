import { JsonRpcRequest } from './rpcSchema/jsonRpcRequest';
import { JsonRpcResponse } from './rpcSchema/jsonRpcResponse';

export class Rpc {
  private readonly rpcUrl: string;
  private idCounter = 0;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  public async call<TResult>(method: string, params: any[]) {
    const requestBody: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: this.idCounter++,
      method: method,
      params: params
    };

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const jsonResponse: JsonRpcResponse<TResult> = await response.json();

    if (!jsonResponse.result) {
      throw new Error(`RPC Error: ${JSON.stringify(jsonResponse)}`);
    }
    return jsonResponse;
  }
}