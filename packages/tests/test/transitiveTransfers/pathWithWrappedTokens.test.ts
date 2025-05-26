import { CirclesData, CirclesRpc, TokenInfoRow } from '@circles-sdk/data';
import { Address, CirclesConverter } from '@circles-sdk/utils';
import { ethers } from 'ethers';

type PathfindingResult = {
  maxFlow: string;
  transfers: TransferStep[];
}

type TransferStep = {
  from: string;
  to: string;
  tokenOwner: string;
  value: string;
}

// same shapes the generated TypeChain files use
export interface FlowEdge {
  streamSinkId: number;
  amount: ethers.BigNumberish;
}

export interface Stream {
  sourceCoordinate: number;
  flowEdgeIds: number[];
  data: string /* hex */
  ;
}

export interface FlowMatrix {
  flowVertices: string[];      // address[]
  flowEdges: FlowEdge[];       // tuple(uint16,uint192)[]
  streams: Stream[];           // tuple(uint16,uint16[],bytes)[]
  packedCoordinates: string;   // hex bytes
  sourceCoordinate: number;    // convenience, not part of ABI
}

type Call = { to: string; data: string };

const MULTISEND_ABI = ['function multiSend(bytes transactions)'];
const WRAPPER_ERC20_TOKEN_ABI = ['function unwrap(uint256 _amount)'];
const OPERATE_FLOW_MATRIX_ABI = [
  'function operateFlowMatrix(address[] _flowVertices,(uint16,uint192)[] _flow,(uint16,uint16[],bytes)[] _streams,bytes _packed)'
];
const HUB_APPROVAL_ABI = [
  'function setApprovalForAll(address operator, bool approved)'
];
const HUB_READ_ABI = [
  'function isTrusted(address,address) view returns (bool)',
  'function advancedUsageFlags(address) view returns (bytes32)',
  'function avatars(address) view returns (address)'
];
const SAFE_ABI = [
  'function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)'
];

const MULTISEND_ADDRESS = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';
const HUB_ADDRESS = '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8';

const SOURCE_SAFE_ADDRESS = '0xDE374ece6fA50e781E81Aac78e811b33D16912c7';
const SAFE_OWNER = '0xD68193591d47740E51dFBc410da607A351b56586';
const SINK_ADDRESS = '0xf7bd3d83df90b4682725adf668791d4d1499207f';
const AMOUNT = '14700000000000000000000';
const WITH_WRAP = true;

const circlesRpcUrl = 'https://rpc.circlesubi.network';
const circlesData = new CirclesData(new CirclesRpc(circlesRpcUrl));
const provider = new ethers.JsonRpcProvider(circlesRpcUrl);

