import { ethers } from 'ethers';

export class V2Data {
  constructor(public readonly circlesRpcUrl: string, public readonly v2HubAddress: string) {
  }

  public async findTokenHoldings(user: string): Promise<string[]> {
    const trustEvents = await this.queryTrustEvents(user);
    console.log(trustEvents);
    return trustEvents;
  }

  private async queryTrustEvents(user: string) {
    const eventSignature = 'Trust(address,address,uint256)';
    const eventTopic = ethers.id(eventSignature);

    const trustEvents = await fetch(this.circlesRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0',
          toBlock: 'latest',
          address: this.v2HubAddress,
          topics: [
            eventTopic,
            '0x000000000000000000000000' + user.toLowerCase().slice(2)
          ]
        }],
        id: 1
      })
    }).then(response => response.json());

    return trustEvents.result;
  }
}