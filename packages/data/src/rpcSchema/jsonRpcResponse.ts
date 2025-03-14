export interface JsonRpcResponse<TResult> {
  jsonrpc: string;
  id: number;
  result: TResult;
}

export interface CirclesQueryJsonRpcResponse extends JsonRpcResponse<CirclesQueryResult> {
}

export interface CirclesQueryResult {
  columns: string[];
  rows: unknown[][];
}