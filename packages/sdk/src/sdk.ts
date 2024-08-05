import { Avatar } from './avatar';
import { CirclesConfig } from './circlesConfig';
import { Pathfinder } from './v1/pathfinder';
import { AvatarInterface } from './AvatarInterface';
import { Hub as HubV1, Hub__factory as HubV1Factory, Token__factory } from '@circles-sdk/abi-v1';
import {
  Hub as HubV2,
  Hub__factory as HubV2Factory,
  Migration__factory, NameRegistry, NameRegistry__factory
} from '@circles-sdk/abi-v2';
import { AvatarRow, CirclesData, CirclesRpc } from '@circles-sdk/data';
import { V1Avatar } from './v1/v1Avatar';
import { cidV0ToUint8Array } from '@circles-sdk/utils';
import { GroupProfile, Profile, Profiles } from '@circles-sdk/profiles';
import { EthersContractRunner } from '@circles-sdk/adapter-ethers';

/**
 * The SDK interface.
 */
interface SdkInterface {
  /**
   * The signer used to sign transactions (connected wallet e.g. MetaMask).
   */
  contractRunner: EthersContractRunner;
  /**
   * The chain specific Circles configuration (contract addresses and rpc endpoints).
   */
  circlesConfig: CirclesConfig;
  /**
   * A configured instance of the CirclesData class, an easy-to-use wrapper around
   * the Circles RPC Query API.
   */
  data: CirclesData;
  /**
   * An instance of the typechain generated Circles V1 Hub contract wrapper.
   */
  v1Hub: HubV1;
  /**
   * An instance of the typechain generated Circles V2 Hub contract wrapper.
   */
  v2Hub?: HubV2;
  /**
   * An instance of the v1 Pathfinder client (necessary for transfers; only available on gnosis chain with v1 Circles at the moment).
   */
  v1Pathfinder?: Pathfinder;
  /**
   * Stores and retrieves profiles from the Circles profile service.
   */
  profiles?: Profiles;
  /**
   * Gets an Avatar instance by its address. Fails if the avatar is not signed up at Circles.
   * @param avatarAddress The avatar's address.
   * @returns The Avatar instance.
   */
  getAvatar: (avatarAddress: string) => Promise<Avatar>;
  /**
   * Registers the connected wallet as a human avatar in Circles v1.
   * @returns The Avatar instance.
   */
  registerHuman: () => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as a human avatar in Circles v2.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  registerHumanV2: (profile: Profile) => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as an organization avatar in Circles v1.
   */
  registerOrganization: () => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as an organization avatar in Circles v2.
   * @param profile The profile data of the organization.
   */
  registerOrganizationV2: (profile: Profile) => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as a group avatar in Circles v2.
   * @param mint The address of the minting policy contract to use.
   * @param profile The profile data of the group.
   */
  registerGroupV2: (mint: string, profile: GroupProfile) => Promise<AvatarInterface>;
  /**
   * Migrates a v1 avatar and all its Circles holdings to v2.
   * [[ Currently only works for human avatars. ]]
   * @param avatar The avatar's address.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  migrateAvatar: (avatar: string, profile: Profile) => Promise<void>;
}

/**
 * Wraps a contract runner with its address.
 */


/**
 * The SDK provides a high-level interface to interact with the Circles protocol.
 */
export class Sdk implements SdkInterface {
  /**
   * The signer used to sign transactions.
   */
  readonly contractRunner: EthersContractRunner;
  /**
   * The chain specific Circles configuration.
   */
  readonly circlesConfig: CirclesConfig;
  /**
   * The Circles RPC client.
   */
  readonly circlesRpc: CirclesRpc;
  /**
   * The Circles data client.
   */
  readonly data: CirclesData;
  /**
   * The typechain generated V1 hub contract wrapper.
   */
  readonly v1Hub: HubV1;
  /**
   * The typechain generated V2 hub contract wrapper.
   */
  readonly v2Hub?: HubV2;
  /**
   * The typechain generated NameRegistry contract wrapper.
   */
  readonly nameRegistry?: NameRegistry;
  /**
   * The pathfinder client (v1).
   */
  readonly v1Pathfinder?: Pathfinder;
  /**
   * The pathfinder client (v2).
   */
  readonly v2Pathfinder?: Pathfinder;
  /**
   * The profiles service client.
   */
  readonly profiles?: Profiles;

  /**
   * Creates a new SDK instance.
   * @param circlesConfig The chain specific Circles configuration.
   * @param contractRunner A contract runner instance and its address.
   */
  constructor(circlesConfig: CirclesConfig, contractRunner: EthersContractRunner) {
    this.circlesConfig = circlesConfig;
    this.contractRunner = contractRunner;
    if (!this.contractRunner.address) {
      throw new Error('Contract runner is not initialized');
    }

    this.circlesRpc = new CirclesRpc(circlesConfig.circlesRpcUrl);
    this.data = new CirclesData(this.circlesRpc);
    this.v1Hub = HubV1Factory.connect(circlesConfig.v1HubAddress ?? '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543', this.contractRunner);
    if (circlesConfig.v2HubAddress) {
      this.v2Hub = HubV2Factory.connect(circlesConfig.v2HubAddress, this.contractRunner);
    }
    if (circlesConfig.pathfinderUrl) {
      this.v1Pathfinder = new Pathfinder(circlesConfig.pathfinderUrl);
    }
    if (circlesConfig.v2PathfinderUrl) {
      this.v2Pathfinder = new Pathfinder(circlesConfig.v2PathfinderUrl);
    }
    if (circlesConfig.nameRegistryAddress) {
      this.nameRegistry = NameRegistry__factory.connect(circlesConfig.nameRegistryAddress, this.contractRunner);
    }
    if (circlesConfig.profileServiceUrl) {
      this.profiles = new Profiles(circlesConfig.profileServiceUrl);
    }
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

    await this.waitForAvatarInfo(this.contractRunner.address!);
    return this.getAvatar(this.contractRunner.address!);
  };

