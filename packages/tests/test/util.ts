import { ethers, HDNodeWallet } from 'ethers';
import HUB_V1 from '@circles/circles-contracts/out/Hub.sol/Hub.json';
import CRC_V1 from '@circles/circles-contracts/out/Token.sol/Token.json';
import HUB_V2 from '@circles/circles-contracts-v2/out/Hub.sol/Hub.json';
import multihashes, { HashCode, HashName } from 'multihashes';

export const V1_HUB_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const V2_HUB_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

export const FUNDING_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

export const JSON_RPC_URL = "http://localhost:8545";

export type Unregistered = "unregistered";
export type V1Avatar = "v1Person" | "v1Organization";
export type HumanAvatar = "registeredHuman" | "invitedActiveHuman" | "invitedInactiveHuman";
export type OrganizationAvatar = "registeredOrganization";
export type GroupAvatar = "registeredGroup" | "registeredCustomGroup";
export type AvatarType = Unregistered | V1Avatar | HumanAvatar | OrganizationAvatar | GroupAvatar;

export type Avatar = {
  type: AvatarType;
  address: string;
  key: string;
  wallet: HDNodeWallet
};

export const createLog = (contractInterface: ethers.Interface, eventName: string, eventArgs: any[]): {
  topics: string[],
  data: string
} => {
  const eventSignature = contractInterface.getEvent(eventName);
  if (!eventSignature) {
    throw new Error(`Event ${eventName} not found in contract interface`);
  }
  return contractInterface.encodeEventLog(eventSignature, eventArgs);
};

export const uintToAddress = (uint: bigint) => ethers.getAddress('0x' + uint.toString(16).padStart(40, '0'));
export const addressToUint = (address: string) => BigInt('0x' + address.slice(2));

export const decodeMultihash = (cidV0: string) => {
  const multihashBytes = multihashes.fromB58String(cidV0);
  return multihashes.decode(multihashBytes);
}

export const encodeMultihash = (decodedCidV0Digest: Uint8Array, decodedMultihash: {
  code: HashCode;
  name: HashName;
  length: number;
  digest: Uint8Array;
}) => {
  const restoredCidV0 = multihashes.encode(decodedCidV0Digest, decodedMultihash.code, decodedMultihash.length);
  return multihashes.toB58String(restoredCidV0);
}

export const generateRandomAddress = () => ethers.Wallet.createRandom().address;
export const generateRandomData = (length: number) => ethers.randomBytes(length);

/**
 * Returns a fresh unregistered avatar.
 * The index can be used to address a specific unregistered avatar.
 */
export const getUnregisteredAvatar = async (): Promise<Avatar> => {
  const provider = await getJsonRpcProvider();
  const mainWallet = new ethers.Wallet(FUNDING_PRIVATE_KEY, provider);

  const subWallet = ethers.Wallet.createRandom().connect(provider);
  const tx = await mainWallet.sendTransaction({
    to: subWallet.address,
    value: ethers.parseEther("1")
  });
  await tx.wait();

  return {
    type: "unregistered",
    address: subWallet.address,
    key: subWallet.privateKey,
    wallet: subWallet
  };
};

export type V1PersonAvatar = Avatar & {
  type: "v1Person";
  v1TokenAddress: string;
};

export const getActiveV1PersonAvatar = async (): Promise<V1PersonAvatar> => {
  const unregistered = await getUnregisteredAvatar();
  const hubContract = new ethers.Contract(V1_HUB_ADDRESS, HUB_V1.abi, unregistered.wallet);
  // await hubContract.signup();
  const tx = await hubContract.signup();
  await tx.wait();
  const v1TokenAddress = await hubContract.userToToken(unregistered.address);

  return {
    ...unregistered,
    type: "v1Person",
    v1TokenAddress: v1TokenAddress
  };
}

export const getStoppedV1PersonAvatar = async (): Promise<V1PersonAvatar> => {
  const activeV1PersonAvatar = await getActiveV1PersonAvatar();
  const tokenContract = new ethers.Contract(activeV1PersonAvatar.v1TokenAddress, CRC_V1.abi, activeV1PersonAvatar.wallet);
  const tx = await tokenContract.stop();
  await tx.wait();

  return {
    ...activeV1PersonAvatar
  };
}

export const getV1TokenState = async (v1TokenAddress: string): Promise<boolean> => {
  const provider = await getJsonRpcProvider();
  const tokenContract = new ethers.Contract(v1TokenAddress, CRC_V1.abi, provider);

  return await tokenContract.stopped();
}

