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

type FlowEdge = {
    streamSinkId: number;
    amount: bigint;
};

type Stream = {
    sourceCoordinate: bigint,
    flowEdgeIds: number[],
    data: Uint8Array
}

// Define FlowMatrix type
type FlowMatrix = {
    flowVertices: string[];
    flowEdges: FlowEdge[];
    streams: Stream[];
};


export class Pathfinder {
    pathfinderURL: string;

    constructor(pathfinderURL: string) {
        this.pathfinderURL = pathfinderURL;
    }

    async getArgsForPath(from: string, to: string, value: string): Promise<FlowMatrix> {
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

            // todo: this is not great, I mangle the PathFinder response; should split these functions
            if (transformedResponse.data?.directPath) {
                const flowMatrix = createFlowMatrix(from, to, value, transformedResponse.data.directPath.transfers);
                
                return flowMatrix;
            } else {
                throw new Error('Invalid response from pathfinder');
            }

        } catch (error) {
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error('An unknown error occurred');
            }
        }
    };
}

// Function to create FlowMatrix from TransferPathStep[]
// Warning, this is quick draft that explicitly only creates one stream, and sets streamSinkId to 1 explicitly
function createFlowMatrix(from: string, to: string, value: string, transfers: TransferPathStep[]): FlowMatrix {
    // Transform transfers to flow matrix structure
    const { sortedAddresses, lookUpMap } = transformToFlowVertices(transfers);

    // Initialize flow edges
    const flowEdges: FlowEdge[] = transfers.map(transfer => ({
        streamSinkId: transfer.to === to ? 1 : 0, // Set streamSinkId to 1 if transfer.to matches the given 'to' address
        amount: BigInt(transfer.value) // Convert string value to bigint
    }));

    // Initialize stream object
    const flowEdgeIds: number[] = flowEdges
        .map((edge, index) => (edge.streamSinkId === 1 ? index : -1))
        .filter(index => index !== -1);

    // Check if the sum of terminal amounts matches the provided value
    const totalTerminalAmount = flowEdges
        .filter(edge => edge.streamSinkId === 1)
        .reduce((sum, edge) => sum + edge.amount, BigInt(0));

    if (totalTerminalAmount !== BigInt(value)) {
        throw new Error(`The total terminal amount (${totalTerminalAmount}) does not match the provided value (${value}).`);
    }

    const stream: Stream = {
        sourceCoordinate: BigInt(lookUpMap[from]),
        flowEdgeIds: flowEdgeIds,
        data: new Uint8Array() // Empty bytes for now
    };

    return {
        flowVertices: sortedAddresses,
        flowEdges: flowEdges,
        streams: [stream]
    };
}

// Function to transform TransferPathStep[] to flow vertices array with lookup map
function transformToFlowVertices(transfers: TransferPathStep[]) {
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