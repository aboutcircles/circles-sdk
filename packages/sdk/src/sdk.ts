import { Avatar } from './avatar';
import { CirclesConfig } from './circlesConfig';
import { AvatarInterface } from './AvatarInterface';
import {
  Hub as HubV1,
  Hub__factory as HubV1Factory,
  NameRegistryV1,
  NameRegistryV1__factory
} from '@circles-sdk/abi-v1';
import {
  CMGroupDeployer,
  CMGroupDeployer__factory,
  BaseGroupFactory,
  BaseGroupFactory__factory,
  DemurrageCircles,
  DemurrageCircles__factory,
  Hub as HubV2,
  Hub__factory as HubV2Factory,
  InflationaryCircles,
  InflationaryCircles__factory,
  NameRegistry,
  NameRegistry__factory
} from '@circles-sdk/abi-v2';
import { AvatarRow, CirclesData, CirclesRpc } from '@circles-sdk/data';
import { Address, cidV0ToUint8Array } from '@circles-sdk/utils';
import { GroupProfile, Profile, Profiles } from '@circles-sdk/profiles';
import { ContractRunner, ContractTransactionReceipt } from 'ethers';
import { SdkContractRunner } from '@circles-sdk/adapter';
import { circlesConfig } from './config';
import { V2Pathfinder } from './v2/pathfinderV2';
import { GroupType } from '@circles-sdk/data/dist/circlesDataInterface';

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
   * An instance of the v2 Pathfinder client.
   */
  v2Pathfinder?: V2Pathfinder;
  /**
   * An instance of the v2 Core Members Group deployer.
   */
  coreMembersGroupDeployer?: CMGroupDeployer;
  /**
   * An instance of the v2 Base Group deployer.
   */
  baseGroupFactory?: BaseGroupFactory;
  /**
   * Stores and retrieves profiles from the Circles profile service.
   */
  profiles?: Profiles;
  /**
   * Gets an Avatar instance by its address. Fails if the avatar is not signed up at Circles.
   * @param avatarAddress The avatar's address.
   * @returns The Avatar instance.
   */
  getAvatar: (avatarAddress: Address) => Promise<Avatar>;
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
  registerGroupV2: (mint: Address, profile: GroupProfile) => Promise<AvatarInterface>;

  /**
   * Creates or updates a user profile.
   *
   * @param {Profile | string} profile - Profile object containing user information or a CID pointing to an existing profile.
   * @returns {Promise<ContractTransactionReceipt>} - A promise that resolves to the transaction receipt of the operation.
   */
  createOrUpdateProfile: (profile: Profile | string) => Promise<ContractTransactionReceipt>;

}


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
   * The typechain generated V1NameRegistry contract wrapper.
   */
  readonly v1NameRegistry?: NameRegistryV1;
  /**
   * The pathfinder client (v2).
   */
  readonly v2Pathfinder: V2Pathfinder;
  /**
   * The Core Members Group deployer (v2).
   */
  readonly coreMembersGroupDeployer?: CMGroupDeployer;
  /**
   * The Base Group deployer (v2).
   */
  readonly baseGroupFactory?: BaseGroupFactory;
  /**
   * The profiles service client.
   */
  readonly profiles?: Profiles;

  /**
   * Contains the bootstrap periods for each known hub contract.
   */
  readonly bootstrapPeriods: { [contract: string]: number } = {
    '0xc12c1e50abb450d6205ea2c3fa861b3b834d13e8': /*deployedAt:*/ 1728824950 + /*bootsrapTime:*/ 2883058,
    '0x3d61f0a272ec69d65f5cff097212079aafde8267': /*deployedAt:*/ 1730401610 + /*bootsrapTime:*/ 1313598
  };

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
    this.v2Pathfinder = new V2Pathfinder(this.circlesConfig.circlesRpcUrl);
    this.data = new CirclesData(this.circlesRpc);
    this.v1Hub = HubV1Factory.connect(this.circlesConfig.v1HubAddress ?? '0x29b9a7fBb8995b2423a71cC17cf9810798F6C543', <ContractRunner>this.contractRunner);
    if (this.circlesConfig.v2HubAddress) {
      this.v2Hub = HubV2Factory.connect(this.circlesConfig.v2HubAddress, <ContractRunner>this.contractRunner);
    }
    if (this.circlesConfig.nameRegistryAddress) {
      this.nameRegistry = NameRegistry__factory.connect(this.circlesConfig.nameRegistryAddress, <ContractRunner>this.contractRunner);
    }
    if (this.circlesConfig.v1NameRegistryAddress) {
      this.v1NameRegistry = NameRegistryV1__factory.connect(this.circlesConfig.v1NameRegistryAddress, <ContractRunner>this.contractRunner);
    }
    if (this.circlesConfig.profileServiceUrl) {
      this.profiles = new Profiles(this.circlesConfig.profileServiceUrl);
    }
    if (this.circlesConfig.coreMembersGroupDeployer) {
      this.coreMembersGroupDeployer = CMGroupDeployer__factory.connect(this.circlesConfig.coreMembersGroupDeployer, <ContractRunner>this.contractRunner);
    }
    if (this.circlesConfig.baseGroupFactory) {
      this.baseGroupFactory = BaseGroupFactory__factory.connect(this.circlesConfig.baseGroupFactory, <ContractRunner>this.contractRunner);
    }
  }

  /**
   * Gets an avatar by its address.
   * @param avatarAddress The avatar's address.
   * @param subscribe Whether to subscribe to avatar events.
   * @returns The avatar instance.
   * @throws If the given avatar address is not signed up at Circles.
   */
  getAvatar = async (avatarAddress: Address, subscribe: boolean = true): Promise<Avatar> => {
    const avatar = new Avatar(this, avatarAddress);
    await avatar.initialize(subscribe);

    return avatar;
  };

  /**
   * Creates or updates a profile and registers its CID in the NameRegistry.
   *
   * @param {Profile | string} profile - The profile information or profile ID to be created or updated.
   * @returns {Promise<ContractTransactionReceipt>} - A promise that resolves to the transaction receipt.
   * @throws {Error} - Throws an error if the Profiles service or NameRegistry is not configured,
   *                   or if the transaction fails.
   */
  createOrUpdateProfile = async (profile: Profile | string): Promise<ContractTransactionReceipt> => {
    if (!this.profiles) {
      throw new Error('Profiles service is not configured');
    }
    if (!this.nameRegistry) {
      throw new Error('NameRegistry is not configured');
    }

    const profileCid = await this.createProfileIfNecessary(profile);

    // Register the profile CID in the NameRegistry
    const tx = await this.nameRegistry.updateMetadataDigest(profileCid);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Transaction failed');
    }

    return receipt;
  };


  /**
   * If you have been invited to Circles, you can accept the invitation and join the Circles network.
   * Specify who invited you and supply the profile you want to use with your new account.
   * @param inviter The address of the avatar that invited you.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  acceptInvitation(inviter: Address, cidV0: string): Promise<AvatarInterface>;
  /**
   * If you have been invited to Circles, you can accept the invitation and join the Circles network.
   * @param inviter The address of the avatar that invited you.
   * @param profile The profile data of the avatar.
   */
  acceptInvitation(inviter: Address, profile: Profile): Promise<AvatarInterface>;
  async acceptInvitation(inviter: Address, profile: Profile | string): Promise<AvatarInterface> {
    inviter = inviter.toLowerCase() as Address;
    return this._registerHuman(inviter, profile);
  }

  private async _registerHuman(inviter: Address, profile: Profile | string): Promise<AvatarInterface> {
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
  registerGroupV2 = async (mint: Address, profile: GroupProfile): Promise<AvatarInterface> => {
    if (!this.v2Hub) {
      throw new Error('V2 hub not available');
    }

    const metadataDigest = await this.createProfileIfNecessary(profile);
    const receipt = await this.v2Hub.registerGroup(mint, profile.name, profile.symbol, metadataDigest);
    await receipt.wait();

    await this.waitForAvatarInfo(this.contractRunner.address!);
    return this.getAvatar(this.contractRunner.address!);
  };

  private waitForAvatarInfo = async (address: Address): Promise<AvatarRow> => {
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





  getInflationaryWrapper = async (wrapperAddress: Address): Promise<InflationaryCircles> => {
    return InflationaryCircles__factory.connect(wrapperAddress, <ContractRunner>this.contractRunner);
  };

  getDemurragedWrapper = async (wrapperAddress: Address): Promise<DemurrageCircles> => {
    return DemurrageCircles__factory.connect(wrapperAddress, <ContractRunner>this.contractRunner);
  };

  isCoreMembersGroup = async (avatar: Address): Promise<boolean> => {
    const results = this.data.findGroups(1, {
      groupAddressIn: [avatar],
      groupTypeIn: ['CrcV2_CMGroupCreated']
    });

    return !!(await results.getSingleRow());
  };

  getGroupType = async (avatar: Address): Promise<GroupType | undefined> => {
    const results = this.data.findGroups(1, {
      groupAddressIn: [avatar]
    });

    return (await results.getSingleRow())?.type;
  };

  /**
   * Checks if the `to` address is a group minter and excludes the group tokens from the transfer
   * if that's the case.
   * @param to The receiver of the transfer
   * @param excludeFromTokens The existing list of tokens to exclude from the transfer
   * @returns The complete list of tokens to exclude from the transfer
   */
  async getDefaultTokenExcludeList(to:Address, excludeFromTokens?: Address[]) : Promise<Address[] | undefined> {
    const groupInfoByMintHandler = this.data.findGroups(1, {
      mintHandlerEquals: to
    });

    const groupInfo = await groupInfoByMintHandler.getSingleRow();
    const completeExcludeFromTokenList = new Set<string>();
    if (groupInfo) {
      completeExcludeFromTokenList.add(groupInfo.group);
      if (groupInfo.erc20WrapperDemurraged) {
        completeExcludeFromTokenList.add(groupInfo.erc20WrapperDemurraged);
      }
      if (groupInfo.erc20WrapperStatic) {
        completeExcludeFromTokenList.add(groupInfo.erc20WrapperStatic);
      }
    }

    excludeFromTokens?.forEach(completeExcludeFromTokenList.add);

    if (completeExcludeFromTokenList.size == 0)
      return undefined;

    return <Address[]>Array.from(completeExcludeFromTokenList);
  }
}