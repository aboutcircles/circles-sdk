import {TransferMessageEncoder} from '../../sdk/src/v2/transferMessage';

describe('TransferMessageEncoder', () => {
  it('should encode and decode messages correctly', () => {
    const enc = new TransferMessageEncoder();
    const hex = enc.encodeMessage("Hello Circles!");  // 0x8973…0000000e48656c6c6f20436972636c657321
    const msg = enc.decodeMessage(hex);               // "Hello Circles!"
    expect(msg).toBe("Hello Circles!");
  })
});