describe('transfer wrapped tokens along a path', () => {
  // The pathfinder can include wrapped tokens in the pathfinding result.
  // Usually the token owner (avatar that issues the token) is used as token identifier for the transfer edge
  // With wrapped tokens, the erc20 token address is used instead.
  // Because wrapped tokens must be unwrapped before they can be transferred, and this can only
  // be done by the holder, the pathfinder considers wrapped tokens only if they are owned by the sender.
  // So wrapped tokens can only appear in the edges originating from the sender.

  it('should return an executable path with wrapped tokens', async () => {
    const transferPath = await findPath(SOURCE_SAFE_ADDRESS, SINK_ADDRESS);
    console.log('Transfer path:', transferPath);

    // Check if all flows are conserved in the original path from the pathfinder.
    console.log('Check if all flows are conserved in the original path from the pathfinder');
    assertNoNettedFlowMismatch(transferPath);

    // Get the token info of all involved tokens
    const tokenInfoMap = await getTokenInfoMapFromPath(transferPath);
    console.log('All tokens used in the path:', tokenInfoMap);

    // Maps the wrapped token addresses to their total amount and type.
    const wrappedTokenTotals = getWrappedTokenTotalsFromPath(transferPath, tokenInfoMap);
    console.log('The total sums of wrapped tokens used in the path:', wrappedTokenTotals);

    // Maps the wrapped token addresses to their unwrapped total and token owner.
    const unwrappedTokenTotals = getExpectedUnwrappedTokenTotals(wrappedTokenTotals, tokenInfoMap);
    console.log('The total sums of unwrapped tokens used in the path:', unwrappedTokenTotals);

    const pathWithUnwrappedTokens = replaceWrappedTokens(transferPath, unwrappedTokenTotals);
    console.log('pathWithUnwrappedTokens', pathWithUnwrappedTokens);

    // Now replace the edges that use wrapped tokens with the unwrapped equivalents.
    const shrunkPathWithUnwrappedTokens = shrinkPathValues(pathWithUnwrappedTokens);

    await assertFlowPermittedByTrustBatch(shrunkPathWithUnwrappedTokens);

    await assertRegistrationBatch(shrunkPathWithUnwrappedTokens);

    // Check if all flows are conserved in our adjusted path
    console.log('Check if all flows are conserved in our adjusted path');
    assertNoNettedFlowMismatch(shrunkPathWithUnwrappedTokens);

    // Create a flow matrix from the path and use estimateGas to check if it is valid.
    const flowMatrix = createFlowMatrix(
      SOURCE_SAFE_ADDRESS,                                              // sender
      SINK_ADDRESS,                                                // final recipient
      shrunkPathWithUnwrappedTokens.maxFlow,                     // total value
      shrunkPathWithUnwrappedTokens.transfers                    // hops
    );

    await assertAllVerticesRegistered(flowMatrix.flowVertices);   // new helper
    await assertVerticesStrictlyAscending(flowMatrix.flowVertices);

    const operateFlowMatrixCall = encodeOperateFlowMatrix(HUB_ADDRESS, flowMatrix);

    /* 1 approval, unwrap, operateFlowMatrix */
    const subCalls: Call[] = [
      buildSelfApprovalCall(HUB_ADDRESS, SOURCE_SAFE_ADDRESS),
      ...buildUnwrapCalls(wrappedTokenTotals),
      operateFlowMatrixCall
    ];

    // 2 wrap them for MultiSend
    const multiSendCall = encodeMultiSendForSafe(subCalls);

    // 3 call estimateGas
    const safeIface = new ethers.Interface(SAFE_ABI);

    const safeCalldata = safeIface.encodeFunctionData('execTransaction', [
      multiSendCall.to,
      0,
      multiSendCall.data,
      1,  // DELEGATECALL
      0, 0, 0,
      ethers.ZeroAddress,
      ethers.ZeroAddress,
      buildPreValidatedSig(SAFE_OWNER)
    ]);

    const gas = await provider.estimateGas({
      from: SAFE_OWNER,
      to: SOURCE_SAFE_ADDRESS,
      data: safeCalldata
    });

    console.log('estimated gas', gas.toString());

    if (gas === BigInt(0)) {
      throw new Error('Gas estimation returned 0. Most likely the path length exceeds the max. block gas.');
    }

    expect(gas).toBeGreaterThan(0);
  }, 60 * 1000 * 2);
});

