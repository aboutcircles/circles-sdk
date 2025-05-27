import { ethers } from 'ethers';

export const HUB_READ_ABI = [
  "function isTrusted(address,address) view returns (bool)",
  "function advancedUsageFlags(address) view returns (bytes32)",
  "function avatars(address) view returns (address)"
];

async function sendBatchEthCalls(rpcUrl: string, toAddress:string /*HUB_ADDRESS*/, reqs: any[]): Promise<any[]> {
  const payload = reqs.map((rq) => ({
    jsonrpc: "2.0",
    id: rq.id,
    method: "eth_call",
    params: [
      {
        to: toAddress,
        data: rq.data
      },
      "latest"
    ]
  }));

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const json = await res.json();

  return json.map((r: any) => {
    const original = reqs[r.id];
    return {
      meta: original.meta,
      result: original.decode(r.result)
    };
  });
}

export async function assertAllVerticesRegistered(rpcUrl:string, hubAddress:string, vertices: string[]): Promise<void> {
  const iface = new ethers.Interface(HUB_READ_ABI);
  const calls = vertices.map((v, i) => ({
    id: i,
    data: iface.encodeFunctionData("avatars", [v]),
    decode: (r: string) => iface.decodeFunctionResult("avatars", r)[0],
    meta: v
  }));
  const res = await sendBatchEthCalls(rpcUrl, hubAddress, calls);
  const unregistered = res.find((r) => r.result === ethers.ZeroAddress);
  if (unregistered) {
    throw new Error(`Vertex ${unregistered.meta} is not a registered avatar`);
  }
}

export async function assertVerticesStrictlyAscending(vertices: string[]): Promise<void> {
  for (let i = 0; i < vertices.length - 1; i++) {
    const currentGreaterOrEqualNext = BigInt(vertices[i]) >= BigInt(vertices[i + 1]);

    if (currentGreaterOrEqualNext) {
      throw new Error("flowVertices must be strictly ascending");
    }
  }
}