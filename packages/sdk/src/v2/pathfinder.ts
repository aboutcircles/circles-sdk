import {ContractTransactionReceipt} from "ethers";
import {addressToUInt256} from "@circles-sdk/utils";
import {Sdk} from "../sdk";

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

type FlowMatrix = {
    flowVertices: string[];
    flowEdges: FlowEdge[];
    streams: Stream[];
    packedCoordinates: Uint8Array;
    sourceCoordinate: number;
};

export class Pathfinder {
    pathfinderURL: string;

    constructor(pathfinderURL: string) {
        this.pathfinderURL = pathfinderURL;
    }

    async getArgsForPath(from: string, to: string, value: string): Promise<FlowMatrix> {
        const query = {
            method: 'compute_transfer',
            params: {from, to, value: value.toString()}
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

            if (transformedResponse.data?.directPath) {
                return createFlowMatrix(from, to, value, transformedResponse.data.directPath.transfers);
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
function createFlowMatrix(from: string, to: string, value: string, transfers: TransferPathStep[]): FlowMatrix {
    const {sortedAddresses, lookUpMap} = transformToFlowVertices(transfers);

    const flowEdges: FlowEdge[] = transfers.map(transfer => ({
        streamSinkId: transfer.to === to ? 1 : 0,
        amount: BigInt(transfer.value)
    }));

    const flowEdgeIds: number[] = flowEdges
        .map((edge, index) => (edge.streamSinkId === 1 ? index : -1))
        .filter(index => index !== -1);

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

    const coordinates: number[] = [];
    for (const transfer of transfers) {
        coordinates.push(lookUpMap[transfer.tokenOwner]);
        coordinates.push(lookUpMap[transfer.from]);
        coordinates.push(lookUpMap[transfer.to]);
    }
    const packedCoordinates = packCoordinates(coordinates);

    return {
        flowVertices: sortedAddresses,
        flowEdges: flowEdges,
        streams: [stream],
        packedCoordinates: packedCoordinates,
        sourceCoordinate: lookUpMap[from]
    };
}

// Function to transform TransferPathStep[] to flow vertices array with lookup map
function transformToFlowVertices(transfers: TransferPathStep[]) {
    const addressSet = new Set<string>();
    for (const transfer of transfers) {
        addressSet.add(transfer.from);
        addressSet.add(transfer.to);
        addressSet.add(transfer.tokenOwner);
    }

    const sortedAddresses = Array.from(addressSet).sort((a, b) => {
        const uint160A = BigInt(a);
        const uint160B = BigInt(b);
        return uint160A < uint160B ? -1 : uint160A > uint160B ? 1 : 0;
    });

    const lookUpMap: { [address: string]: number } = {};
    sortedAddresses.forEach((address, index) => {
        lookUpMap[address] = index;
    });

    return {
        sortedAddresses: sortedAddresses,
        lookUpMap: lookUpMap
    };
}

function packCoordinates(coordinates: number[]): Uint8Array {
    const packedCoordinates = new Uint8Array(coordinates.length * 2);
    for (let i = 0; i < coordinates.length; i++) {
        packedCoordinates[2 * i] = coordinates[i] >> 8; // High byte
        packedCoordinates[2 * i + 1] = coordinates[i] & 0xFF; // Low byte
    }
    return packedCoordinates;
}

// Existing code integration
export class TransferService {
    private sdk: Sdk;
    private address: string;

    constructor(sdk: any, address: string) {
        this.sdk = sdk;
        this.address = address;
    }

    private async transitiveTransfer(flowMatrix: FlowMatrix): Promise<ContractTransactionReceipt> {
        this.throwIfV2IsNotAvailable();

        const {flowVertices, flowEdges, streams, packedCoordinates} = flowMatrix;

        const tx = await this.sdk.v2Hub!.operateFlowMatrix(flowVertices, flowEdges, streams, packedCoordinates);
        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error('Transfer failed');
        }

        return receipt;
    }

    private async directTransfer(to: string, amount: bigint, tokenAddress: string): Promise<ContractTransactionReceipt> {
        const tokenInf = await this.sdk.data.getTokenInfo(tokenAddress);
        if (!tokenInf) {
            throw new Error('Token not found');
        }

        const numericTokenId = addressToUInt256(tokenInf.tokenId);
        const tx = await this.sdk.v2Hub?.safeTransferFrom(
            this.address,
            to,
            numericTokenId,
            amount,
            new Uint8Array(0)
        );

        const receipt = await tx?.wait();
        if (!receipt) {
            throw new Error('Transfer failed');
        }

        return receipt;
    }

    async transfer(to: string, amount: bigint, tokenAddress?: string, pathfinder?: Pathfinder): Promise<ContractTransactionReceipt> {
        if (!tokenAddress) {
            if (pathfinder) {
                const flowMatrix = await pathfinder.getArgsForPath(this.address, to, amount.toString());
                return this.transitiveTransfer(flowMatrix);
            } else {
                throw new Error('Pathfinder instance required for path transfer');
            }
        } else {
            return this.directTransfer(to, amount, tokenAddress);
        }
    }

    private throwIfV2IsNotAvailable() {
        if (!this.sdk.v2Hub) {
            throw new Error('V2 Hub not available');
        }
    }
}
