import {Avatar} from './avatar';
import {CirclesConfig} from './circlesConfig';
import {Pathfinder} from './v1/pathfinder';
import {AvatarInterface} from './AvatarInterface';
import {Hub as HubV1, Hub__factory as HubV1Factory, Token__factory} from '@circles-sdk/abi-v1';
import {
  DemurrageCircles,
  DemurrageCircles__factory,
  Hub as HubV2,
  Hub__factory as HubV2Factory,
  InflationaryCircles,
  InflationaryCircles__factory,
  Migration__factory,
  NameRegistry,
  NameRegistry__factory
} from '@circles-sdk/abi-v2';
import {AvatarRow, CirclesData, CirclesRpc} from '@circles-sdk/data';
import {V1Avatar} from './v1/v1Avatar';
import {cidV0ToUint8Array} from '@circles-sdk/utils';
import {GroupProfile, Profile, Profiles} from '@circles-sdk/profiles';
import {ContractRunner, ZeroAddress} from "ethers";
import {SdkContractRunner, TransactionRequest} from "@circles-sdk/adapter";
import {circlesConfig} from "./config";

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
   * @param profile The profile data of the avatar.
   * @trustRelations An optional list of trust relations to migrate.
   */
  migrateAvatar: (avatar: string, profile: Profile, trustRelations?: string[]) => Promise<void>;
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
  readonly contractRunner: SdkContractRunner;
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
   * @param contractRunner A contract runner instance and its address.
   * @param config The optional chain specific Circles configuration.
   */
  constructor(contractRunner: SdkContractRunner, config?: CirclesConfig) {
    this.circlesConfig = config ?? circlesConfig[100];

    this.contractRunner = contractRunner;
    if (!this.contractRunner.address) {
      throw new Error('Contract runner is not initialized');
    }

    this.circlesRpc = new CirclesRpc(this.circlesConfig.circlesRpcUrl);
    this.data = new CirclesData(this.circlesRpc);
    this.v1Hub = HubV1Factory.connect(this.circlesConfig.v1HubAddress ?? '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543', <ContractRunner>this.contractRunner);
    if (this.circlesConfig.v2HubAddress) {
      this.v2Hub = HubV2Factory.connect(this.circlesConfig.v2HubAddress, <ContractRunner>this.contractRunner);
    }
    if (this.circlesConfig.pathfinderUrl) {
      this.v1Pathfinder = new Pathfinder(this.circlesConfig.pathfinderUrl);
    }
    if (this.circlesConfig.v2PathfinderUrl) {
      this.v2Pathfinder = new Pathfinder(this.circlesConfig.v2PathfinderUrl);
    }
    if (this.circlesConfig.nameRegistryAddress) {
      this.nameRegistry = NameRegistry__factory.connect(this.circlesConfig.nameRegistryAddress, <ContractRunner>this.contractRunner);
    }
    if (this.circlesConfig.profileServiceUrl) {
      this.profiles = new Profiles(this.circlesConfig.profileServiceUrl);
    }
  }

  /**
   * Gets an avatar by its address.
   * @param avatarAddress The avatar's address.
   * @param subscribe Whether to subscribe to avatar events.
   * @returns The avatar instance.
   * @throws If the given avatar address is not signed up at Circles.
   */
  getAvatar = async (avatarAddress: string, subscribe: boolean = true): Promise<Avatar> => {
    const avatar = new Avatar(this, avatarAddress);
    await avatar.initialize(subscribe);

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
   * If you have been invited to Circles, you can accept the invitation and join the Circles network.
   * Specify who invited you and supply the profile you want to use with your new account.
   * @param inviter The address of the avatar that invited you.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  acceptInvitation(inviter: string, cidV0: string): Promise<AvatarInterface>;
  /**
   * If you have been invited to Circles, you can accept the invitation and join the Circles network.
   * @param inviter The address of the avatar that invited you.
   * @param profile The profile data of the avatar.
   */
  acceptInvitation(inviter: string, profile: Profile): Promise<AvatarInterface>;
  async acceptInvitation(inviter: string, profile: Profile | string): Promise<AvatarInterface> {
    return this._registerHuman(inviter, profile);
  }

  private async _registerHuman(inviter: string, profile: Profile | string): Promise<AvatarInterface> {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }

    let metadataDigest: Uint8Array = await this.createProfileIfNecessary(profile);

    const tx = await this.v2Hub.registerHuman(inviter, metadataDigest);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    await this.waitForAvatarInfo(this.contractRunner.address!);

    return this.getAvatar(this.contractRunner.address!);
  }

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
  /**
   * Migrates a v1 avatar and all its Circles holdings to v2.
   * @param avatar The avatar's address.
   * @param profile The profile data of the avatar.
   * @param trustRelations An optional list of trust relations to migrate.
   */
  migrateAvatar = async (avatar: string, profile: Profile, trustRelations?: string[]): Promise<void> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }
    const avatarInfo = await this.data.getAvatarInfo(avatar);
    if (!avatarInfo) {
      throw new Error('Avatar not found');
    }

    // Check if the contract runner supports batch transactions
    const contractRunner = this.contractRunner;
    if (!contractRunner.sendBatchTransaction) {
      throw new Error('Batch transaction not supported by contract runner');
    }

    // Create a new batch
    const batch = contractRunner.sendBatchTransaction();

    if (avatarInfo.hasV1) {
      // 1. Stop V1 token if necessary
      if (avatarInfo.v1Token) {
        const v1Avatar = new V1Avatar(this, avatarInfo);
        const isStopped = await v1Avatar.v1Token?.stopped();

        if (!isStopped) {
          if (!v1Avatar.v1Token) {
            throw new Error(`Could not load V1 token for avatar ${avatar}. Token address: ${avatarInfo.v1Token}`);
          }

          // Add 'personalMint' to the batch
          const personalMintData = v1Avatar.v1Token.interface.encodeFunctionData('update');
          const personalMintTx: TransactionRequest = {
            to: avatarInfo.v1Token!,
            data: personalMintData,
            value: 0n,
          };
          batch.addTransaction(personalMintTx);

          // Add 'v1Token.stop' to the batch
          const stopData = v1Avatar.v1Token.interface.encodeFunctionData('stop');
          const stopTx: TransactionRequest = {
            to: avatarInfo.v1Token,
            data: stopData,
            value: 0n,
          };
          batch.addTransaction(stopTx);
        }
      }

      // 2. Signup V2 avatar if necessary
      if (avatarInfo.version === 1) {
        // Add 'registerHumanV2' to the batch
        const metadataDigest = await this.createProfileIfNecessary(profile);

        if (avatarInfo.type === "CrcV1_Signup") {
          const registerHumanData = this.v2Hub.interface.encodeFunctionData('registerHuman', [ZeroAddress, metadataDigest]);
          const registerHumanTx: TransactionRequest = {
            to: this.circlesConfig.v2HubAddress!,
            data: registerHumanData,
            value: 0n,
          };
          batch.addTransaction(registerHumanTx);
        } else if (avatarInfo.type === "CrcV1_OrganizationSignup") {
          const registerOrganizationData = this.v2Hub.interface.encodeFunctionData('registerOrganization', [profile.name, metadataDigest]);
          const registerOrganizationTx: TransactionRequest = {
            to: this.circlesConfig.v2HubAddress!,
            data: registerOrganizationData,
            value: 0n,
          };
          batch.addTransaction(registerOrganizationTx);
        } else {
          throw new Error(`Avatar type ${avatarInfo.type} not supported`);
        }
      }

      if (avatarInfo.isHuman) {
        // 3. Ensure the v1 token minting status is known to the v2 hub
        // Add 'calculateIssuanceTx' to the batch
        const calculateIssuanceData = this.v2Hub.interface.encodeFunctionData('calculateIssuanceWithCheck', [avatar]);
        const calculateIssuanceTx: TransactionRequest = {
          to: this.circlesConfig.v2HubAddress!,
          data: calculateIssuanceData,
          value: 0n,
        };
        batch.addTransaction(calculateIssuanceTx);
      }

      // // 4. Migrate V1 tokens
      // // Add 'migrateV1Tokens' to the batch
      await this.migrateV1TokensBatch(avatar, undefined, batch);

      // 4. Migrate trust relations
      if (trustRelations) {
        // Add 'trust' to the batch
        for (const trustRelation of trustRelations) {
          const trustData = this.v2Hub.interface.encodeFunctionData('trust', [trustRelation, BigInt('79228162514264337593543950335')]);
          const trustTx: TransactionRequest = {
            to: this.circlesConfig.v2HubAddress!,
            data: trustData,
            value: 0n,
          };
          batch.addTransaction(trustTx);
        }
      }

      // Run the batch
      const batchResponse = await batch.run();
      console.log('Batch transaction response:', batchResponse);
    } else {
      throw new Error('Avatar is not a V1 avatar');
    }
  };

  /**
   * Migrates all V1 token holdings of an avatar to V2 using batch transactions.
   * @param avatar The avatar whose tokens to migrate.
   * @param tokens An optional list of token addresses to migrate. If not provided, all tokens will be migrated.
   * @param batch An optional batch transaction to add transactions to.
   */
  migrateV1TokensBatch = async (avatar: string, tokens?: string[], batch?: any): Promise<void> => {
    if (!this.circlesConfig.migrationAddress) {
      throw new Error('Migration address not set');
    }

    // If no batch is provided, create one
    let ownBatch = false;
    if (!batch) {
      const contractRunner = this.contractRunner;
      if (!contractRunner.sendBatchTransaction) {
        throw new Error('Batch transaction not supported by contract runner');
      }
      batch = contractRunner.sendBatchTransaction();
      ownBatch = true;
    }

    const tokenSet = new Set(tokens?.map(o => o.toLowerCase()) ?? []);
    const balances = await this.data.getTokenBalances(avatar);
    const v1Balances = balances.filter(o =>
      o.version === 1 &&
      (tokenSet.size > 0 ? tokenSet.has(o.tokenAddress?.toLowerCase()) : true)
    );

    const tokensToMigrate = v1Balances.filter(o => BigInt(o.attoCrc) > 0n);
    console.log(`Migrating the following v1 tokens:`, tokensToMigrate);

    // Fetch allowances in parallel
    const allowances = await Promise.all(tokensToMigrate.map(async (tokenToMigrate) => {
      const token = Token__factory.connect(tokenToMigrate.tokenAddress, <ContractRunner>this.contractRunner);
      return await token.allowance(avatar, this.circlesConfig.migrationAddress!);
    }));

    // Process tokensToMigrate and allowances
    for (let i = 0; i < tokensToMigrate.length; i++) {
      const tokenToMigrate = tokensToMigrate[i];
      const allowance = allowances[i];
      const balance = BigInt(tokenToMigrate.attoCrc);
      const token = Token__factory.connect(tokenToMigrate.tokenAddress, <ContractRunner>this.contractRunner);

      if (allowance < balance) {
        const increase = balance - allowance;
        const increaseAllowanceData = token.interface.encodeFunctionData('increaseAllowance', [this.circlesConfig.migrationAddress!, increase]);
        const tx: TransactionRequest = {
          to: tokenToMigrate.tokenAddress,
          data: increaseAllowanceData,
          value: 0n,
        };
        batch.addTransaction(tx);
      }
    }

    // Add the migrate call
    const migrationContract = Migration__factory.connect(this.circlesConfig.migrationAddress, <ContractRunner>this.contractRunner);
    const tokensToMigrateAddresses = tokensToMigrate.map(o => o.tokenOwner);
    const amountsToMigrate = tokensToMigrate.map(o => BigInt(o.attoCrc));

    const migrateData = migrationContract.interface.encodeFunctionData('migrate', [tokensToMigrateAddresses, amountsToMigrate]);
    const migrateTx: TransactionRequest = {
      to: this.circlesConfig.migrationAddress,
      data: migrateData,
      value: 0n,
    };
    batch.addTransaction(migrateTx);

    // If we created our own batch, run it
    if (ownBatch) {
      const batchResponse = await batch.run();
      console.log('Batch transaction response:', batchResponse);
    }
  };

  /**
   * Migrates all V1 token holdings of an avatar to V2.
   * @param avatar The avatar whose tokens to migrate.
   * @param tokens An optional list of token addresses to migrate. If not provided, all tokens will be migrated.
   */
  migrateV1Tokens = async (avatar: string, tokens?: string[]): Promise<void> => {
    if (!this.circlesConfig.migrationAddress) {
      throw new Error('Migration address not set');
    }

    const balances = await this.data.getTokenBalances(avatar);
    const v1Balances = balances.filter(o => o.version === 1 && (tokens ? tokens.map(o => o.toLowerCase()).includes(o.tokenAddress?.toLowerCase()) : true));
    const tokensToMigrate = v1Balances.filter(o => BigInt(o.attoCrc) > 0);
    console.log(`Migrating the following v1 token:`, tokensToMigrate);

    // TODO: Send in one transaction if sent to Safe
    await Promise.all(tokensToMigrate.map(async (tokenToMigrate) => {
      const balance = BigInt(tokenToMigrate.attoCrc);
      console.log(`tokenToMigrate`, tokenToMigrate);
      const token = Token__factory.connect(tokenToMigrate.tokenAddress, <ContractRunner>this.contractRunner);
      const allowance = await token.allowance(avatar, this.circlesConfig.migrationAddress!);
      if (allowance < balance) {
        const increase = balance - allowance;
        const tx = await token.increaseAllowance(this.circlesConfig.migrationAddress!, increase);
        await tx.wait();
      }
    }));

    const migrationContract = Migration__factory.connect(this.circlesConfig.migrationAddress, <ContractRunner>this.contractRunner);
    const migrateTx = await migrationContract.migrate(
      tokensToMigrate.map(o => o.tokenOwner)
      , tokensToMigrate.map(o => BigInt(o.attoCrc)));

    await migrateTx.wait();
  };

  getInflationaryWrapper = async (wrapperAddress: string): Promise<InflationaryCircles> => {
    return InflationaryCircles__factory.connect(wrapperAddress, <ContractRunner>this.contractRunner);
  }

  getDemurragedWrapper = async (wrapperAddress: string): Promise<DemurrageCircles> => {
    return DemurrageCircles__factory.connect(wrapperAddress, <ContractRunner>this.contractRunner);
  }
}