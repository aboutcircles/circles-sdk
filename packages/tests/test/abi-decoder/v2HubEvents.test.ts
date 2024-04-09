import { ethers } from 'ethers';
import HubV2 from '@circles/circles-contracts-v2/out/Hub.sol/Hub.json';
import {
  ApprovalForAllEvent,
  CidV0Event,
  DemurragedTransferBatchEvent,
  DemurragedTransferSingleEvent,
  InviteHumanEvent,
  RegisterGroupEvent,
  RegisterHumanEvent,
  RegisterOrganizationEvent,
  TransferBatchEvent,
  TransferSingleEvent,
  TrustEvent,
  URIEvent,
  V2HubEvents
} from '@circles-sdk/abi-v2';
import { createLog, uintToAddress } from '../util';

export const V2HubEventNames = {
  'ApprovalForAll': null,
  'CidV0': null,
  'DemurragedTransferBatch': null,
  'DemurragedTransferSingle': null,
  'InviteHuman': null,
  'RegisterGroup': null,
  'RegisterHuman': null,
  'RegisterOrganization': null,
  'TransferBatch': null,
  'TransferSingle': null,
  'Trust': null,
  'URI': null
} as const;

const contractInterface: ethers.Interface = ethers.Interface.from(HubV2.abi);

describe('V2HubEvents', () => {
  // Template for ApprovalForAll event
  test('ApprovalForAll event decodes correctly', () => {
    const account = ethers.Wallet.createRandom().address;
    const operator = ethers.Wallet.createRandom().address;
    const approved = true;
    const log = createLog(contractInterface, 'ApprovalForAll', [account, operator, approved]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <ApprovalForAllEvent><unknown>decoded.data;
    expect(decoded.name).toEqual('ApprovalForAll');
    expect(eventData.account).toEqual(account);
    expect(eventData.operator).toEqual(operator);
    expect(eventData.approved).toEqual(approved);
  });

  // Template for CidV0 event
  test('CidV0 event decodes correctly', () => {
    const avatar = ethers.Wallet.createRandom().address;
    const cidV0Digest = ethers.hexlify(ethers.randomBytes(32)); // Simulate a bytes32 value
    const log = createLog(contractInterface, 'CidV0', [avatar, cidV0Digest]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <CidV0Event><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('CidV0');
    expect(eventData.avatar).toEqual(avatar);
    expect(eventData.cidV0Digest).toEqual(cidV0Digest);
  });

  // Template for DemurragedTransferBatch event
  test('DemurragedTransferBatch event decodes correctly', () => {
    const operator = ethers.Wallet.createRandom().address;
    const from = ethers.Wallet.createRandom().address;
    const to = ethers.Wallet.createRandom().address;
    const ids = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address]; // Example token IDs
    const values = [BigInt(100), BigInt(200), BigInt(300)]; // Example values
    const inflationaryValues = [BigInt(110), BigInt(220), BigInt(330)]; // Example inflation-adjusted values
    const log = createLog(contractInterface, 'DemurragedTransferBatch', [operator, from, to, ids, values, inflationaryValues]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <DemurragedTransferBatchEvent><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('DemurragedTransferBatch');
    expect(eventData.operator).toEqual(operator);
    expect(eventData.from).toEqual(from);
    expect(eventData.to).toEqual(to);
    expect(eventData.ids.map(id => uintToAddress(BigInt(id)))).toEqual(ids);
    expect(eventData.values).toEqual(values);
    expect(eventData.inflationaryValues).toEqual(inflationaryValues);
  });

  test('DemurragedTransferSingle event decodes correctly', () => {
    const operator = ethers.Wallet.createRandom().address;
    const from = ethers.Wallet.createRandom().address;
    const to = ethers.Wallet.createRandom().address;
    const id = from; // Example token ID
    const value = BigInt(100); // Example value
    const inflationaryValue = BigInt(110); // Example inflation-adjusted value
    const log = createLog(contractInterface, 'DemurragedTransferSingle', [operator, from, to, id, value, inflationaryValue]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <DemurragedTransferSingleEvent><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('DemurragedTransferSingle');
    expect(eventData.operator).toEqual(operator);
    expect(eventData.from).toEqual(from);
    expect(eventData.to).toEqual(to);
    expect(uintToAddress(BigInt(eventData.id))).toEqual(id);
    expect(eventData.value).toEqual(value);
    expect(eventData.inflationaryValue).toEqual(inflationaryValue);
  });

// Template for InviteHuman event
  test('InviteHuman event decodes correctly', () => {
    const inviter = ethers.Wallet.createRandom().address;
    const invited = ethers.Wallet.createRandom().address;
    const log = createLog(contractInterface, 'InviteHuman', [inviter, invited]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <InviteHumanEvent><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('InviteHuman');
    expect(eventData.inviter).toEqual(inviter);
    expect(eventData.invited).toEqual(invited);
  });

// Template for TransferSingle event
  test('TransferSingle event decodes correctly', () => {
    const operator = ethers.Wallet.createRandom().address;
    const from = ethers.Wallet.createRandom().address;
    const to = ethers.Wallet.createRandom().address;
    const id = from;
    const value = BigInt(100); // Example value
    const log = createLog(contractInterface, 'TransferSingle', [operator, from, to, id, value]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <TransferSingleEvent><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('TransferSingle');
    expect(eventData.operator).toEqual(operator);
    expect(eventData.from).toEqual(from);
    expect(eventData.to).toEqual(to);
    expect(uintToAddress(BigInt(eventData.id))).toEqual(id);
    expect(eventData.value).toEqual(value);
  });

  test('RegisterGroup event decodes correctly', () => {
    const group = ethers.Wallet.createRandom().address;
    const mint = ethers.Wallet.createRandom().address;
    const treasury = ethers.Wallet.createRandom().address;
    const name = "GroupName";
    const symbol = "GN";
    const log = createLog(contractInterface, 'RegisterGroup', [group, mint, treasury, name, symbol]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <RegisterGroupEvent><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('RegisterGroup');
    expect(eventData.group).toEqual(group);
    expect(eventData.mint).toEqual(mint);
    expect(eventData.treasury).toEqual(treasury);
    expect(eventData.name).toEqual(name);
    expect(eventData.symbol).toEqual(symbol);
  });

  test('RegisterHuman event decodes correctly', () => {
    const avatar = ethers.Wallet.createRandom().address;
    const log = createLog(contractInterface, 'RegisterHuman', [avatar]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <RegisterHumanEvent><unknown>decoded.data;
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    expect(decoded.name).toEqual('RegisterHuman');
    expect(eventData.avatar).toEqual(avatar);
  });

  test('RegisterOrganization event decodes correctly', () => {
    const organization = ethers.Wallet.createRandom().address;
    const name = "OrganizationName";
    const log = createLog(contractInterface, 'RegisterOrganization', [organization, name]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <RegisterOrganizationEvent><unknown>decoded.data;
    expect(decoded.name).toEqual('RegisterOrganization');
    expect(eventData.organization).toEqual(organization);
    expect(eventData.name).toEqual(name);
  });

  test('TransferBatch event decodes correctly', () => {
    const operator = ethers.Wallet.createRandom().address;
    const from = ethers.Wallet.createRandom().address;
    const to = ethers.Wallet.createRandom().address;
    const ids = [BigInt(1), BigInt(2), BigInt(3)]; // Example token IDs
    const values = [BigInt(100), BigInt(200), BigInt(300)]; // Example values
    const log = createLog(contractInterface, 'TransferBatch', [operator, from, to, ids, values]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <TransferBatchEvent><unknown>decoded.data;
    expect(decoded.name).toEqual('TransferBatch');
    expect(eventData.operator).toEqual(operator);
    expect(eventData.from).toEqual(from);
    expect(eventData.to).toEqual(to);
    expect(eventData.ids).toEqual(ids);
    expect(eventData.values).toEqual(values);
  });

  test('Trust event decodes correctly', () => {
    const truster = ethers.Wallet.createRandom().address;
    const trustee = ethers.Wallet.createRandom().address;
    const expiryTime = BigInt(1234567890);
    const log = createLog(contractInterface, 'Trust', [truster, trustee, expiryTime]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <TrustEvent><unknown>decoded.data;
    expect(decoded.name).toEqual('Trust');
    expect(eventData.truster).toEqual(truster);
    expect(eventData.trustee).toEqual(trustee);
    expect(eventData.expiryTime).toEqual(expiryTime);
  });

  test('URI event decodes correctly', () => {
    const value = "http://example.com/token/metadata";
    const id = BigInt(1); // Example token ID
    const log = createLog(contractInterface, 'URI', [value, id]);

    const decoded = new V2HubEvents().decodeEventData(log);
    if (!decoded) {
      throw new Error('Decoding failed');
    }
    const eventData = <URIEvent><unknown>decoded.data;
    expect(decoded.name).toEqual('URI');
    expect(eventData.value).toEqual(value);
    expect(eventData.id).toEqual(id);
  });
});

