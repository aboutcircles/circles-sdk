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
    }
}