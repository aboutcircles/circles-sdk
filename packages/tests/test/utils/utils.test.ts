import {
  cidV0ToUint8Array,
  hexStringToUint8Array, uint8ArrayToCidV0,
  uint8ArrayToHexString
} from '@circles-sdk/utils';

describe('utils', () => {
  it('should convert a CidV0 to a hex string', () => {
    const cidV0 = 'QmWYATU4cCT5gNcSJnyp5hS7sHBj4wTtYRdqg5WfecjJMH';
    const uint8Array = cidV0ToUint8Array(cidV0);
    console.log(`uint8Array: ${uint8Array.length} bytes`);
    expect(uint8Array.length).toBe(32);
    console.log(`uint8Array: ${uint8Array}`);
    const hexString = uint8ArrayToHexString(uint8Array);
    expect(hexString).toBe('79d0852096e3630e74b7ac00a74a5a2a162dd3cd255e5c33855fce784dd26fdc');
    console.log(`hexString: ${hexString}`);
  });

  it('should convert a hex string to a CidV0', () => {
    const hexString = '79d0852096e3630e74b7ac00a74a5a2a162dd3cd255e5c33855fce784dd26fdc';
    const uint8Array = hexStringToUint8Array(hexString);
    console.log(`uint8Array: ${uint8Array.length} bytes`);
    expect(uint8Array.length).toBe(32);
    console.log(`uint8Array: ${uint8Array}`);

    const cidV0 = uint8ArrayToCidV0(uint8Array);
    console.log(`cidV0: ${cidV0}`);
    expect(cidV0).toBe('QmWYATU4cCT5gNcSJnyp5hS7sHBj4wTtYRdqg5WfecjJMH');
  });
});