  /**
   * Registers the connected wallet as a human avatar in Circles v2.
   * Note: This will only work if you already have a v1 avatar and only during the migration period.
   *       The only way to join after the migration period is to be invited by an existing member.
   * @param profile The profile data of the avatar.
   */
  registerHumanV2 = async (profile: Profile | string): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }

    let metadataDigest: Uint8Array = await this.createProfileIfNecessary(profile);

    const tx = await this.v2Hub.registerHuman(metadataDigest);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    await this.waitForAvatarInfo(this.contractRunner.address!);

    return this.getAvatar(this.contractRunner.address!);
  };

  /**
   * Checks if the profile argument is a string or a Profile object and creates the profile if necessary.
   * If the profile is a string, it must be a CIDv0 string (Qm...).
   * @param profile The profile data or CIDv0 of the avatar.
   * @private
   */
  private async createProfileIfNecessary(profile: Profile | string) {
    if (typeof profile === 'string') {
      if (!profile.startsWith('Qm')) {
        throw new Error('Invalid profile CID. Must be a CIDv0 string (Qm...).');
      }
      return cidV0ToUint8Array(profile);
    } else if (this.profiles) {
      const profileCid = await this.profiles?.create(profile);
      return cidV0ToUint8Array(profileCid);
    } else {
      throw new Error('Profiles service is not configured');
    }
  }

  /**
   * Registers the connected wallet as an organization avatar.
   * @returns The avatar instance.
   */
  registerOrganization = async (): Promise<AvatarInterface> => {
    const receipt = await this.v1Hub.organizationSignup();
    await receipt.wait();

    await this.waitForAvatarInfo(this.contractRunner.address!);
    return this.getAvatar(this.contractRunner.address!);
  };

  /**
   * Registers the connected wallet as an organization avatar in Circles v2.
   * @param profile The profile data of the organization.
   */
  registerOrganizationV2 = async (profile: Profile): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }

    const metadataDigest = await this.createProfileIfNecessary(profile);
    const receipt = await this.v2Hub.registerOrganization(profile.name, metadataDigest);
    await receipt.wait();

    await this.waitForAvatarInfo(this.contractRunner.address!);
    return this.getAvatar(this.contractRunner.address!);
  };

  /**
   * Registers the connected wallet as a group avatar in Circles v2.
   * @param mint The address of the minting policy contract to use.
   * @param profile The profile data of the group.
   */
  registerGroupV2 = async (mint: string, profile: GroupProfile): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }

    const metadataDigest = await this.createProfileIfNecessary(profile);
    const receipt = await this.v2Hub.registerGroup(mint, profile.name, profile.symbol, metadataDigest);
    await receipt.wait();

    await this.waitForAvatarInfo(this.contractRunner.address!);
    return this.getAvatar(this.contractRunner.address!);
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

  /**
   * Migrates a v1 avatar and all its Circles holdings to v2.
   * @param avatar The avatar's address.
   * @param profile The profile data of the avatar.
   */
  migrateAvatar = async (avatar: string, profile: Profile): Promise<void> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }
    const avatarInfo = await this.data.getAvatarInfo(avatar);
    if (!avatarInfo) {
      throw new Error('Avatar not found');
    }

    if (avatarInfo.hasV1) {
      // 1. Stop V1 token if necessary
      if (avatarInfo.v1Token) {
        const v1Avatar = new V1Avatar(this, avatarInfo);
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
        await this.registerHumanV2(profile);
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

  /**
   * Migrates all V1 tokens of an avatar to V2.
   * @param avatar The avatar's address.
   */
  /**
   * Migrates all V1 token holdings of an avatar to V2.
   * @param avatar The avatar whose tokens to migrate.
   */
  migrateAllV1Tokens = async (avatar: string): Promise<void> => {
    if (!this.circlesConfig.migrationAddress) {
      throw new Error('Migration address not set');
    }
    const balances = await this.data.getTokenBalances(avatar, false);
    const tokensToMigrate = balances
      .filter(o => BigInt(o.balance) > 0);

    // TODO: Send in one transaction if sent to Safe
    await Promise.all(tokensToMigrate.map(async (t, i) => {
      const balance = BigInt(t.balance);
      const token = Token__factory.connect(t.token, this.contractRunner);
      const allowance = await token.allowance(avatar, this.circlesConfig.migrationAddress!);
      if (allowance < balance) {
        const increase = balance - allowance;
        const tx = await token.increaseAllowance(this.circlesConfig.migrationAddress!, increase);
        await tx.wait();
      }
    }));

    const migrationContract = Migration__factory.connect(this.circlesConfig.migrationAddress, this.contractRunner);
    const migrateTx = await migrationContract.migrate(
      tokensToMigrate.map(o => o.tokenOwner)
      , tokensToMigrate.map(o => BigInt(o.balance)));

    await migrateTx.wait();
  };
}