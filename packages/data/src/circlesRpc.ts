import { JsonRpcRequest } from './rpcSchema/jsonRpcRequest';
import { JsonRpcResponse } from './rpcSchema/jsonRpcResponse';
import { Observable } from './observable';
import { CirclesEvent } from './events/events';
import { parseRpcSubscriptionMessage } from './events/parser';

export class CirclesRpc {
  private readonly rpcUrl: string;
  private idCounter = 0;

  private websocket: WebSocket | null = null;
  private websocketConnected = false;
  private pendingResponses: Record<any, any> = {};
  private subscriptionListeners: {
    [subscriptionId: string]: ((event: CirclesEvent) => void)[]
  } = {};

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

  private connect() {
    return new Promise<void>((resolve, reject) => {
      let wsUrl = this.rpcUrl.replace('http', 'ws');
      if (wsUrl.endsWith('/')) {
        wsUrl += 'ws';
      } else {
        wsUrl += '/ws';
      }
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('Connected');
        resolve();
      };

      this.websocket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        const { id, method, params } = message;

        if (id !== undefined && this.pendingResponses[id]) {
          this.pendingResponses[id].resolve(message);
          delete this.pendingResponses[id];
        }

        if (method === 'eth_subscription' && params) {
          const { subscription, result } = params;
          if (this.subscriptionListeners[subscription]) {
            this.subscriptionListeners[subscription].forEach(listener => listener(result));
          }
        }
      };
      this.websocket.onclose = () => {
        this.websocketConnected = false;
        console.log('WebSocket closed');
      };
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  private sendMessage(method: string, params: Record<any, any>, timeout = 5000): Promise<any> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      return Promise.reject('WebSocket is not connected');
    }
    const id = this.idCounter++;
    const message = { jsonrpc: '2.0', method, params, id };
    return new Promise((resolve, reject) => {
      this.pendingResponses[id] = { resolve, reject };
      this.websocket!.send(JSON.stringify(message));

      setTimeout(() => {
        if (this.pendingResponses[id]) {
          this.pendingResponses[id].reject('Request timed out');
          delete this.pendingResponses[id];
        }
      }, timeout);
    });
  }

  public async subscribe(address?: string): Promise<Observable<CirclesEvent>> {
    if (!this.websocketConnected) {
      await this.connect();
      this.websocketConnected = true;
    }
    const observable = Observable.create<CirclesEvent>();
    const subscriptionArgs = JSON.stringify(address ? { address } : {});
    const response = await this.sendMessage('eth_subscribe', ['circles', subscriptionArgs]);
    const subscriptionId = response.result;
    if (!this.subscriptionListeners[subscriptionId]) {
      this.subscriptionListeners[subscriptionId] = [];
    }
    this.subscriptionListeners[subscriptionId].push((event) => {
      console.log('Received event:', event);
      observable.emit(event);
    });
    return observable.property;
  }
}

export type CirclesQueryRpcResult = {
  columns: string[];
  rows: any[][];
};

export type RawWebsocketEvent = {
  event: string;
  values: Record<string, any>;
}