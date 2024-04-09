import {
  HubTransferEvent, OrganizationSignupEvent, SignupEvent, TrustEvent,
  V1HubEvents
} from '@circles-sdk/abi-v1';
import { ethers } from 'ethers';
import { createLog } from '../util';
import HubV1 from '@circles/circles-contracts/out/Hub.sol/Hub.json';

export const V1HubEventNames = {
  'HubTransfer': null,
  'OrganizationSignup': null,
  'Signup': null,
  'Trust': null
} as const;

const contractInterface: ethers.Interface = ethers.Interface.from(HubV1.abi);

describe('V1HubEvents', () => {
  test('HubTransfer event decodes correctly', () => {
    const from = ethers.Wallet.createRandom().address;
    const to = ethers.Wallet.createRandom().address;
    const amount = BigInt(1000); // Example amount
    const log = createLog(contractInterface, 'HubTransfer', [from, to, amount]);

    const decoded = new V1HubEvents().decodeEventData(log);
    expect(decoded).toBeDefined();
    const eventData = <HubTransferEvent><unknown>decoded!.data;
    expect(decoded!.name).toEqual('HubTransfer');
    expect(eventData.from).toEqual(from);
    expect(eventData.to).toEqual(to);
    expect(eventData.amount).toEqual(amount);
  });

  // Test for OrganizationSignup event
  test('OrganizationSignup event decodes correctly', () => {
    const organization = ethers.Wallet.createRandom().address;
    const log = createLog(contractInterface, 'OrganizationSignup', [organization]);

    const decoded = new V1HubEvents().decodeEventData(log);
    expect(decoded).toBeDefined();
    const eventData = <OrganizationSignupEvent><unknown>decoded!.data;
    expect(decoded!.name).toEqual('OrganizationSignup');
    expect(eventData.organization).toEqual(organization);
  });

  // Test for Signup event
  test('Signup event decodes correctly', () => {
    const user = ethers.Wallet.createRandom().address;
    const token = ethers.Wallet.createRandom().address; // Simulate an ERC20 token address
    const log = createLog(contractInterface, 'Signup', [user, token]);

    const decoded = new V1HubEvents().decodeEventData(log);
    expect(decoded).toBeDefined();
    const eventData = <SignupEvent><unknown>decoded!.data;
    expect(decoded!.name).toEqual('Signup');
    expect(eventData.user).toEqual(user);
    expect(eventData.token).toEqual(token);
  });

  test("Trust event decodes correctly", () => {
    const canSendTo = ethers.Wallet.createRandom().address;
    const user = ethers.Wallet.createRandom().address;
    const limit = BigInt(1000); // Example limit
    const log = createLog(contractInterface, 'Trust', [canSendTo, user, limit]);

    const decoded = new V1HubEvents().decodeEventData(log);
    expect(decoded).toBeDefined();
    const eventData = <TrustEvent><unknown>decoded!.data;
    expect(decoded!.name).toEqual('Trust');
    expect(eventData.canSendTo).toEqual(canSendTo);
    expect(eventData.user).toEqual(user);
    expect(eventData.limit).toEqual(limit);
  });
});