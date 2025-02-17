import { JsonRpcRequest } from './rpcSchema/jsonRpcRequest';
import { JsonRpcResponse } from './rpcSchema/jsonRpcResponse';
import { Observable } from './observable';
import { CirclesEvent } from './events/events';
import { parseRpcSubscriptionMessage } from './events/parser';
import { Address } from '@circles-sdk/utils';

export class CirclesRpc {
  private readonly rpcUrl: string;
  private idCounter = 0;

  private websocket: WebSocket | null = null;
  private websocketConnected = false;
  private pendingResponses: Record<any, any> = {};
  private subscriptionListeners: {
    [subscriptionId: string]: ((event: { event: string, values: Record<string, any> }[]) => void)[]
  } = {};

  // Backoff-related fields
  private reconnectAttempt = 0;
  // Initial backoff delay (ms)
  private readonly initialBackoff = 2000;
  // Maximum backoff delay (ms)
  private readonly maxBackoff = 120000; // 2 mins

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

  /**
   * Initiates a WebSocket connection (or attempts to).
   */
  private connect() {
    return new Promise<void>((resolve,) => {
      let wsUrl = this.rpcUrl.replace('http', 'ws');
      if (wsUrl.endsWith('/')) {
        wsUrl += 'ws';
      } else {
        wsUrl += '/ws';
      }
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket connected');
        this.websocketConnected = true;
        // Reset the reconnect backoff attempts
        this.reconnectAttempt = 0;
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
        console.warn('WebSocket closed');
        this.websocketConnected = false;
      };
      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.websocketConnected = false;
        // Schedule a reconnect
        this.scheduleReconnect();
      };
    });
  }

  /**
   * Schedules a reconnect using exponential backoff with random jitter.
   */
  private scheduleReconnect() {
    // Exponential backoff: 2^attempt * initialBackoff
    const delay = Math.min(
      this.initialBackoff * Math.pow(2, this.reconnectAttempt),
      this.maxBackoff
    );
    
    // Add proportional jitter (between 0% and 50% of the delay)
    const jitter = delay * (Math.random() * 0.5); // Random value between 0 and 0.5
    const timeout = delay + jitter;

    console.log(
      `Reconnecting in ${Math.round(timeout)}ms (attempt #${this.reconnectAttempt + 1})`
    );
    this.reconnectAttempt++;

    setTimeout(() => {
      this.reconnect();
    }, timeout);
  }

  /**
   * Attempts to reconnect the WebSocket by calling `connect()`.
   */
  private async reconnect() {
    if (this.websocketConnected) return; // If it's already connected, do nothing
    try {
      await this.connect();
      console.log('Reconnection successful');
    } catch (err) {
      // If connect() fails, schedule a reconnect again
      console.error('Reconnection attempt failed:', err);
      this.scheduleReconnect();
    }
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

  public async subscribe(address?: Address): Promise<Observable<CirclesEvent>> {
    address = address?.toLowerCase() as Address;
    if (!this.websocketConnected) {
      await this.connect();
    }
    const observable = Observable.create<CirclesEvent>();
    const subscriptionArgs = JSON.stringify(address ? { address } : {});
    const response = await this.sendMessage('eth_subscribe', ['circles', subscriptionArgs]);
    const subscriptionId = response.result;
    if (!this.subscriptionListeners[subscriptionId]) {
      this.subscriptionListeners[subscriptionId] = [];
    }
    this.subscriptionListeners[subscriptionId].push((events) => {
      parseRpcSubscriptionMessage(events).forEach(event => observable.emit(event));
    });

    // TODO: Add unsubscribe method to observable
    return observable.property;
  }
}