async function findPath(source: string, sink: string) {
  const request = {
    'jsonrpc': '2.0',
    'id': 2,
    'method': 'circlesV2_findPath',
    'params': [{
      'Source': source,
      'Sink': sink,
      'TargetFlow': AMOUNT,
      'WithWrap': WITH_WRAP
    }]
  };

  const response = await fetch('https://rpc.circlesubi.network', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  const jsonResponse = await response.json();
  const result: PathfindingResult = jsonResponse.result;
  return result;
}

async function getTokenInfoMapFromPath(transferPath: PathfindingResult) {
  const tokenInfoMap = new Map<string, TokenInfoRow>();
  const tokenAddresses = new Set<string>();
  transferPath.transfers.forEach((transfer) => {
    tokenAddresses.add(transfer.tokenOwner);
  });

  const tokenInfoBatchResponse = await circlesData.getTokenInfoBatch(<Address[]>Array.from(tokenAddresses));
  tokenInfoBatchResponse.forEach((tokenInfo) => {
    tokenInfoMap.set(tokenInfo.token.toLowerCase(), tokenInfo);
  });
  return tokenInfoMap;
}

function getWrappedTokenTotalsFromPath(transferPath: PathfindingResult, tokenInfoMap: Map<string, TokenInfoRow>) {
  // Find all edges that transfer wrapped tokens
  const wrappedTokenEdges = transferPath.transfers.filter((transfer) => {
    const tokenInfo = tokenInfoMap.get(transfer.tokenOwner.toLowerCase());
    return tokenInfo && (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Inflationary' || tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Demurraged');
  });

  // Get the totals per wrapped token
  const wrappedTokenTotals = wrappedTokenEdges.reduce((acc, transfer) => {
    if (!acc[transfer.tokenOwner]) {
      acc[transfer.tokenOwner] = [BigInt(0), tokenInfoMap.get(transfer.tokenOwner.toLowerCase())?.type];
    }
    acc[transfer.tokenOwner][0] += BigInt(transfer.value);
    return acc;
  }, {} as Record<string, [bigint, string]>);

  return wrappedTokenTotals;
}

function getExpectedUnwrappedTokenTotals(wrappedTokenTotals: Record<string, [bigint, string]>, tokenInfoMap: Map<string, TokenInfoRow>) {
  const unwrappedTokenTotals: Record<string, [bigint, string]> = {};

  // Wrapped tokens must be unwrapped before they can be transferred.
  for (let wrappedToken in wrappedTokenTotals) {
    const [totalAmount, tokenType] = wrappedTokenTotals[wrappedToken];

    // Demurraged wrapped tokens can just be unwrapped:
    if (tokenType === 'CrcV2_ERC20WrapperDeployed_Demurraged') {

      unwrappedTokenTotals[wrappedToken] = [
        totalAmount,
        tokenInfoMap.get(wrappedToken).tokenOwner
      ];
    }

    // The pathfinder specifies the amount of the inflactionary wrapper in demurraged units.
    // So we need to calculate the static amount to unwrap first.
    if (tokenType === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
      const staticAmountToUnwrap = CirclesConverter.attoCirclesToAttoStaticCircles(totalAmount);

      // The contract's unwrap function performs another conversion to demurraged units,
      // which we need to account for.
      const availableAmountAfterUnwrap = CirclesConverter.attoStaticCirclesToAttoCircles(staticAmountToUnwrap);

      unwrappedTokenTotals[wrappedToken] = [
        availableAmountAfterUnwrap,
        tokenInfoMap.get(wrappedToken).tokenOwner
      ];
    }
  }
  return unwrappedTokenTotals;
}

/* -------------------------------- helpers ------------------------------- */

/** pack uint16[] -> hex string, big-endian, no padding */
function packCoordinates(coords: number[]): string {
  const bytes = new Uint8Array(coords.length * 2);
  coords.forEach((c, i) => {
    bytes[2 * i] = c >> 8;       // high byte
    bytes[2 * i + 1] = c & 0xff;     // low byte
  });
  return ethers.hexlify(bytes);
}

/** build sorted vertex list and lookup map */
function transformToFlowVertices(
  transfers: TransferStep[],
  from: string,
  to: string
): { sorted: string[]; idx: Record<string, number> } {
  const set = new Set<string>([from.toLowerCase(), to.toLowerCase()]);
  transfers.forEach(t => {
    set.add(t.from.toLowerCase());
    set.add(t.to.toLowerCase());
    set.add(t.tokenOwner.toLowerCase());
  });

  const sorted = [...set].sort((a, b) => {
    const A = BigInt(a);              // BigInt('0x…') is fine
    const B = BigInt(b);
    return A < B ? -1 : A > B ? 1 : 0;
  });

  const idx: Record<string, number> = {};
  sorted.forEach((addr, i) => {
    idx[addr] = i;
  });

  return { sorted, idx };
}

/* ---------------------------- main builder ----------------------------- */

export function createFlowMatrix(
  from: string,
  to: string,
  value: string,
  transfers: TransferStep[]
): FlowMatrix {
  from = from.toLowerCase();
  to = to.toLowerCase();

  const { sorted: flowVertices, idx } = transformToFlowVertices(transfers, from, to);

  /* ----- edges ----- */
  const flowEdges: FlowEdge[] = transfers.map(t => ({
    streamSinkId: t.to.toLowerCase() === to ? 1 : 0,
    amount: t.value            // keep as string; ethers will BN-ify
  }));

  /* guarantee ≥1 terminal edge */
  if (!flowEdges.some(e => e.streamSinkId === 1)) {
    const last = transfers.map(t => t.to.toLowerCase()).lastIndexOf(to);
    flowEdges[last === -1 ? flowEdges.length - 1 : last].streamSinkId = 1;
  }

  /* ----- streams (only one terminal receiver in Circles paths) ----- */
  const termEdgeIds = flowEdges
    .map((e, i) => (e.streamSinkId === 1 ? i : -1))
    .filter(i => i !== -1);

  const streams: Stream[] = [{
    sourceCoordinate: idx[from],
    flowEdgeIds: termEdgeIds,
    data: '0x'
  }];

  /* ----- coordinate triplets ----- */
  const coords: number[] = [];
  transfers.forEach(t => {
    coords.push(idx[t.tokenOwner.toLowerCase()]);
    coords.push(idx[t.from.toLowerCase()]);
    coords.push(idx[t.to.toLowerCase()]);
  });

  const packedCoordinates = packCoordinates(coords);

  /* (optional) sanity check total matches value */
  const expected = BigInt(value);
  const terminalSum = flowEdges
    .filter(e => e.streamSinkId === 1)
    .reduce((s, e) => s + BigInt(e.amount.toString()), BigInt(0));
  if (terminalSum !== expected) {
    throw new Error(`terminal sum ${terminalSum} ≠ expected ${expected}`);
  }

  return {
    flowVertices,
    flowEdges,
    streams,
    packedCoordinates,
    sourceCoordinate: idx[from]
  };
}

/* ---------------------- calldata wrapper ----------------------- */

/** one ready-to-send call for Hub.operateFlowMatrix */
export function encodeOperateFlowMatrix(
  hubAddress: string,
  fm: FlowMatrix
): { to: string; data: string } {
  const iface = new ethers.Interface(OPERATE_FLOW_MATRIX_ABI);
  const data = iface.encodeFunctionData('operateFlowMatrix', [
    fm.flowVertices,
    fm.flowEdges.map(e => [e.streamSinkId, e.amount]),
    fm.streams.map(s => [s.sourceCoordinate, s.flowEdgeIds, s.data]),
    fm.packedCoordinates
  ]);
  return { to: hubAddress, data };
}

/**
 * One low-level call per wrapped token that the sender must unwrap
 * **before** the Hub path executes.
 *
 * `totals` is the *wrappedTokenTotals* map →
 *   key = wrapper address,
 *   value = [amountInDemurragedCRC, wrapperTypeString]
 */
export function buildUnwrapCalls(
  totals: Record<string, [bigint, string]>
): Call[] {
  const iface = new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI);

  return Object.entries(totals).map(([wrapperAddr, [amtDemurraged, wType]]) => {
    // Inflationary wrappers expect the *static* amount in `unwrap`.
    const needsStatic = wType === 'CrcV2_ERC20WrapperDeployed_Inflationary';
    const amtForUnwrap = needsStatic
      ? CirclesConverter.attoCirclesToAttoStaticCircles(amtDemurraged)
      : amtDemurraged; // demurraged wrapper → 1 : 1

    return {
      to: wrapperAddr,
      data: iface.encodeFunctionData('unwrap', [amtForUnwrap.toString()])
    };
  });
}


