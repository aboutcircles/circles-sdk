import {
  assertNoNettedFlowMismatch,
  createFlowMatrix,
  findPath,
  FlowMatrix,
  getExpectedUnwrappedTokenTotals,
  getTokenInfoMapFromPath,
  getWrappedTokenTotalsFromPath,
  replaceWrappedTokens,
  shrinkPathValues
} from '@circles-sdk/pathfinder';
import { ethers } from 'ethers';
import { Address, CirclesConverter } from '@circles-sdk/utils';
import { assertAllVerticesRegistered, assertVerticesStrictlyAscending } from './hub';
import { CirclesData, CirclesRpc } from '@circles-sdk/data';

const circlesRpcUrl = 'https://rpc.circlesubi.network';
const provider = new ethers.JsonRpcProvider(circlesRpcUrl);

const HUB_ADDRESS = '0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8';

const SOURCE_SAFE_ADDRESS = '0xDE374ece6fA50e781E81Aac78e811b33D16912c7'.toLowerCase();
const SAFE_OWNER = '0xD68193591d47740E51dFBc410da607A351b56586'.toLowerCase();
const SINK_ADDRESS = '0xbcaaab068caf7da7764fa280590d5f5b2fc75d73'.toLowerCase();
const AMOUNT = '999999999999999999999999999999999';
const WITH_WRAP = true;

export const WRAPPER_ERC20_TOKEN_ABI = [
  'function unwrap(uint256 _amount)'
];

export const MULTISEND_ABI = [
  'function multiSend(bytes transactions)'
];

export const SAFE_ABI = [
  'function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)'
];

export const HUB_ABI = [
  'function operateFlowMatrix(address[] _flowVertices,(uint16,uint192)[] _flow,(uint16,uint16[],bytes)[] _streams,bytes _packed)',
  'function setApprovalForAll(address operator, bool approved)',
  'function wrap(address _avatar, uint256 _amount, uint8 _type)'
];

export const MULTISEND_ADDRESS = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

type Call = {
  to: string;
  data: string;
};

async function getStaticWrappedTokenTotalsFromSender(rpcUrl: string, senderAddress: string): Promise<{
  tokenAddress: string;
  tokenOwner: string;
  tokenType: string;
  staticAttoCircles: string;
  attoCircles: string;
}[]> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'jsonrpc': '2.0',
      'id': 1,
      'method': 'circles_getBalanceBreakdown',
      'params': [senderAddress]
    })
  });

  const resJson = await res.json();
  if (!resJson.result) {
    throw new Error(`Failed to fetch wrapped token totals: ${JSON.stringify(resJson.error)}`);
  }

  const result: {
    tokenAddress: string;
    tokenOwner: string;
    tokenType: string;
    staticAttoCircles: string;
    attoCircles: string;
  }[] = resJson.result;

  return result.filter(o => o.tokenType == 'CrcV2_ERC20WrapperDeployed_Inflationary');
}

/**
 * Pretty-print Safe sub-calls so humans can double-check what happens.
 * Now also stringifies BigInt / BigNumber args so wrap/unwrap amounts show up.
 */
function logSubCallsTable(
  title: string,
  calls: Call[],
  ifaceMap: Record<string, ethers.Interface>,
  maxArgs = 4
): void {
  const rows = calls.map((call, idx) => {
    const iface = ifaceMap[call.to.toLowerCase()];
    let sig = 'unknown';
    let argsPreview = '—';

    if (iface) {
      try {
        const parsed = iface.parseTransaction({ data: call.data });
        sig = parsed.signature;

        // normalise args so JSON.stringify won’t choke on BigInt / BigNumber
        const prettyArgs = parsed.args.slice(0, maxArgs).map((a: any) => {
          if (typeof a === 'bigint') {
            return a.toString() + 'n';
          }
          return a;
        });
        argsPreview = JSON.stringify(prettyArgs);
      } catch {
        /* keep defaults */
      }
    }

    return { '#': idx, to: call.to, sig, args: argsPreview };
  });

  // eslint-disable-next-line no-console
  console.log('\n' + title);
  // eslint-disable-next-line no-console
  console.table(rows);
}

