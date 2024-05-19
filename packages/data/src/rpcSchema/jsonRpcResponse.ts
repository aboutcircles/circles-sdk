export interface JsonRpcResponse<TResult> {
  jsonrpc: string;
  id: number;
  result: TResult;
}

export interface CirclesQueryJsonRpcResponse extends JsonRpcResponse<{
  columns: string[];
  rows: unknown[][];
}> {
}