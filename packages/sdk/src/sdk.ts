import { Avatar } from './avatar';
import { ethers } from 'ethers';
import { ChainConfig } from './chainConfig';
import { Pathfinder } from './v1/pathfinder';
import { AvatarInterface } from './AvatarInterface';
import { Hub as HubV1 } from '@circles-sdk/abi-v1';
import { Hub__factory as HubV1Factory } from '@circles-sdk/abi-v1';
import { Hub as HubV2 } from '@circles-sdk/abi-v2';
import { Hub__factory as HubV2Factory } from '@circles-sdk/abi-v2';
import { AvatarRow, CirclesData, CirclesRpc } from '@circles-sdk/data';

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
  public readonly v1Hub: HubV1;
  /**
   * The V2 hub contract wrapper.
   */
  public readonly v2Hub: HubV2;
  /**
   * The pathfinder client.
   */
  public readonly v1Pathfinder: Pathfinder;

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
    this.v1Hub = HubV1Factory.connect(chainConfig.v1HubAddress ?? '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543', signer);
    this.v2Hub = HubV2Factory.connect(chainConfig.v2HubAddress, signer);
    this.v1Pathfinder = new Pathfinder(chainConfig.pathfinderUrl);
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

  /**
   * Registers the connected wallet as a human avatar.
   * @returns The avatar instance.
   */
  registerHuman = async (): Promise<AvatarInterface> => {
    const receipt = await this.v1Hub.signup();
    if (!receipt) {
      throw new Error('Signup failed (no receipt)');
    }

    const signerAddress = await this.signer.getAddress();
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  registerHumanV2 = async (metadataDigest: any): Promise<AvatarInterface> => {
    const receipt = await this.v2Hub.registerHuman(metadataDigest);
    if (!receipt) {
      throw new Error('Signup failed (no receipt)');
    }

    const signerAddress = await this.signer.getAddress();
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  }

  /**
   * Registers the connected wallet as an organization avatar.
   * @returns The avatar instance.
   */
  registerOrganization = async (): Promise<AvatarInterface> => {
    const receipt = await this.v1Hub.organizationSignup();
    if (!receipt) {
      throw new Error('Signup failed (no receipt)');
    }

    const signerAddress = await this.signer.getAddress();
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  private waitForAvatarInfo = async (address: string): Promise<AvatarRow> => {
    let avatarRow: AvatarRow | undefined;
    let retries = 0;
    do {
      avatarRow = await this.data.getAvatarInfo(address);
      await new Promise((resolve) => setTimeout(resolve, 500));
      retries++;

      if (retries > 120) {
        throw new Error(`Timeout getting avatar info for ${address}`);
      }
    } while (!avatarRow);

    return avatarRow;
  };
}