import { hexlify, keccak256, toUtf8Bytes } from 'ethers';

// export const NAMESPACE = Uint8Array.from(Buffer.from(keccak256(toUtf8Bytes('CIRCLESv2:RESERVED_DATA')).substring(2).slice(0, 16), 'hex'));
export const DATA_NAMESPACE = Uint8Array.from([[16, 32, 224, 192, 39, 46, 71, 223]]);
export const VERSION = 0x01;
export const TAIL = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);

export enum Codec {
  RAW = 0x55,
  CBOR = 0x51,
  DAG_CBOR = 0x71,
  CIDV1 = 0x01,
  UTF8 = 0x7f,
}

const u32be = (n: number): Uint8Array =>
  Uint8Array.from([
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff
  ]);

function u8Concat(chunks: readonly Uint8Array[]): Uint8Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Uint8Array(len);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/**
 * Encode a payload with a header and tail.
 * @param payload The payload as Uint8Array.
 * @param codec The codec to use for encoding the payload.
 * @param withTail Whether to append the tail bytes (default: true).
 */
export function encode(
  payload: Uint8Array,
  codec: Codec = Codec.UTF8,
  withTail = true
): Uint8Array {
  if (payload.length > 0xffffffff) throw new Error('payload too big');

  const header = Uint8Array.of(
    VERSION,
    codec,
    ...u32be(payload.length)
  );

  return withTail
    ? u8Concat([DATA_NAMESPACE, header, payload, TAIL])
    : u8Concat([DATA_NAMESPACE, header, payload]);
}

export type Decoded = { codec: number; payload: Uint8Array } | null;

export function decode(buf: Uint8Array, withTail = true): Decoded {
  if (buf.length < 14) return null;
  if (withTail && buf.length < 18) return null;

  for (let i = 0; i < DATA_NAMESPACE.length; i++) {
    if (buf[i] !== DATA_NAMESPACE[i]) return null;
  }
  if (buf[8] !== VERSION) return null;

  const codec = buf[9];
  const len = (buf[10] << 24) | (buf[11] << 16) | (buf[12] << 8) | buf[13];
  if (buf.length < 14 + len) return null;

  if (withTail && buf.length !== 14 + len + 4) return null;

  return {
    codec,
    payload: buf.subarray(14, 14 + len)
  };
}
