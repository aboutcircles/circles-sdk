import { ethers } from 'ethers';

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

export const generateRandomAddress = () => ethers.Wallet.createRandom().address;
