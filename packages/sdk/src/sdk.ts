import { Avatar } from './avatar';
import { ContractRunner } from 'ethers';
import { ChainConfig } from './chainConfig';
import { Pathfinder } from './v1/pathfinder';
import { AvatarInterface } from './AvatarInterface';
import { Hub as HubV1, Hub__factory as HubV1Factory, Token__factory } from '@circles-sdk/abi-v1';
import {
  Hub as HubV2,
  Hub__factory as HubV2Factory,
  Migration__factory, NameRegistry, NameRegistry__factory
} from '@circles-sdk/abi-v2';
import { AvatarRow, CirclesData, CirclesRpc } from '@circles-sdk/data';
import multihashes from 'multihashes';
import { V1Person } from './v1/v1Person';

/**
 * The SDK interface.
 */
interface SdkInterface {
  /**
   * The signer used to sign transactions (connected wallet e.g. MetaMask).
   */
  contractRunner: SdkContractRunner;
  /**
   * The chain specific Circles configuration (contract addresses and rpc endpoints).
   */
  chainConfig: ChainConfig;
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
  registerHumanV2: (cidV0: string) => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as an organization avatar in Circles v1.
   */
  registerOrganization: () => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as an organization avatar in Circles v2.
   * @param name The organization's name.
   * @param cidV0 The CIDv0 of the organization's metadata.
   */
  registerOrganizationV2: (name: string, cidV0: string) => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as a group avatar in Circles v2.
   * @param mint The address of the minting policy contract to use.
   * @param name The group's name.
   * @param symbol The group token's symbol.
   * @param cidV0 The CIDv0 of the group token's metadata.
   */
  registerGroupV2: (mint: string, name: string, symbol: string, cidV0: string) => Promise<AvatarInterface>;
  /**
   * Migrates a v1 avatar and all its Circles holdings to v2.
   * [[ Currently only works for human avatars. ]]
   * @param avatar The avatar's address.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  migrateAvatar: (avatar: string, cidV0: string) => Promise<void>;
}

/**
 * Wraps a contract runner with its address.
 */
export type SdkContractRunner = {
  /**
   * Used to interact with contracts. Must be a signer in order to change state.
   */
  runner: ContractRunner,
  /**
   * The address of the account that signs transactions.
   */
  address: string
};

/**
 * The SDK provides a high-level interface to interact with the Circles protocol.
 */
export class Sdk implements SdkInterface {
  /**
   * The signer used to sign transactions.
   */
  readonly contractRunner: SdkContractRunner;
  /**
   * The chain specific Circles configuration.
   */
  readonly chainConfig: ChainConfig;
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
   * The pathfinder client.
   */
  readonly v1Pathfinder?: Pathfinder;

  /**
   * Creates a new SDK instance.
   * @param chainConfig The chain specific Circles configuration.
   * @param contractRunner A contract runner instance and its address.
   */
  constructor(chainConfig: ChainConfig, contractRunner: SdkContractRunner) {
    this.chainConfig = chainConfig;
    this.contractRunner = contractRunner;

    this.circlesRpc = new CirclesRpc(chainConfig.circlesRpcUrl);
    this.data = new CirclesData(this.circlesRpc);
    this.v1Hub = HubV1Factory.connect(chainConfig.v1HubAddress ?? '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543', this.contractRunner.runner);
    if (chainConfig.v2HubAddress) {
      this.v2Hub = HubV2Factory.connect(chainConfig.v2HubAddress, this.contractRunner.runner);
    }
    if (chainConfig.pathfinderUrl) {
      this.v1Pathfinder = new Pathfinder(chainConfig.pathfinderUrl);
    }
    if (chainConfig.nameRegistryAddress) {
      this.nameRegistry = NameRegistry__factory.connect(chainConfig.nameRegistryAddress, this.contractRunner.runner);
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

    const signerAddress = this.contractRunner.address;
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  cidV0Digest = (cidV0: string) => {
    if (!cidV0.startsWith('Qm')) {
      throw new Error('Invalid CID. Must be a CIDv0 with sha2-256 hash in base58 encoding');
    }
    const cidBytes = multihashes.fromB58String(cidV0);
    const decodedCid = multihashes.decode(cidBytes);
    return decodedCid.digest;
  };

  registerHumanV2 = async (cidV0: string): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }
    const metadataDigest = this.cidV0Digest(cidV0);
    const tx = await this.v2Hub.registerHuman(metadataDigest);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    const signerAddress = this.contractRunner.address;
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

    const signerAddress = this.contractRunner.address;
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  registerOrganizationV2 = async (name: string, cidV0: string): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }
    const metadataDigest = this.cidV0Digest(cidV0);
    const receipt = await this.v2Hub.registerOrganization(name, metadataDigest);
    await receipt.wait();

    const signerAddress = this.contractRunner.address;
    await this.waitForAvatarInfo(signerAddress);

    return this.getAvatar(signerAddress);
  };

  registerGroupV2 = async (mint: string, name: string, symbol: string, cidV0: string): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }
    const metatdataDigest = this.cidV0Digest(cidV0);
    const receipt = await this.v2Hub.registerGroup(mint, name, symbol, metatdataDigest);
    await receipt.wait();

    const signerAddress = this.contractRunner.address;
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
    if (!this.chainConfig.migrationAddress) {
      throw new Error('Migration address not set');
    }
    const balances = await this.data.getTokenBalances(avatar, false);
    const tokensToMigrate = balances
      .filter(o => BigInt(o.balance) > 0);

    // TODO: Send in one transaction if sent to Safe
    await Promise.all(tokensToMigrate.map(async (t, i) => {
      const balance = BigInt(t.balance);
      const token = Token__factory.connect(t.token, this.contractRunner.runner);
      const allowance = await token.allowance(avatar, this.chainConfig.migrationAddress!);
      if (allowance < balance) {
        const increase = balance - allowance;
        const tx = await token.increaseAllowance(this.chainConfig.migrationAddress!, increase);
        await tx.wait();
      }
    }));

    const migrationContract = Migration__factory.connect(this.chainConfig.migrationAddress, this.contractRunner.runner);
    const migrateTx = await migrationContract.migrate(
      tokensToMigrate.map(o => o.tokenOwner)
      , tokensToMigrate.map(o => BigInt(o.balance)));

    await migrateTx.wait();
  };
}