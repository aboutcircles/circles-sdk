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
import multihashes from 'multihashes';
import { V1Person } from './v1/v1Person';

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
  getAvatar = async (avatarAddress: string): Promise<Avatar> => {
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
    await receipt.wait();

    const signerAddress = await this.signer.getAddress();
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  private cidV0Digest = (cidV0: string) => {
    if (!cidV0.startsWith('Qm')) {
      throw new Error('Invalid CID. Must be a CIDv0 with sha2-256 hash in base58 encoding');
    }
    const cidBytes = multihashes.fromB58String(cidV0);
    const decodedCid = multihashes.decode(cidBytes);
    return decodedCid.digest;
  };

  registerHumanV2 = async (cidV0: string): Promise<AvatarInterface> => {
    const metadataDigest = this.cidV0Digest(cidV0);
    // try {
    const tx = await this.v2Hub.registerHuman(metadataDigest);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }
    // } catch (e) {
    // const revertData = (<Error>e).message.replace('Reverted ', '');
    // parseError(revertData);
    // console.log('Caught error:');
    //   console.error(e);
    //   throw e;
    // }

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
    await receipt.wait();

    const signerAddress = await this.signer.getAddress();
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  registerOrganizationV2 = async (name: string, cidV0: string): Promise<AvatarInterface> => {
    const metadataDigest = this.cidV0Digest(cidV0);
    const receipt = await this.v2Hub.registerOrganization(name, metadataDigest);
    await receipt.wait();

    const signerAddress = await this.signer.getAddress();
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  registerGroupV2 = async (mint: string, name: string, symbol: string, cidV0: string): Promise<AvatarInterface> => {
    const metatdataDigest = this.cidV0Digest(cidV0);
    const receipt = await this.v2Hub.registerGroup(mint, name, symbol, metatdataDigest);
    await receipt.wait();

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

    if (avatarInfo.hasV1) {
      // 1. Stop V1 token if necessary
      if (avatarInfo.v1Token) {
        const v1Avatar = new V1Person(this, avatarInfo);
        const isStopped = await v1Avatar.v1Token?.stopped();

        if (!isStopped) {
          await v1Avatar.personalMint();
          const stopTx = await v1Avatar.v1Token?.stop();
          const stopTxReceipt = await stopTx?.wait();
          if (!stopTxReceipt) {
            throw new Error('Failed to stop V1 avatar');
          }
        }
      }

      // 2. Signup V2 avatar if necessary
      if (avatarInfo.version === 1) {
        await this.registerHumanV2(cidV0);
      }

      // 3. Make sure the v1 token minting status is known to the v2 hub
      const calculateIssuanceTx = await this.v2Hub.calculateIssuanceWithCheck(avatar);
      await calculateIssuanceTx.wait();

      // 4. Migrate V1 tokens
      await this.migrateAllV1Tokens(avatar);
    } else {
      throw new Error('Avatar is not a V1 avatar');
    }
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