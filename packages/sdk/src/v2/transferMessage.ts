import { ethers } from "ethers";

/**
 * Circles attaches a message to a transfer with the layout
 *   [32-byte MARKER][4-byte big-endian LENGTH][UTF-8 DATA]
 *
 * Indexers look for the marker and parse the trailing bytes as UTF-8.
 */
export class TransferMessageEncoder {
  /** 32-byte marker recognised by indexers */
  public readonly MARKER = ethers.keccak256(
    ethers.toUtf8Bytes("CIRCLESv2:RESERVED_DATA:UTF8_TRANSFER_MESSAGE")
  );

  /**
   * Encode a human-readable message for a transfer.
   *
   * @param message UTF-8 text to embed.
   * @returns Hex string (`0x…`) ready for the `data` field.
   */
  encodeMessage(message: string): string {
    const messageBytes = ethers.toUtf8Bytes(message);
    const markerBytes = ethers.getBytes(this.MARKER);

    const len = messageBytes.length;
    if (len > 0xffffffff) {
      throw new Error("Message exceeds 4 GiB – cannot encode.");
    }

    // 4-byte big-endian length prefix
    const lengthBytes = Uint8Array.from([
      (len >>> 24) & 0xff,
      (len >>> 16) & 0xff,
      (len >>> 8) & 0xff,
      len & 0xff,
    ]);

    const full = ethers.concat([markerBytes, lengthBytes, messageBytes]);
    return ethers.hexlify(full); // => 0x…
  }

  /**
   * Decode the embedded message from transfer data.
   *
   * @param data Raw bytes (Buffer | Uint8Array) or hex string.
   */
  decodeMessage(data: Uint8Array | string): string {
    // Normalise to Uint8Array
    const bytes =
      typeof data === "string"
        ? ethers.getBytes(data)
        : new Uint8Array(data); // covers Buffer & Uint8Array

    const markerBytes = ethers.getBytes(this.MARKER);
    const markerSize = markerBytes.length; // 32
    const lengthSize = 4;

    if (bytes.length < markerSize + lengthSize) {
      throw new Error("Data too short – cannot contain a message.");
    }

    // Marker check
    for (let i = 0; i < markerSize; i++) {
      if (bytes[i] !== markerBytes[i]) {
        throw new Error("Marker mismatch – not a Circles message.");
      }
    }

    // Read uint32 length (big-endian)
    const lengthOffset = markerSize;
    const msgLen =
      (bytes[lengthOffset] << 24) |
      (bytes[lengthOffset + 1] << 16) |
      (bytes[lengthOffset + 2] << 8) |
      bytes[lengthOffset + 3];

    const start = markerSize + lengthSize;
    const end = start + msgLen;

    if (bytes.length < end) {
      throw new Error("Data truncated – incomplete message.");
    }

    return ethers.toUtf8String(bytes.slice(start, end));
  }
}