describe('transfer wrapped tokens along a path', () => {

  it('should send exactly the amount that was requested even if static tokens are involved', async () => {
    /*
      1) Ask the pathfinder for a transfer path.

      2) Collect all wrapped-token edges that originate at the **sender**:
         a) static wrappers (type = CrcV2_ERC20WrapperDeployed_Inflationary)
         b) demurraged wrappers (type = CrcV2_ERC20WrapperDeployed_Demurraged)

      3) For every *static* wrapper found in 2 a), fetch the sender’s **entire**
         static balance (in atto-static circles).

      4) Build `unwrap()` calls
           – static wrappers: unwrap *full* balance
           – demurraged wrappers: unwrap **exact** amount needed by the path
         → after this step the Safe holds plain atto-Circles for every wrapper
           token that will be moved.

      5) Rewrite the path so that each wrapped edge now references the real
         token owner (`tokenOwner = underlying ERC-1155 ID`), and
         – keep a running total of how many demurraged units of every static
           wrapper will actually be spent.

      6) For each static wrapper:
           remaining = (unwrapped total) − (spent in step 5)
         Add a `Hub.wrap(realOwner, remaining, 1)` call so the leftover
         Circles are re-wrapped to static ERC-20 after the transfer.
         (Demurraged wrappers have no leftovers by design.)

      7) Build the `FlowMatrix` from the rewritten transfers.

      8) Assemble the Safe MultiSend in *strict* order
           self-approval → all unwraps → operateFlowMatrix → all re-wraps

      9) Ask the Safe for a gas estimate; abort if it returns 0.
    */

    const excludeFromTokens = await getDefaultTokenExcludeList(circlesRpcUrl, SOURCE_SAFE_ADDRESS as Address);

    const transferPath = await findPath(circlesRpcUrl, {
      from: SOURCE_SAFE_ADDRESS as Address,
      to: SINK_ADDRESS as Address,
      targetFlow: AMOUNT,
      useWrappedBalances: true,
      excludeFromTokens: excludeFromTokens
    });

    let logString = ``;
    const wrapCalls: Call[] = [];
    const unwrapCalls: Call[] = [];

    try {
      assertNoNettedFlowMismatch(transferPath);

      // Get the token info for all tokens in the path
      const tokenInfoMap = await getTokenInfoMapFromPath(circlesRpcUrl, transferPath);
      logString += `The path contains ${transferPath.transfers.length} transfers with a total flow of (demurraged: ${transferPath.maxFlow}) over ${tokenInfoMap.size} different token owners.\n`;

      // Find all wrapped edges (can only originate from the sender)
      const allWrappedEdges = transferPath.transfers
        .filter(o => o.from == SOURCE_SAFE_ADDRESS)
        .filter(o => !!tokenInfoMap.get(o.tokenOwner.toLowerCase())?.type.startsWith('CrcV2_ERC20WrapperDeployed'));

      logString += `The path contains ${allWrappedEdges.length} wrapped edges originating from the sender.\n`;

      // Filter the static edges
      const wrappedStaticEdges = allWrappedEdges.filter(o => tokenInfoMap.get(o.tokenOwner.toLowerCase())?.type === 'CrcV2_ERC20WrapperDeployed_Inflationary');
      const wrapedStaticEdgeTotalsByToken: Record<string, bigint> = {};
      logString += `  - Of which ${wrappedStaticEdges.length} use static wrapped tokens:\n`;
      wrappedStaticEdges.forEach(o => {
        logString += `    - ${o.tokenOwner} (demurraged: ${o.value})\n`;
        if (!wrapedStaticEdgeTotalsByToken[o.tokenOwner]) {
          wrapedStaticEdgeTotalsByToken[o.tokenOwner] = BigInt(0);
        }
        wrapedStaticEdgeTotalsByToken[o.tokenOwner] += BigInt(o.value);
      });

      logString += `    - Total static wrapped tokens values:\n`;
      Object.entries(wrapedStaticEdgeTotalsByToken).forEach(([token, total]) => {
        logString += `      - ${token}: (demurraged: ${total})\n`;
      });

      // Filter the demurraged edges
      const wrappedDemurragedEdges = allWrappedEdges.filter(o => tokenInfoMap.get(o.tokenOwner.toLowerCase())?.type === 'CrcV2_ERC20WrapperDeployed_Demurraged');
      const wrappedDemurragedEdgeTotalsByToken: Record<string, bigint> = {};
      logString += `  - Of which ${wrappedDemurragedEdges.length} use demurraged wrapped tokens:\n`;
      wrappedDemurragedEdges.forEach(o => {
        logString += `    - ${o.tokenOwner} (demurraged: ${o.value})\n`;
        if (!wrappedDemurragedEdgeTotalsByToken[o.tokenOwner]) {
          wrappedDemurragedEdgeTotalsByToken[o.tokenOwner] = BigInt(0);
        }
        wrappedDemurragedEdgeTotalsByToken[o.tokenOwner] += BigInt(o.value);
      });

      logString += `    - Total demurraged wrapped tokens values:\n`;
      Object.entries(wrappedDemurragedEdgeTotalsByToken).forEach(([token, total]) => {
        logString += `      - ${token}: (demurraged: ${total})\n`;
      });

      logString += `\n`;

      // Unwrap all used static wrapped tokens fully
      const usedStaticTokenCount = Object.keys(wrapedStaticEdgeTotalsByToken).length;
      const wrappedStaticBalanceByTokenInStaticUnits: Record<string, bigint> = {};
      if (usedStaticTokenCount > 0) {
        logString += `The path uses ${usedStaticTokenCount} different static tokens which must be unwrapped completely before they can be used in a flow matrix transfer.\n`;
        logString += `  Getting all balances of the sender for static wrapped tokens...\n`;

        const senderWrappedStaticTotals = await getStaticWrappedTokenTotalsFromSender(circlesRpcUrl, SOURCE_SAFE_ADDRESS);
        logString += `  The sender's total static wrapped token holdings are:\n`;

        const relevantWrappedStaticBalances = senderWrappedStaticTotals.filter(o => !!wrapedStaticEdgeTotalsByToken[o.tokenAddress]);
        relevantWrappedStaticBalances.forEach(o => {
          const staticBalance = BigInt(o.staticAttoCircles);
          const demurragedBalance = CirclesConverter.attoStaticCirclesToAttoCircles(staticBalance);
          logString += `    - ${o.tokenAddress} (static: ${staticBalance}, demurraged: ${demurragedBalance})\n`;
          logString += `      > Unwrapping full amount of static wrapped token: ${o.tokenAddress} (static: ${staticBalance}).\n`;
          logString += `        Available after unwrap: (demurraged: ${demurragedBalance})\n`;

          wrappedStaticBalanceByTokenInStaticUnits[o.tokenAddress] = staticBalance;

          unwrapCalls.push({
            to: o.tokenAddress,
            data: new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI).encodeFunctionData('unwrap', [BigInt(o.staticAttoCircles)])
          });
        });
      }

      // Unwrap all used demurraged wrapped tokens exactly
      const usedDemurragedTokenCount = Object.keys(wrappedDemurragedEdgeTotalsByToken).length;
      if (usedDemurragedTokenCount > 0) {
        logString += `The path uses ${usedDemurragedTokenCount} different demurraged tokens which must be unwrapped exactly before they can be used in a flow matrix transfer.\n`;
        Object.entries(wrappedDemurragedEdgeTotalsByToken).forEach(([wrapperAddr, total]) => {
          logString += `  > Unwrapping precise amount of demurraaged wrapped token: ${wrapperAddr} (demurraged: ${total})\n`;

          unwrapCalls.push({
            to: wrapperAddr,
            data: new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI).encodeFunctionData('unwrap', [total])
          });
        });
      }

      // From this point on, we have enough (unwrapped, demurraged) tokens of each kind to
      // facilitate the transfer. However, the returned path still contains the wrapped token
      // addresses as "tokenOwner". We need to look up the real token owner and replace it
      // in the path (we create a copy).
      logString += `\n`;
      logString += `Replacing wrapped token owners in the path with their real token owners...\n`;

      const unwrappedStaticTokensUsedInDemurragedUnits: Record<string, bigint> = {};

      const unwrappedTransfers = transferPath.transfers.map(o => {
        const tokenInfo = tokenInfoMap.get(o.tokenOwner.toLowerCase());
        if (tokenInfo && tokenInfo.type.startsWith('CrcV2_ERC20WrapperDeployed')) {
          logString += ` - Replacing wrapped token owner in transfer (from: ${o.from}, to: ${o.to}, tokenOwner: ${o.tokenOwner}) with real token owner: ${tokenInfo.tokenOwner}\n`;

          // Use the opportunity to also do some bookkeeping about how many demurraged tokens
          // from the unwrapped static tokens have been used so far. We need this to later know
          // how many demurraged tokens we have left to wrap them again.
          if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
            if (!unwrappedStaticTokensUsedInDemurragedUnits[tokenInfo.token]) {
              unwrappedStaticTokensUsedInDemurragedUnits[tokenInfo.token] = BigInt(0);
            }
            unwrappedStaticTokensUsedInDemurragedUnits[tokenInfo.token] += BigInt(o.value);

            const demurragedEdgeValue = BigInt(o.value);
            const staticBalance = wrappedStaticBalanceByTokenInStaticUnits[o.tokenOwner];
            const demurragedBalance = CirclesConverter.attoStaticCirclesToAttoCircles(staticBalance);
            const percentage = (demurragedEdgeValue * BigInt(100)) / demurragedBalance;
            logString += `   > Using ${percentage} % (demurraged: ${o.value}) of (static: ${staticBalance}, demurraged: ${demurragedBalance}) total static wrapped token ${tokenInfo.tokenOwner} balance\n`;
          }

          return {
            ...o,
            tokenOwner: tokenInfo.tokenOwner
          };
        }
        return o;
      });

      logString += `  Total used unwrapped static token capacity:\n`;
      Object.entries(unwrappedStaticTokensUsedInDemurragedUnits).forEach(([token, totalUsedDemurraged]) => {
        const totalStaticTokenBalance = wrappedStaticBalanceByTokenInStaticUnits[token];
        const totalDemurragedTokenBalance = CirclesConverter.attoStaticCirclesToAttoCircles(totalStaticTokenBalance);
        const percentage = (totalUsedDemurraged * BigInt(100)) / CirclesConverter.attoStaticCirclesToAttoCircles(totalStaticTokenBalance);
        logString += `  - ${token}: ${percentage}% of (static: ${totalStaticTokenBalance}, demurraged: ${totalUsedDemurraged})\n`;

        const remainingDemurragedBalance = totalDemurragedTokenBalance - totalUsedDemurraged;
        const remainingStaticBalance = CirclesConverter.attoCirclesToAttoStaticCircles(remainingDemurragedBalance);
        logString += `    > Remaining static token balance to wrap again: (static: ${remainingStaticBalance}, demurraged: ${remainingDemurragedBalance})\n`;

        // Add the wrap call for the remaining static balance
        const realTokenOwner = tokenInfoMap.get(token.toLowerCase())?.tokenOwner;
        wrapCalls.push({
          to: HUB_ADDRESS,
          data: new ethers.Interface(HUB_ABI).encodeFunctionData('wrap', [
            realTokenOwner,
            remainingDemurragedBalance,
            BigInt(1)
          ])
        });
      });

      logString += `\n`;

      // Finally, we can create the flow matrix with the unwrapped transfers
      const fm: FlowMatrix = createFlowMatrix(
        SOURCE_SAFE_ADDRESS as Address,
        SINK_ADDRESS as Address,
        transferPath.maxFlow,
        unwrappedTransfers
      );

      logString += `Flow matrix created with ${fm.flowVertices.length} vertices and ${fm.flowEdges.length} edges.\n`;

      await assertAllVerticesRegistered(circlesRpcUrl, HUB_ADDRESS, fm.flowVertices);
      await assertVerticesStrictlyAscending(fm.flowVertices);

      // Create the operateFlowMatrix call
      const hubCall = encodeOperateFlowMatrix(HUB_ADDRESS, fm);

      // Prepare the Safe multi-send call
      const subCalls: Call[] = [
        buildSelfApprovalCall(HUB_ADDRESS, SOURCE_SAFE_ADDRESS),
        ...unwrapCalls,
        hubCall,
        ...wrapCalls
      ];

      const ifaceMap: Record<string, ethers.Interface> = {
        [HUB_ADDRESS.toLowerCase()]: new ethers.Interface(HUB_ABI),
        [MULTISEND_ADDRESS.toLowerCase()]: new ethers.Interface(MULTISEND_ABI),
        // wrappers – they all share the same ABI
        ...Object.fromEntries(
          [...unwrapCalls].map(c => [c.to.toLowerCase(), new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI)])
        ),
        ...Object.fromEntries(
          [...wrapCalls].map(c => [c.to.toLowerCase(), new ethers.Interface(HUB_ABI)])
        )
      };

      logSubCallsTable('Planned sub-calls', subCalls, ifaceMap);

      // TODO: Log the calls to a console.table (in nice detail but not overwhelming, nicely human readable decoded)
      const multiSendCall = encodeMultiSendForSafe(subCalls);

      logString += `MultiSend call prepared with ${subCalls.length} sub-calls.\n`;

      // Estimate the gas for the Safe execution
      const safeIface = new ethers.Interface(SAFE_ABI);
      const safeCalldata = safeIface.encodeFunctionData('execTransaction', [
        multiSendCall.to,
        0,
        multiSendCall.data,
        1,          // DELEGATECALL
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
      logString += `Estimated gas for Safe execution: ${gas.toString()}\n`;
      if (gas === BigInt(0)) {
        throw new Error('Gas estimation returned 0 – path likely too long for a single block.');
      }

    } finally {
      console.log(logString);
    }
  });

  it('should also work when sender == receiver', async () => {
    const excludeFromTokens = await getDefaultTokenExcludeList(circlesRpcUrl, SOURCE_SAFE_ADDRESS as Address);

    const transferPath = await findPath(circlesRpcUrl, {
      from: SOURCE_SAFE_ADDRESS as Address,
      to: SOURCE_SAFE_ADDRESS as Address,
      targetFlow: AMOUNT,
      useWrappedBalances: WITH_WRAP,
      excludeFromTokens: excludeFromTokens,
      toTokens: [SOURCE_SAFE_ADDRESS as Address]
    });

    assertNoNettedFlowMismatch(transferPath, SOURCE_SAFE_ADDRESS, SOURCE_SAFE_ADDRESS);

    const tokenInfoMap = await getTokenInfoMapFromPath(circlesRpcUrl, transferPath);
    const wrappedTotals = getWrappedTokenTotalsFromPath(transferPath, tokenInfoMap);
    const unwrappedTotals = getExpectedUnwrappedTokenTotals(wrappedTotals, tokenInfoMap);
    const pathUnwrapped = replaceWrappedTokens(transferPath, unwrappedTotals);
    console.log(`Path pre-replacement:`, transferPath);
    console.log(`Path post-replacement:`, pathUnwrapped);

    const hasInflationaryWrapper = Object.values(wrappedTotals).some(o => o[1] === 'CrcV2_ERC20WrapperDeployed_Inflationary');
    const shrunkPath = hasInflationaryWrapper
      ? shrinkPathValues(pathUnwrapped, SOURCE_SAFE_ADDRESS) // sledgehammer-shrink all values in the path by 0.0000...1%
      : pathUnwrapped;

    console.log(`Path post-shrinking:`, shrunkPath);
    assertNoNettedFlowMismatch(shrunkPath, SOURCE_SAFE_ADDRESS, SOURCE_SAFE_ADDRESS);

    const fm = createFlowMatrix(
      SOURCE_SAFE_ADDRESS as Address,
      SOURCE_SAFE_ADDRESS as Address,
      shrunkPath.maxFlow,
      shrunkPath.transfers
    );

    await assertAllVerticesRegistered(circlesRpcUrl, HUB_ADDRESS, fm.flowVertices);
    await assertVerticesStrictlyAscending(fm.flowVertices);
    console.log(`Total flow before shrinking: ${transferPath.maxFlow}`);
    console.log(`Total flow after shrinking: ${shrunkPath.maxFlow}`);
    const hubCall: Call = encodeOperateFlowMatrix(HUB_ADDRESS, fm);
    const subCalls: Call[] = [
      buildSelfApprovalCall(HUB_ADDRESS, SOURCE_SAFE_ADDRESS),
      ...buildUnwrapCalls(wrappedTotals),
      hubCall
    ];
    const multiSendCall = encodeMultiSendForSafe(subCalls);
    const safeIface = new ethers.Interface(SAFE_ABI);
    const safeCalldata = safeIface.encodeFunctionData('execTransaction', [
      multiSendCall.to,
      0,
      multiSendCall.data,
      1,          // DELEGATECALL
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
    console.log('Gas:', gas.toString());
    if (gas === BigInt(0)) {
      throw new Error('Gas estimation returned 0 – path likely too long for a single block.');
    }
    expect(gas).toBeGreaterThan(0);
  });

  it(
    'should return an executable path with wrapped tokens',
    async () => {

      const excludeFromTokens = await getDefaultTokenExcludeList(circlesRpcUrl, SINK_ADDRESS as Address);

      /* 1. call pathfinder -------------------------------------------------- */
      const transferPath = await findPath(circlesRpcUrl, {
        from: SOURCE_SAFE_ADDRESS as Address,
        to: SINK_ADDRESS as Address,
        targetFlow: AMOUNT,
        useWrappedBalances: WITH_WRAP,
        excludeFromTokens: excludeFromTokens
      });

      /* 2. original-path sanity checks ------------------------------------- */
      assertNoNettedFlowMismatch(transferPath);

      /* 3. unwrap bookkeeping --------------------------------------------- */
      const tokenInfoMap = await getTokenInfoMapFromPath(circlesRpcUrl, transferPath);
      const wrappedTotals = getWrappedTokenTotalsFromPath(transferPath, tokenInfoMap);
      const unwrappedTotals = getExpectedUnwrappedTokenTotals(wrappedTotals, tokenInfoMap);

      /* 4. rewrite path -> all ERC-20 wrappers replaced by their avatars --- */
      const pathUnwrapped = replaceWrappedTokens(transferPath, unwrappedTotals);

      console.log(`Path pre-replacement:`, transferPath);
      console.log(`Path post-replacement:`, pathUnwrapped);

      const hasInflationaryWrapper = Object.values(wrappedTotals).some(o => o[1] === 'CrcV2_ERC20WrapperDeployed_Inflationary');
      const shrunkPath = hasInflationaryWrapper
        ? shrinkPathValues(pathUnwrapped, SINK_ADDRESS) // sledgehammer-shrink all values in the path by 0.0000...1%
        : pathUnwrapped;

      console.log(`Path post-shrinking:`, shrunkPath);

      /* 5. flow-conservation still holds after shrinking ------------------ */
      assertNoNettedFlowMismatch(shrunkPath);

      /* 6. produce flow-matrix + Hub calldata ----------------------------- */
      const fm = createFlowMatrix(
        SOURCE_SAFE_ADDRESS as Address,
        SINK_ADDRESS as Address,
        shrunkPath.maxFlow,
        shrunkPath.transfers
      );

      await assertAllVerticesRegistered(circlesRpcUrl, HUB_ADDRESS, fm.flowVertices);
      await assertVerticesStrictlyAscending(fm.flowVertices);

      // Log the total flow before shrinking
      console.log(`Total flow before shrinking: ${transferPath.maxFlow}`);

      // Log the total flow after shrinking
      console.log(`Total flow after shrinking: ${shrunkPath.maxFlow}`);

      const hubCall: Call = encodeOperateFlowMatrix(HUB_ADDRESS, fm);

      /* 7. prepare Safe multi-tx ------------------------------------------ */
      const subCalls: Call[] = [
        buildSelfApprovalCall(HUB_ADDRESS, SOURCE_SAFE_ADDRESS),
        ...buildUnwrapCalls(wrappedTotals),
        hubCall
      ];
      const multiSendCall = encodeMultiSendForSafe(subCalls);

      /* 8. estimate Safe gas ---------------------------------------------- */
      const safeIface = new ethers.Interface(SAFE_ABI);
      const safeCalldata = safeIface.encodeFunctionData('execTransaction', [
        multiSendCall.to,
        0,
        multiSendCall.data,
        1,          // DELEGATECALL
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

      console.log('Gas:', gas.toString());

      if (gas === BigInt(0)) {
        throw new Error('Gas estimation returned 0 – path likely too long for a single block.');
      }
      expect(gas).toBeGreaterThan(0);
    },
    60_000   // 1-minute timeout – pathfinder + RPC batches can be slow
  );
});

/**
 * Checks if the `to` address is a group minter and excludes the group tokens from the transfer
 * if that's the case.
 * @param circlesRpcUrl The Circles RPC URL
 * @param to The receiver of the transfer
 * @param excludeFromTokens The existing list of tokens to exclude from the transfer
 * @returns The complete list of tokens to exclude from the transfer
 */
async function getDefaultTokenExcludeList(circlesRpcUrl: string, to: Address, excludeFromTokens?: Address[]): Promise<Address[] | undefined> {
  const circlesData = new CirclesData(new CirclesRpc(circlesRpcUrl));
  const groupInfoByMintHandler = circlesData.findGroups(1, {
    mintHandlerEquals: to
  });

  const groupInfo = await groupInfoByMintHandler.getSingleRow();
  const completeExcludeFromTokenList = new Set<string>();
  if (groupInfo) {
    completeExcludeFromTokenList.add(groupInfo.group);
    if (groupInfo.erc20WrapperDemurraged) {
      completeExcludeFromTokenList.add(groupInfo.erc20WrapperDemurraged);
    }
    if (groupInfo.erc20WrapperStatic) {
      completeExcludeFromTokenList.add(groupInfo.erc20WrapperStatic);
    }
  }

  excludeFromTokens?.forEach(completeExcludeFromTokenList.add);

  if (completeExcludeFromTokenList.size == 0)
    return undefined;

  return <Address[]>Array.from(completeExcludeFromTokenList);
}

/**
 * Build one unwrap() call per wrapped token that the sender must execute
 * before the path runs. Works for both inflationary and demurraged wrappers.
 */
function buildUnwrapCalls(
  totals: Record<string, [bigint, string]>
): Call[] {
  const iface = new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI);

  return Object.entries(totals).map(([wrapperAddr, [amtDemurraged, wrapperType]]) => {
    const needsStaticAmount = wrapperType === 'CrcV2_ERC20WrapperDeployed_Inflationary';

    const amountForUnwrap = needsStaticAmount
      ? CirclesConverter.attoCirclesToAttoStaticCircles(amtDemurraged)
      : amtDemurraged; // 1:1 for demurraged wrappers

    return {
      to: wrapperAddr,
      data: iface.encodeFunctionData('unwrap', [amountForUnwrap.toString()])
    };
  });
}

function buildSelfApprovalCall(hub: string, safe: string): Call {
  const iface = new ethers.Interface(HUB_ABI);
  return {
    to: hub,
    data: iface.encodeFunctionData('setApprovalForAll', [safe, true])
  };
}

function encodeMultiSendForSafe(calls: Call[]): Call {
  const iface = new ethers.Interface(MULTISEND_ABI);
  const txBlob = encodeMultiSendData(calls);
  return {
    to: MULTISEND_ADDRESS,
    data: iface.encodeFunctionData('multiSend', [txBlob])
  };
}

function buildPreValidatedSig(owner: string): string {
  const r = ethers.zeroPadValue(owner, 32);
  const s = ethers.zeroPadValue('0x', 32);
  const v = '0x01';

  return ethers.concat([r, s, v]);
}

/**
 * Safe MultiSend encoding helpers
 */
function encodeMultiSendData(calls: Call[]): string {
  const chunks: string[] = [];

  calls.forEach(({ to, data }) => {
    const operationCall = '0x00'; // CALL
    const toPadded = ethers.zeroPadValue(to, 20);
    const valuePadded = ethers.zeroPadValue('0x00', 32);
    const dataLength = (data.length - 2) / 2; // bytes, strip 0x
    const dataLenPadded = ethers.zeroPadValue(ethers.toBeHex(dataLength), 32);

    chunks.push(ethers.concat([operationCall, toPadded, valuePadded, dataLenPadded, data]));
  });

  return ethers.concat(chunks);
}


/**
 * Encode Hub.operateFlowMatrix calldata for on‑chain execution.
 */
function encodeOperateFlowMatrix(
  hubAddress: string,
  fm: FlowMatrix
): Call {
  const iface = new ethers.Interface(HUB_ABI);
  const data = iface.encodeFunctionData('operateFlowMatrix', [
    fm.flowVertices,
    fm.flowEdges.map((e) => [e.streamSinkId, e.amount]),
    fm.streams.map((s) => [s.sourceCoordinate, s.flowEdgeIds, s.data]),
    fm.packedCoordinates
  ]);
  return { to: hubAddress, data };
}