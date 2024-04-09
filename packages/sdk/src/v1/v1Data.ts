import { ParsedEvent, TrustEvent, V1HubEvents } from '@circles-sdk/abi-v1';
import { ethers } from 'ethers';

export class V1Data {
  constructor(public readonly circlesRpcUrl: string, public readonly v1HubAddress: string) {
  }

  public async *queryTrustOnChainAsyncIterator(user: string, startAt:number, parallelism: number): AsyncGenerator<string[]> {
    const jsonRpcProvider = new ethers.JsonRpcProvider(this.circlesRpcUrl);
    const currentBlock = await jsonRpcProvider.getBlockNumber();

    for await (const { fromBlock, toBlock } of this.generateBlockRangesWithThresholds(startAt, currentBlock)) {
      const totalRange = toBlock - fromBlock + 1;
      const subRangeSize = Math.ceil(totalRange / parallelism);
      const promises = [];

      for (let i = 0; i < parallelism; i++) {
        const subFrom = fromBlock + i * subRangeSize;
        const subTo = Math.min(subFrom + subRangeSize - 1, toBlock);

        if (subFrom <= toBlock) {
          promises.push(this.queryTrustEventsInRange(user, subFrom, subTo));
        }
      }

      const results = await Promise.all(promises);
      const flattenedResults = results.flat(); // Flatten the array of arrays

      console.log(`Fetched trust events for ${user} in range ${fromBlock}-${toBlock}: ${flattenedResults.length} trusts`);
      yield flattenedResults;
    }
  }

  private async *generateBlockRangesWithThresholds(startBlock: number, endBlock: number) {
    const thresholds = [
      { upToBlock: 21000000, useBatchSize: 15000000 },
      { upToBlock: 28000000, useBatchSize: 2000000 },
      { upToBlock: 30000000, useBatchSize: 100000 },
      { upToBlock: Infinity, useBatchSize: 20000 } // Use Infinity for the final threshold
    ];

    let fromBlock = startBlock;
    for (let threshold of thresholds) {
      while (fromBlock <= Math.min(endBlock, threshold.upToBlock)) {
        const toBlock = Math.min(fromBlock + threshold.useBatchSize - 1, endBlock, threshold.upToBlock);
        yield { fromBlock, toBlock };
        fromBlock = toBlock + 1;
      }
      if (fromBlock > endBlock) break;
    }
  }

  /**
   * Find all Trust events of a user on-chain by querying in chunks and executing with parallelism.
   * @param user The user address.
   * @param fromBlock Number of blocks per chunk.
   * @param toBlock Degree of parallel requests.
   * @returns The user addresses that the user trusts.
   */
  private async queryTrustEventsInRange(user: string, fromBlock: number, toBlock: number): Promise<string[]> {
    const trustEvents = await fetch(this.circlesRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x' + fromBlock.toString(16),
          toBlock: '0x' + toBlock.toString(16),
          address: this.v1HubAddress,
          topics: [
            '0xe60c754dd8ab0b1b5fccba257d6ebcd7d09e360ab7dd7a6e58198ca1f57cdcec',
            '0x000000000000000000000000' + user.toLowerCase().slice(2)
          ]
        }],
        id: 1
      })
    })
      .then(response => response.json());

    const eventDecoder = new V1HubEvents();
    const trusts: string[] = [];
    for (const event of trustEvents.result) {
      const trustEvent: ParsedEvent<TrustEvent> | null = eventDecoder.decodeEventData({
        topics: event.topics,
        data: event.data
      });
      if (!trustEvent) {
        continue;
      }
      trusts.push(trustEvent.data.user);
    }

    return trusts;
  }

  async queryIncomingTransfers(address: string): Promise<any[]> {
    const requestBody = {
      jsonrpc: '2.0',
      method: 'circles_queryCrcTransfers',
      params: [{
        ToAddress: address,
        Sort: 'desc'
      }],
      id: 1
    };

    const response = await fetch(this.circlesRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData?.result ? responseData.result : [];
  }

  async queryOutgoingTransfers(address: string): Promise<any[]> {
    const requestBody = {
      jsonrpc: '2.0',
      method: 'circles_queryCrcTransfers',
      params: [{
        FromAddress: address,
        Sort: 'desc'
      }],
      id: 2
    };

    const response = await fetch(this.circlesRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData?.result ? responseData.result : [];
  }

  async queryAllTransfers(address: string): Promise<any[]> {
    const incomingTransfers = await this.queryIncomingTransfers(address);
    const outgoingTransfers = await this.queryOutgoingTransfers(address);
    const allTransfers = incomingTransfers.concat(outgoingTransfers);
    return allTransfers.sort((a, b) => b.timestamp - a.timestamp);
  }

  async queryTrustRelations(address: string): Promise<{
    user: string,
    trusts: {
      [address: string]: number
    },
    trustedBy: {
      [address: string]: number
    }
  }> {
    const requestBody = {
      jsonrpc: '2.0',
      method: 'circles_getTrustRelations',
      params: [address],
      id: 1
    };

    const response = await fetch(this.circlesRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData?.result ? responseData.result : {};
  }

  async queryTrustEvents(address: string): Promise<any[]> {
    const requestBody = {
      jsonrpc: '2.0',
      method: 'circles_queryTrustEvents',
      'params': [{
        'UserAddress': address,
        'CanSendToAddress': address,
        'SortOrder': 'Descending',
        'Mode': 'Or'
      }],
      id: 1
    };

    const response = await fetch(this.circlesRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData = await response.json();
    return responseData?.result ? responseData.result : [];
  }

  queryAllTrusts(address: string) {
    return this.queryTrustEvents(address);
  }
}