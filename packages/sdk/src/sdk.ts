import { Avatar } from './avatar';
import { V1Hub } from '@circles-sdk/abi-v1';
import { ethers } from 'ethers';
import { ChainConfig } from './chainConfig';
import { CirclesData, CirclesRpc } from '@circles-sdk/data';
import { Pathfinder } from './v1/pathfinder';
import { AvatarInterface } from './AvatarInterface';

/**
 * The SDK provides a high-level interface to interact with the Circles protocol.
 */
export class Sdk {
  /**
   * The signer used to sign transactions.
   */
  public readonly signer: ethers.AbstractSigner;
  /**
   * The chain specific Circles configuration.
   */
  public readonly chainConfig: ChainConfig;
  /**
   * The Circles RPC client.
   */
  public readonly circlesRpc: CirclesRpc;
  /**
   * The Circles data client.
   */
  public readonly data: CirclesData;
  /**
   * The V1 hub contract wrapper.
   */
  public readonly v1Hub: V1Hub;
  /**
   * The pathfinder client.
   */
  public readonly pathfinder: Pathfinder;

  /**
   * Creates a new SDK instance.
   * @param chainConfig The chain specific Circles configuration.
   * @param signer The ethers provider to use for signing transactions.
   */
  constructor(chainConfig: ChainConfig, signer: ethers.AbstractSigner) {
    this.chainConfig = chainConfig;
    this.signer = signer;

    this.circlesRpc = new CirclesRpc(chainConfig.circlesRpcUrl);
    this.data = new CirclesData(this.circlesRpc);
    this.v1Hub = new V1Hub(signer, chainConfig.v1HubAddress);
    this.pathfinder = new Pathfinder(chainConfig.pathfinderUrl);
  }

  /**
   * Gets an avatar by its address.
   * @param avatarAddress The avatar's address.
   * @returns The avatar instance.
   * @throws If the given avatar address is not signed up at Circles.
   */
  getAvatar = async (avatarAddress: string): Promise<AvatarInterface> => {
    const avatar = new Avatar(this, avatarAddress);
    await avatar.initialize();

    return avatar;
  };
}