import { ObservableProperty } from '../observableProperty';
import { ethers, TransactionReceipt } from 'ethers';
import { V2Hub } from '@circles-sdk/abi-v2';

export enum V2AvatarState {
  NotInitialized,
  Unregistered,
  Human,
  StoppedHuman, // Not used right now
  Organization,
  Group
}

export type FlowEdge = {
  streamSinkId: bigint;
  amount: bigint;
};

export type Stream = {
  sourceCoordinate: bigint,
  flowEdgeIds: bigint[],
  data: Uint8Array
}

export class V2Avatar {
  private readonly provider: ethers.Provider;
  private readonly v2Hub: V2Hub;
  private readonly avatarAddress: string;

  public readonly state: ObservableProperty<V2AvatarState>;
  private readonly setState: (state: V2AvatarState) => void;

  constructor(v2Hub: V2Hub, avatarAddress: string, provider: ethers.Provider) {
    this.v2Hub = v2Hub;
    this.avatarAddress = avatarAddress;
    this.provider = provider;

    const stateProperty = ObservableProperty.create<V2AvatarState>();
    this.state = stateProperty.property;
    this.setState = stateProperty.emit;
  }

  async initialize() {
    const [
      isHuman,
      isOrganization,
      isGroup
    ] = await Promise.all([
      this.v2Hub.isHuman(this.avatarAddress),
      this.v2Hub.isOrganization(this.avatarAddress),
      this.v2Hub.isGroup(this.avatarAddress)
    ]);

    let newState = isOrganization
      ? V2AvatarState.Organization
      : isGroup
        ? V2AvatarState.Group
        : isHuman
          ? V2AvatarState.Human
          : V2AvatarState.Unregistered;

    // We don't care about stopped v2 avatars during initialization because we assume
    // that they are not stopped. If required, this state must be checked manually.
    this.setState(newState);
  }

  private sortAddressesWithPermutationMap(addresses: string[]) {
    const sortedAddresses = [...addresses].sort();
    const permutationMap = addresses.map((address) => sortedAddresses.indexOf(address));
    const lookupMap = permutationMap.map((_, i) => permutationMap.indexOf(i));

    return { sortedAddresses, lookupMap };
  }

  /**
   * TODO: This function assumes that the avatar always sends its own tokens.
   *       First: Add support for different token in one transfer, then for multi-hop transfers via pathfinder.
   * @param to The receiver's address
   * @param amount The amount of Circles to send
   */
  async transfer(to: string, amount: bigint): Promise<TransactionReceipt> {
    const addresses = [this.avatarAddress, to];
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

    const approvalStatus = await this.v2Hub.isApprovedForAll(this.avatarAddress, to);
    if (!approvalStatus) {
      await this.v2Hub.setApprovalForAll(this.avatarAddress, true);
    }

    const txReceipt = await this.v2Hub.operateFlowMatrix(flowVertices, flow, streams, packedCoordinates);
    if (!txReceipt) {
      throw new Error('Transfer failed');
    }

    return txReceipt;
  }

  private packCoordinates(coordinates: number[]): Uint8Array {
    const packedCoordinates = new Uint8Array(coordinates.length * 2);
    for (let i = 0; i < coordinates.length; i++) {
      packedCoordinates[2 * i] = coordinates[i] >> 8; // High byte
      packedCoordinates[2 * i + 1] = coordinates[i] & 0xFF; // Low byte
    }
    return packedCoordinates;
  }

  async groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<TransactionReceipt> {
    const txReceipt = await this.v2Hub.groupMint(group, collateral, amounts, data);
    if (!txReceipt) {
      throw new Error('Group mint failed');
    }
    return txReceipt;
  }

  async wrapInErc20() {
  }

  async unwrapFromErc20() {
  }

  async trust(avatar: string): Promise<TransactionReceipt | null> {
    return await this.v2Hub.trust(avatar, BigInt('79228162514264337593543950335'));
  }

  async untust(avatar: string): Promise<TransactionReceipt | null> {
    return await this.v2Hub.trust(avatar, BigInt('0'));
  }

  async getMintableAmount(): Promise<[bigint, bigint, bigint]> {
    return await this.v2Hub.calculateIssuance(this.avatarAddress);
  }
}