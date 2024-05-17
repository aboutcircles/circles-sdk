export interface TransferPathStep {
    readonly from: string;
    readonly to: string;
    readonly tokenOwner: string;
    readonly value: string;
}

type ApiTransferStep = {
    from: string;
    to: string;
    token_owner: string;
    value: string;
};

type directPathResponse = {
    data?: {
        directPath?: {
        requestedAmount: string;
        flow: unknown;
        transfers: TransferPathStep[];
        isValid?: boolean;
        };
    };
};

export class Pathfinder {
    pathfinderURL: string;

    constructor(pathfinderURL: string) {
        this.pathfinderURL = pathfinderURL;
    }

    async getArgsForPath(from: string, to: string, value: string): Promise<directPathResponse> {
        const query = {
            method: 'compute_transfer',
            params: { from, to, value: value.toString() }
        };

        try {
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

            const transformedResponse: directPathResponse = {
                data: {
                    directPath: {
                        requestedAmount: value,
                        flow: parsed.result.maxFlowValue,
                        transfers: parsed.result.transferSteps.map((step: ApiTransferStep) => ({
                            from: step.from,
                            to: step.to,
                            tokenOwner: step.token_owner,
                            value: step.value
                        })),
                        isValid: parsed.result.final
                    }
                }
            };

            return transformedResponse;

        } catch (error) {
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error('An unknown error occurred');
            }
        }
    };
}

function transformToFlowMatrix(transfers: TransferPathStep[]) {
    // Extract all unique addresses from transfers
    const addressSet = new Set<string>();
    for (const transfer of transfers) {
        addressSet.add(transfer.from);
        addressSet.add(transfer.to);
        addressSet.add(transfer.tokenOwner);
    }

    // Convert addresses to uint160 and sort
    const sortedAddresses = Array.from(addressSet).sort((a, b) => {
        const uint160A = BigInt(a);
        const uint160B = BigInt(b);
        return uint160A < uint160B ? -1 : uint160A > uint160B ? 1 : 0;
    });

    // Create the lookup map
    const lookUpMap: { [address: string]: number } = {};
    sortedAddresses.forEach((address, index) => {
        lookUpMap[address] = index;
    });

    return {
        sortedAddresses: sortedAddresses,
        lookUpMap: lookUpMap
    };
}