/**
 * Encode a list of sub-transactions for **Gnosis Safe MultiSend**.
 *
 * Layout (Safe v1.3):
 * | op:1 | to:20 | value:32 | dataLen:32 | data:len |
 * We always use `op = 0` (CALL) and `value = 0`.
 */
function encodeMultiSendData(calls: Call[]): string {
  const chunks: string[] = [];

  for (const { to, data } of calls) {
    const op = '0x00';                               // CALL
    const toPadded = ethers.zeroPadValue(to, 20);
    const valuePadded = ethers.zeroPadValue('0x00', 32);      // zero value
    const len = (data.length - 2) / 2;                // bytes (strip 0x)
    const lenPadded = ethers.zeroPadValue(ethers.toBeHex(len), 32);

    chunks.push(ethers.concat([op, toPadded, valuePadded, lenPadded, data]));
  }

  return ethers.concat(chunks); // big blob fed to MultiSend.multiSend()
}


/**
 * Build the call that the Safe must execute (delegateCall to MultiSend).
 */
function encodeMultiSendForSafe(calls: Call[]): Call {
  const iface = new ethers.Interface(MULTISEND_ABI);
  const txs = encodeMultiSendData(calls);
  return {
    to: MULTISEND_ADDRESS,
    data: iface.encodeFunctionData('multiSend', [txs])
  };
}

