import multihashes from 'multihashes';

export const cidV0Digest = (cidV0: string) => {
  if (!cidV0.startsWith("Qm")) {
    throw new Error("Invalid CID. Must be a CIDv0 with sha2-256 hash in base58 encoding");
  }
  const cidBytes = multihashes.fromB58String(cidV0);
  const decodedCid = multihashes.decode(cidBytes);
  console.log(decodedCid);
  return decodedCid.digest;
}