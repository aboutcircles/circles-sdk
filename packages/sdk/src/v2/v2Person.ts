import { AvatarInterfaceV2 } from '../AvatarInterface';
import { ContractTransactionReceipt, formatEther } from 'ethers';
import { Sdk } from '../sdk';
import {
  AvatarRow,
  CirclesQuery,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { cidV0ToUint8Array } from '@circles-sdk/utils';

export type FlowEdge = {
  streamSinkId: bigint;
  amount: bigint;
};

export type Stream = {
  sourceCoordinate: bigint,
  flowEdgeIds: bigint[],
  data: Uint8Array
}

export class V2Person implements AvatarInterfaceV2 {
  public readonly sdk: Sdk;

  get address(): string {
    return this.avatarInfo.avatar;
  }

  public readonly avatarInfo: AvatarRow;

  constructor(sdk: Sdk, avatarInfo: AvatarRow) {
    this.sdk = sdk;
    this.avatarInfo = avatarInfo;

    if (this.avatarInfo.version != 2) {
      throw new Error('Avatar is not a v2 avatar');
    }
  }

  async updateMetadata(cid: string): Promise<ContractTransactionReceipt> {
    this.throwIfNameRegistryIsNotAvailable();

    const digest = cidV0ToUint8Array(cid);
    const tx = await this.sdk.nameRegistry?.updateMetadataDigest(digest);
    const receipt = await tx?.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }

    return receipt;
  }

  getMaxTransferableAmount(to: string): Promise<bigint> {
    // TODO: Add v2 pathfinder
    return Promise.resolve(0n);
  }

  async getMintableAmount(): Promise<number> {
    this.throwIfV2IsNotAvailable();
    const [a, b, c] = await this.sdk.v2Hub!.calculateIssuance(this.address);
    return parseFloat(formatEther(a));
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

  async personalMint(): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.personalMint();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Personal mint failed');
    }

    return receipt;
  }

  async stop(): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.stop();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Stop failed');
    }

    return receipt;
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

  async transfer(to: string, amount: bigint, token?: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
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

    const approvalStatus = await this.sdk.v2Hub!.isApprovedForAll(this.address, to);
    if (!approvalStatus) {
      await this.sdk.v2Hub!.setApprovalForAll(this.address, true);
    }

    const tx = await this.sdk.v2Hub!.operateFlowMatrix(flowVertices, flow, streams, packedCoordinates);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }

    return receipt;
  }

  async trust(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.trust(avatar, BigInt('79228162514264337593543950335'));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Trust failed');
    }

    return receipt;
  }

  async untrust(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.trust(avatar, BigInt('0'));
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Untrust failed');
    }

    return receipt;
  }

  async groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.groupMint(group, collateral, amounts, data);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Group mint failed');
    }

    return receipt;
  }

  wrapDemurrageErc20(amount: bigint): Promise<ContractTransactionReceipt> {
    throw new Error('Not implemented');
  }

  wrapInflationErc20(amount: bigint): Promise<ContractTransactionReceipt> {
    throw new Error('Not implemented');
  }

  /**
   * Invite a user to Circles (TODO: May cost you invite fees).
   * @param avatar The address of the avatar to invite. Can be either a v1 address or an address that's not signed up yet.
   */
  async inviteHuman(avatar: string): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.inviteHuman(avatar);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Invite failed');
    }

    return receipt;
  }

  private throwIfV2IsNotAvailable() {
    if (!this.sdk.circlesConfig.v2HubAddress) {
      throw new Error('V2 is not available');
    }
  }

  private throwIfNameRegistryIsNotAvailable() {
    if (!this.sdk.nameRegistry) {
      throw new Error('Name registry is not available');
    }
  }
}