function buildPreValidatedSig(owner: string): string {
  return ethers.concat([
    ethers.zeroPadValue(owner, 32),   // r  = owner (hash-validator)
    ethers.zeroPadValue('0x', 32),    // s  = ignored
    '0x01'                            // v  = signature-type 1  ✅
  ]);
}

function buildSelfApprovalCall(hub: string, safe: string): Call {
  const iface = new ethers.Interface(HUB_APPROVAL_ABI);
  return {
    to: hub,
    data: iface.encodeFunctionData('setApprovalForAll', [safe, true])
  };
}


function ensureNonZeroAmounts(fm: FlowMatrix): void {
  fm.flowEdges.forEach((e, i) => {
    if (BigInt(e.amount.toString()) === BigInt(0)) {
      throw new Error(`Flow edge #${i} has zero amount – forbidden.`);
    }
  });
}


async function assertFlowPermittedByTrustBatch(path: PathfindingResult) {
  const hubIface = new ethers.Interface(HUB_READ_ABI);

  /* --- gather unique addresses -------------------------------------- */
  const addresses = new Set<string>();
  path.transfers.forEach(e => {
    addresses.add(e.from.toLowerCase());
    addresses.add(e.to.toLowerCase());
  });

  /* --- batch fetch advancedUsageFlags -------------------------------- */
  const flagCalls: any[] = [];
  [...addresses].forEach(addr => {
    const data = hubIface.encodeFunctionData('advancedUsageFlags', [addr]);
    flagCalls.push({
      id: flagCalls.length,
      data,
      decode: ret => hubIface.decodeFunctionResult('advancedUsageFlags', ret)[0],
      meta: addr
    });
  });
  const flagResults = await sendBatchEthCalls(flagCalls);
  const flags = new Map<string, bigint>();
  flagResults.forEach(({ meta, result }) => {
    flags.set(meta as string, BigInt(result));
  });

  const CONSENT_FLAG_MASK = BigInt(1);

  /* --- build trust queries ------------------------------------------ */
  type TrustKey = `${string}_${string}`;
  const trustQueries = new Map<TrustKey, any>();

  function addTrustQuery(a: string, b: string) {
    const key = `${a.toLowerCase()}_${b.toLowerCase()}` as TrustKey;
    if (trustQueries.has(key)) return;
    const data = hubIface.encodeFunctionData('isTrusted', [a, b]);
    trustQueries.set(key, {
      id: trustQueries.size,
      data,
      decode: ret => hubIface.decodeFunctionResult('isTrusted', ret)[0],
      meta: key
    });
  }

  path.transfers.forEach(e => {
    addTrustQuery(e.to, e.tokenOwner); // receiver trusts token owner
    if ((flags.get(e.from.toLowerCase()) ?? BigInt(0)) & CONSENT_FLAG_MASK) {
      addTrustQuery(e.from, e.to); // sender trusts receiver
    }
  });

  const trustResults = await sendBatchEthCalls([...trustQueries.values()]);
  const trustMap = new Map<TrustKey, boolean>();
  trustResults.forEach(({ meta, result }) => {
    trustMap.set(meta as TrustKey, result);
  });

  /* --- evaluate all edges ------------------------------------------- */
  for (const edge of path.transfers) {
    const recvTrustsKey = `${edge.to.toLowerCase()}_${edge.tokenOwner.toLowerCase()}` as TrustKey;
    if (!trustMap.get(recvTrustsKey)) {
      throw new Error(`Receiver ${edge.to} does not trust Circles of ${edge.tokenOwner}`);
    }

    if ((flags.get(edge.from.toLowerCase()) ?? BigInt(0)) & CONSENT_FLAG_MASK) {
      const senderTrustsKey = `${edge.from.toLowerCase()}_${edge.to.toLowerCase()}` as TrustKey;
      if (!trustMap.get(senderTrustsKey)) {
        throw new Error(`Consented‑flow: sender ${edge.from} does not trust receiver ${edge.to}`);
      }
      const receiverFlags = flags.get(edge.to.toLowerCase()) ?? BigInt(0);
      if ((receiverFlags & CONSENT_FLAG_MASK) === BigInt(0)) {
        throw new Error(`Consented‑flow: receiver ${edge.to} has not enabled consented flow`);
      }
    }
  }
}

