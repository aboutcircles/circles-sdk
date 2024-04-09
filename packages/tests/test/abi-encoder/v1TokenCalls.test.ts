import { ethers } from 'ethers';
import TokenV1 from '@circles/circles-contracts/out/Token.sol/Token.json';
import { generateRandomAddress } from '../util';
import { V1TokenCalls as V1TokenCallsEncoder } from '@circles-sdk/abi-v1';
import {
  V1TokenInputTypes,
  V1TokenDecoders as V1TokenCallsDecoder
} from '@circles-sdk/abi-v1';

describe('V1TokenCalls', () => {
  const contractInterface = new ethers.Interface(TokenV1.abi);

  // Test for the deployedAt method
  test('approve() encodes and decodes correctly', () => {
    const spender = generateRandomAddress();
    const amount = BigInt(100);
    const encoded = new V1TokenCallsEncoder().approve(<V1TokenInputTypes.ApproveInputs>{
      spender,
      amount
    });
    const decoded = new V1TokenCallsDecoder().decode(encoded);
    const inputs = <V1TokenInputTypes.ApproveInputs>decoded.inputs;

    expect(decoded?.name).toBe('approve');
    expect(inputs.spender).toEqual(spender);
    expect(inputs.amount).toEqual(amount);
  });

  test('decreaseAllowance() encodes and decodes correctly', () => {
    const spender = generateRandomAddress();
    const subtractedValue = BigInt(100);
    const encoded = new V1TokenCallsEncoder().decreaseAllowance(<V1TokenInputTypes.DecreaseAllowanceInputs>{
      spender,
      subtractedValue
    });
    const decoded = new V1TokenCallsDecoder().decode(encoded);
    const inputs = <V1TokenInputTypes.DecreaseAllowanceInputs>decoded.inputs;

    expect(decoded?.name).toBe('decreaseAllowance');
    expect(inputs.spender).toEqual(spender);
    expect(inputs.subtractedValue).toEqual(subtractedValue);
  });

  test('increaseAllowance() encodes and decodes correctly', () => {
    const spender = generateRandomAddress();
    const addedValue = BigInt(100);
    const encoded = new V1TokenCallsEncoder().increaseAllowance(<V1TokenInputTypes.IncreaseAllowanceInputs>{
      spender,
      addedValue
    });
    const decoded = new V1TokenCallsDecoder().decode(encoded);
    const inputs = <V1TokenInputTypes.IncreaseAllowanceInputs>decoded.inputs;

    expect(decoded?.name).toBe('increaseAllowance');
    expect(inputs.spender).toEqual(spender);
    expect(inputs.addedValue).toEqual(addedValue);
  });

  test('transfer() encodes and decodes correctly', () => {
    const dst = generateRandomAddress();
    const wad = BigInt(100);
    const encoded = new V1TokenCallsEncoder().transfer(<V1TokenInputTypes.TransferInputs>{
      dst,
      wad
    });
    const decoded = new V1TokenCallsDecoder().decode(encoded);
    const inputs = <V1TokenInputTypes.TransferInputs>decoded.inputs;

    expect(decoded?.name).toBe('transfer');
    expect(inputs.dst).toEqual(dst);
    expect(inputs.wad).toEqual(wad);
  });

  test('transferFrom() encodes and decodes correctly', () => {
    const sender = generateRandomAddress();
    const recipient = generateRandomAddress();
    const amount = BigInt(100);
    const encoded = new V1TokenCallsEncoder().transferFrom(<V1TokenInputTypes.TransferFromInputs>{
      sender,
      recipient,
      amount
    });
    const decoded = new V1TokenCallsDecoder().decode(encoded);
    const inputs = <V1TokenInputTypes.TransferFromInputs>decoded.inputs;

    expect(decoded?.name).toBe('transferFrom');
    expect(inputs.sender).toEqual(sender);
    expect(inputs.recipient).toEqual(recipient);
    expect(inputs.amount).toEqual(amount);
  });

  test('totalSupply() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().totalSupply();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('totalSupply');
    expect(decoded?.args).toEqual([]);
  });

  test('decimals() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().decimals();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('decimals');
    expect(decoded?.args).toEqual([]);
  });

  test('name() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().name();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('name');
    expect(decoded?.args).toEqual([]);
  });

  test('symbol() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().symbol();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('symbol');
    expect(decoded?.args).toEqual([]);
  });

  test('currentIssuance() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().currentIssuance();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('currentIssuance');
    expect(decoded?.args).toEqual([]);
  });

  test('findInflationOffset() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().findInflationOffset();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('findInflationOffset');
    expect(decoded?.args).toEqual([]);
  });

  test('hub() encodes and decodes correctly', () => {
    const encoded = new V1TokenCallsEncoder().hub();
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('hub');
    expect(decoded?.args).toEqual([]);
  });

  test('balanceOf(address) encodes and decodes correctly', () => {
    const address = generateRandomAddress();
    const encoded = new V1TokenCallsEncoder().balanceOf(<V1TokenInputTypes.BalanceOfInputs>{ account: address });
    const decoded = contractInterface.parseTransaction({ data: encoded });

    expect(decoded?.name).toBe('balanceOf');
    expect(decoded?.args).toEqual([address]);
  });
});
