import { ethers } from 'ethers';
import { TransferStep } from './types';

/**
 * Pack a uint16 array into a hex string (big‑endian, no padding).
 */
export function packCoordinates(coords: number[]): string {
  const bytes = new Uint8Array(coords.length * 2);
  coords.forEach((c, i) => {
    const hi = c >> 8;
    const lo = c & 0xff;
    const offset = 2 * i;
    bytes[offset] = hi;
    bytes[offset + 1] = lo;
  });
  return ethers.hexlify(bytes);
}

/**
 * Build a sorted vertex list plus index lookup for quick coordinate mapping.
 */
export function transformToFlowVertices(
  transfers: TransferStep[],
  from: string,
  to: string
): { sorted: string[]; idx: Record<string, number> } {
  const set = new Set<string>([from.toLowerCase(), to.toLowerCase()]);
  transfers.forEach((t) => {
    set.add(t.from.toLowerCase());
    set.add(t.to.toLowerCase());
    set.add(t.tokenOwner.toLowerCase());
  });

  const sorted = [...set].sort((a, b) => {
    const lhs = BigInt(a);
    const rhs = BigInt(b);
    const isLess = lhs < rhs;
    const isGreater = lhs > rhs;
    return isLess ? -1 : isGreater ? 1 : 0;
  });

  const idx: Record<string, number> = {};
  sorted.forEach((addr, i) => {
    idx[addr] = i;
  });

  return { sorted, idx };
}