async function sendBatchEthCalls(reqs: any[]) {
  const payload = reqs.map(rq => ({
    jsonrpc: '2.0',
    id: rq.id,
    method: 'eth_call',
    params: [
      { to: HUB_ADDRESS, data: rq.data },
      'latest'
    ]
  }));

  const res = await fetch(circlesRpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function assertRegistrationBatch(path: PathfindingResult) {
  const iface = new ethers.Interface(HUB_READ_ABI);

  // collect every sender, receiver and token-owner the matrix will touch
  const avatars = new Set<string>();
  path.transfers.forEach(edge => {
    avatars.add(edge.from.toLowerCase());
    avatars.add(edge.to.toLowerCase());
    avatars.add(edge.tokenOwner.toLowerCase());
  });

  // build *one* batch of hub.avatars(address) look-ups
  const calls: any[] = [];
  avatars.forEach(addr => {
    calls.push({
      id: calls.length,
      data: iface.encodeFunctionData('avatars', [addr]),
      decode: res => iface.decodeFunctionResult('avatars', res)[0],
      meta: addr
    });
  });

  const results = await sendBatchEthCalls(calls);

  // fail fast if any avatar is not registered
  for (const { meta: addr, result } of results) {
    if (result === ethers.ZeroAddress) {
      throw new Error(`Avatar ${addr} is not registered in Hub`);
    }
  }
}

async function assertAllVerticesRegistered(vertices: string[]) {
  const iface = new ethers.Interface(HUB_READ_ABI);
  const batch = vertices.map((v, i) => ({
    id: i,
    data: iface.encodeFunctionData('avatars', [v]),
    decode: r => iface.decodeFunctionResult('avatars', r)[0],
    meta: v
  }));
  const res = await sendBatchEthCalls(batch);
  const bad = res.find(r => r.result === ethers.ZeroAddress);
  if (bad) throw new Error(`vertex ${bad.meta} is not a registered avatar`);
}

function assertVerticesStrictlyAscending(v: string[]) {
  for (let i = 0; i < v.length - 1; i++) {
    if (BigInt(v[i]) >= BigInt(v[i + 1])) {
      throw new Error('flowVertices must be in strictly ascending order');
    }
  }
}

/**
 * Return the unique source (only “sender never receiver”)
 * and sink (only “receiver never sender”) addresses of a path.
 * Re-computing these here avoids relying on any earlier state.
 */
function getSourceAndSink(path: PathfindingResult): { source: string; sink: string } {
  const senders = new Set(path.transfers.map(t => t.from.toLowerCase()));
  const receivers = new Set(path.transfers.map(t => t.to.toLowerCase()));

  const source = [...senders].find(a => !receivers.has(a));
  const sink = [...receivers].find(a => !senders.has(a));

  if (!source || !sink) throw new Error('could not determine unique source / sink');
  return { source, sink };
}

/**
 * Build a “net flow” map ⟶ address → Σ(in)-Σ(out)  (signed bigint).
 */
function computeNettedFlow(path: PathfindingResult): Map<string, bigint> {
  const net = new Map<string, bigint>();

  path.transfers.forEach(({ from, to, value }) => {
    const v = BigInt(value);
    net.set(from.toLowerCase(), (net.get(from.toLowerCase()) ?? BigInt(0)) - v); // outflow → negative
    net.set(to.toLowerCase(), (net.get(to.toLowerCase()) ?? BigInt(0)) + v); // inflow  → positive
  });

  return net;
}

/**
 * Throw if **any** intermediate vertex is unbalanced **or**
 * if source/sink have the wrong sign.
 */
function assertNoNettedFlowMismatch(path: PathfindingResult): void {
  const { source, sink } = getSourceAndSink(path);
  const net = computeNettedFlow(path);

  net.forEach((balance, addr) => {
    if (addr === source) {
      if (balance >= BigInt(0)) throw new Error(`source ${addr} should be net negative, got ${balance}`);
    } else if (addr === sink) {
      if (balance <= BigInt(0)) throw new Error(`sink ${addr} should be net positive, got ${balance}`);
    } else {
      if (balance !== BigInt(0)) throw new Error(`vertex ${addr} is unbalanced: ${balance}`);
    }
  });
}


function replaceWrappedTokens(
  path: PathfindingResult,
  unwrapped: Record<string, [bigint, string]>
): PathfindingResult {
  const rewritten = path.transfers.map((edge, i) => {
    const wrap = unwrapped[edge.tokenOwner.toLowerCase()];
    return wrap
      ? { ...edge, tokenOwner: wrap[1] } // swap owner
      : edge;                            // leave untouched
  });

  return { ...path, transfers: rewritten };
}

/**
 * Scale every transfer’s `value` by `SHRINK_DIV`.
 * – keeps original edge order (stable unit-tests)
 * – uses only BigInt arithmetic (ES2019-safe)
 * – drops edges that would shrink to 0
 */
function shrinkPathValues(
  path: PathfindingResult,
  retainBps: bigint = BigInt(999_999_999_999)
): PathfindingResult {
  type Edge = TransferStep & { _i: number };

  const scaled: Edge[] = [];
  const sinkIncome = new Map<string, bigint>();

  const DENOMINATOR = BigInt(1_000_000_000_000);

  /* ---- shrink every edge ------------------------------------- */
  path.transfers.forEach((e, idx) => {
    const scaledVal = (BigInt(e.value) * retainBps) / DENOMINATOR;
    if (scaledVal === BigInt(0)) return;          // prune sub-unit flows

    scaled.push({ ...e, value: scaledVal.toString(), _i: idx });
    sinkIncome.set(e.to, (sinkIncome.get(e.to) ?? BigInt(0)) + scaledVal);
  });

  /* ---- figure out the unique sink & its flow ----------------- */
  const fromSet = new Set(scaled.map(e => e.from.toLowerCase()));
  const sink = scaled.find(e => !fromSet.has(e.to.toLowerCase()))?.to;
  const maxFlow = sink ? sinkIncome.get(sink.toLowerCase()) ?? BigInt(0) : BigInt(0);

  /* ---- final result ------------------------------------------ */
  scaled.sort((a, b) => a._i - b._i);       // preserve path order
  return {
    maxFlow: maxFlow.toString(),
    transfers: scaled.map(({ _i, ...edge }) => edge)
  };
}