export type TransferStep = {
  from: string;
  to: string;
  token_owner: string;
  value: string;
};

export type TransferPath = {
  requestedAmount: bigint;
  maxFlow: bigint;
  transferSteps: TransferStep[];
  isValid: boolean;
}

export class Pathfinder {
  private readonly pathfinderURL: string;

  constructor(pathfinderURL: string) {
    this.pathfinderURL = pathfinderURL;
  }

  async getTransferPath(from: string, to: string, value: bigint): Promise<TransferPath> {
    const query = {
      method: 'compute_transfer',
      params: { from, to, value: value.toString() }
    };

    const response = await fetch(this.pathfinderURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(query)
    });

    if (!response.ok) {
      throw new Error(`Error calling API: ${response.status}`);
    }

    const parsed = await response.json();
    if (!parsed.result) {
      throw new Error(`The pathfinder response didn't carry a result: ${JSON.stringify(parsed)}`);
    }

    return <TransferPath>{
      requestedAmount: value,
      maxFlow: BigInt(parsed.result.maxFlowValue),
      transferSteps: parsed.result.transferSteps,
      isValid: parsed.result.final
    };
  }
}
