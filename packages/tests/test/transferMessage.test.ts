import { encode, decode, Codec, TAIL, DATA_NAMESPACE } from '@circles-sdk/sdk';
import { keccak256, toUtf8Bytes } from 'ethers';

describe("Envelope v1", () => {
  it("round-trip UTF-8", () => {
    const ns = Uint8Array.from(Buffer.from(keccak256(toUtf8Bytes('CIRCLESv2:RESERVED_DATA')).substring(2).slice(0, 16), "hex"));
    const encoded = encode(toUtf8Bytes("hello world"));
    expect(DATA_NAMESPACE).toEqual(ns);
    const decoded = decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.codec).toBe(Codec.UTF8);
    expect(Buffer.from(decoded!.payload).toString("utf8")).toBe("hello world");
  });

  it("adds tail when requested", () => {
    const encoded = encode(toUtf8Bytes("x"), Codec.UTF8, true);
    expect(encoded.slice(-4)).toEqual(TAIL);
  });

  it("rejects bad namespace", () => {
    const bad = encode(toUtf8Bytes("oops"));
    bad[0] ^= 0xff;
    expect(decode(bad)).toBeNull();
  });

  it("rejects bad version", () => {
    const bad = encode(toUtf8Bytes(("oops")));
    bad[8] = 0xff;
    expect(decode(bad)).toBeNull();
  });

  it("rejects truncated buffer", () => {
    const good = encode(toUtf8Bytes("12345"));
    const short = good.subarray(0, good.length - 2);
    expect(decode(short)).toBeNull();

    const good2 = encode(toUtf8Bytes("12345"));
    const short2 = good2.subarray(0, good2.length - 4);
    const decoded2 = decode(short2, false);
    expect(decoded2).not.toBeNull();
    expect(Buffer.from(decoded2.payload).toString("utf8")).toBe("12345");

    const good3 = encode(toUtf8Bytes("12345"), Codec.UTF8, false);
    const short3 = good3.subarray(0, good3.length - 2);
    expect(decode(short3, false)).toBeNull();
  });
});
