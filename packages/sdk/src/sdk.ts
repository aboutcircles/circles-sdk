import { Avatar } from './avatar';
import { ethers } from 'ethers';
import { ChainConfig } from './chainConfig';
import { Pathfinder } from './v1/pathfinder';
import { AvatarInterface } from './AvatarInterface';
import { Hub as HubV1, Token__factory } from '@circles-sdk/abi-v1';
import { Hub__factory as HubV1Factory } from '@circles-sdk/abi-v1';
import { Hub as HubV2, Migration__factory } from '@circles-sdk/abi-v2';
import { Hub__factory as HubV2Factory } from '@circles-sdk/abi-v2';
import { AvatarRow, CirclesData, CirclesRpc } from '@circles-sdk/data';
import { V1Avatar } from './v1/v1Avatar';

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
  };

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

  migrateAvatar = async (avatar: string, cidV0: string): Promise<void> => {
    const avatarInfo = await this.data.getAvatarInfo(avatar);
    if (!avatarInfo) {
      throw new Error('Avatar not found');
    }
    if (avatarInfo.version != 1) {
      throw new Error('Avatar is not a V1 avatar');
    }

    const v1Avatar = new V1Avatar(this, avatarInfo);
    const result = await v1Avatar.stop();
    await result.wait();

    await this.registerHumanV2(cidV0);
    await this.migrateAllV1Tokens(avatar);
  };

  migrateAllV1Tokens = async (avatar: string): Promise<void> => {
    const balances = await this.data.getTokenBalances(avatar, false);
    const tokensToMigrate = balances
      .filter(o => BigInt(o.balance) > 0);

    // TODO: Send in one transaction if sent to Safe
    await Promise.all(tokensToMigrate.map(async (t, i) => {
      const balance = BigInt(t.balance);
      const token = Token__factory.connect(t.token, this.signer);
      const allowance = await token.allowance(avatar, this.chainConfig.migrationAddress);
      if (allowance < balance) {
        const increase = balance - allowance;
        const tx = await token.increaseAllowance(this.chainConfig.migrationAddress, increase);
        await tx.wait();
      }
    }));

    const migrationContract = Migration__factory.connect(this.chainConfig.migrationAddress, this.signer);
    const migrateTx = await migrationContract.migrate(
      tokensToMigrate.map(o => o.tokenOwner)
      , tokensToMigrate.map(o => BigInt(o.balance)));

    await migrateTx.wait();
  };
}