import { AvatarInterface } from '../AvatarInterface';
import { ContractTransactionResponse } from 'ethers';
import { Sdk } from '../sdk';
import {
  AvatarRow,
  CirclesQuery,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';

export type FlowEdge = {
  streamSinkId: bigint;
  amount: bigint;
};

export type Stream = {
  sourceCoordinate: bigint,
  flowEdgeIds: bigint[],
  data: Uint8Array
}

export class V2Avatar implements AvatarInterface {
  public readonly sdk: Sdk;

  get address(): string {
    return this.avatarInfo.avatar;
  }

  // TODO: Empty stream makes no sense
  // readonly events: Observable<AvatarEvent> = Observable.create<AvatarEvent>().property;
  public readonly avatarInfo: AvatarRow;

  constructor(sdk: Sdk, avatarInfo: AvatarRow) {
    this.sdk = sdk;
    this.avatarInfo = avatarInfo;

    if (this.avatarInfo.version != 2) {
      throw new Error('Avatar is not a v2 avatar');
    }
  }

  getMaxTransferableAmount(to: string): Promise<bigint> {
    // TODO: Add v2 pathfinder
    return Promise.resolve(0n);
  }

  async getMintableAmount(): Promise<bigint> {
    const [a, b, c] = await this.sdk.v2Hub.calculateIssuance(this.address);
    return a;
  }

  async getTotalBalance(): Promise<number> {
    return parseFloat(await this.sdk.data.getTotalBalanceV2(this.address, true));
  }

  async getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> {
    const query = this.sdk.data.getTransactionHistory(this.address, pageSize);
    await query.queryNextPage();

    return query;
  }

  async getTrustRelations(): Promise<TrustRelationRow[]> {
    return this.sdk.data.getAggregatedTrustRelations(this.address);
  }

  personalMint(): Promise<ContractTransactionResponse> {
    return this.sdk.v2Hub.personalMint();
  }

  stop(): Promise<ContractTransactionResponse> {
    return this.sdk.v2Hub.stop();
  }

  private packCoordinates(coordinates: number[]): Uint8Array {
    const packedCoordinates = new Uint8Array(coordinates.length * 2);
    for (let i = 0; i < coordinates.length; i++) {
      packedCoordinates[2 * i] = coordinates[i] >> 8; // High byte
      packedCoordinates[2 * i + 1] = coordinates[i] & 0xFF; // Low byte
    }
    return packedCoordinates;
  }

  private sortAddressesWithPermutationMap(addresses: string[]) {
    const sortedAddresses = [...addresses].sort();
    const permutationMap = addresses.map((address) => sortedAddresses.indexOf(address));
    const lookupMap = permutationMap.map((_, i) => permutationMap.indexOf(i));

    return { sortedAddresses, lookupMap };
  }

  async transfer(to: string, amount: bigint): Promise<ContractTransactionResponse> {
    const addresses = [this.address, to];
    const N = addresses.length;

    const {
      sortedAddresses
      , lookupMap
    } = this.sortAddressesWithPermutationMap(addresses);

    // the flow vertices need to be provided in ascending order
    let flowVertices: string[] = new Array(N);
    for (let i = 0; i < addresses.length; i++) {
      flowVertices[i] = sortedAddresses[i];
    }

    let flow: FlowEdge[] = new Array(N - 1);
    let coordinates: number[] = new Array((N - 1) * 3);
    // the "flow matrix" is a rang three tensor:
    // Circles identifier, flow edge, and flow vertex (location)
    let coordinateIndex = 0;
    for (let i = 0; i < N - 1; i++) {
      // flow is the amount of Circles to send, here constant for each edge
      flow[i] = { amount: amount, streamSinkId: BigInt(1) };
      // first index indicates which Circles to use
      // for our example, we use the Circles of the sender
      coordinates[coordinateIndex++] = lookupMap[i];
      // the second coordinate refers to the sender
      coordinates[coordinateIndex++] = lookupMap[i];
      // the third coordinate specifies the receiver
      coordinates[coordinateIndex++] = lookupMap[i + 1];
    }

    // only the last flow edge is a terminal edge in this example to Charlie->David
    // and it then refers to the single stream Alice -> David of 5 (Charlie) Circles
    // start counting from 1, to reserve 0 for the non-terminal edges
    // TODO ???

    let packedCoordinates = this.packCoordinates(coordinates);

    // Intended total flow (stream: source -> sink)
    let streams: Stream[] = new Array(1);
    streams[0] = {
      sourceCoordinate: BigInt(lookupMap[0]),
      flowEdgeIds: [BigInt(0)],
      data: new Uint8Array(0)
    };

    const approvalStatus = await this.sdk.v2Hub.isApprovedForAll(this.address, to);
    if (!approvalStatus) {
      await this.sdk.v2Hub.setApprovalForAll(this.address, true);
    }

    const txReceipt = await this.sdk.v2Hub.operateFlowMatrix(flowVertices, flow, streams, packedCoordinates);
    if (!txReceipt) {
      throw new Error('Transfer failed');
    }

    return txReceipt;
  }

  async trust(avatar: string): Promise<ContractTransactionResponse> {
    return await this.sdk.v2Hub.trust(avatar, BigInt('79228162514264337593543950335'));
  }

  async untrust(avatar: string): Promise<ContractTransactionResponse> {
    return await this.sdk.v2Hub.trust(avatar, BigInt('0'));
  }

  async groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionResponse> {
    const txReceipt = await this.sdk.v2Hub.groupMint(group, collateral, amounts, data);
    if (!txReceipt) {
      throw new Error('Group mint failed');
    }
    return txReceipt;
  }
}