export type RegisteredHuman = Avatar & {
  type: "registeredHuman";
};
export const registerHuman = async (unregisteredAvatar: Avatar): Promise<RegisteredHuman> => {
  const hubV2Contract = new ethers.Contract(V2_HUB_ADDRESS, HUB_V2.abi, unregisteredAvatar.wallet);
  // TODO: Get the CID from somewhere
  const cidV0 = "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB";
  const decodedMultihash = multihashes.fromB58String(cidV0);
  const hashBytes32 = decodedMultihash.slice(-32);
  const tx = await hubV2Contract.registerHuman(hashBytes32);
  await tx.wait();
  return {
    ...unregisteredAvatar,
    type: "registeredHuman",
  };
};

export type RegisteredOrganization = Avatar & {
  type: "registeredOrganization";
};
export const registerOrganization = async (unregisteredAvatar: Avatar): Promise<RegisteredOrganization> => {
  const hubV2Contract = new ethers.Contract(V2_HUB_ADDRESS, HUB_V2.abi, unregisteredAvatar.wallet);
  // TODO: Get the CID from somewhere
  const cidV0 = "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB";
  const decodedMultihash = multihashes.fromB58String(cidV0);
  const hashBytes32 = decodedMultihash.slice(-32);
  const tx = await hubV2Contract.registerOrganization("test org", hashBytes32);
  await tx.wait();
  return {
    ...unregisteredAvatar,
    type: "registeredOrganization",
  };
};

export type RegisteredGroup = Avatar & {
  type: "registeredGroup"
};
export const registerGroup = async (unregisteredAvatar: Avatar): Promise<RegisteredGroup> => {
  const hubV2Contract = new ethers.Contract(V2_HUB_ADDRESS, HUB_V2.abi, unregisteredAvatar.wallet);
  // TODO: Get the CID from somewhere
  const cidV0 = "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB";
  const decodedMultihash = multihashes.fromB58String(cidV0);
  const mintPolicy = "0x";
  const name = "test group";
  const symbol = "TST";
  const cidBytes = decodedMultihash.slice(-32);
  const tx = await hubV2Contract.registerGroup(mintPolicy, name, symbol, cidBytes);
  await tx.wait();
  return {
    ...unregisteredAvatar,
    type: "registeredGroup",
  };
};

export type RegisteredCustomGroup = Avatar & {
  type: "registeredCustomGroup";
};
export const registerCustomGroup = async (unregisteredAvatar: Avatar, treasuryAddress: string): Promise<RegisteredCustomGroup> => {
  throw new Error("Not implemented");
};

export const getJsonRpcProvider = async (): Promise<ethers.JsonRpcProvider> => {
  return new ethers.JsonRpcProvider(JSON_RPC_URL);
};

export const balanceOf = async (userAddress: string): Promise<ethers.BigNumberish> => {
  const provider = await getJsonRpcProvider();
  const contract = new ethers.Contract(V2_HUB_ADDRESS, HUB_V2.abi, provider)
  return await contract.balanceOf(userAddress, userAddress);
}

export type InvitedActiveHuman = Avatar & {
  type: "invitedActiveHuman";
};

export const inviteHuman = async (inviteeAddress: string, inviter: Avatar): Promise<InvitedActiveHuman> => {
  const hubV2Contract = new ethers.Contract(V2_HUB_ADDRESS, HUB_V2.abi, inviter.wallet);
  const tx = await hubV2Contract.inviteHuman(inviteeAddress);
  await tx.wait();
  return {
    ...inviter,
    type: "invitedActiveHuman",
  };
};

export type MintCirclesResult = {
  success: boolean;
};

/**
 * Mints Circles tokens for a registered human avatar using the personalMint method.
 * @param avatar The avatar object representing a registered human.
 * @returns A promise that resolves to a MintCirclesResult indicating success or failure.
 */
export const mintCircles = async (avatar: Avatar): Promise<MintCirclesResult> => {
  console.log('Minting Circles tokens for avatar', avatar);
  const hubContract = new ethers.Contract(V2_HUB_ADDRESS, HUB_V2.abi, avatar.wallet);

  try {
    const tx = await hubContract.personalMint();
    await tx.wait();
    console.log('Circles tokens minted successfully');
    return { success: true };
  } catch (error) {
    return { success: false };
  }
};