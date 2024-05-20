export type JsonRpcRequest = {
  jsonrpc: string;
  id: number;
  method: string;
  params: any[];
};