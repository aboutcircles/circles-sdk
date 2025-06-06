import {
  getTokenInfoMapFromPath,
  getWrappedTokenTotalsFromPath,
  getExpectedUnwrappedTokenTotals,
  replaceWrappedTokens,
  shrinkPathValues,
  createFlowMatrix,
  findPath,
  FlowMatrix, assertNoNettedFlowMismatch
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
const SINK_ADDRESS = '0x626389c375befb331333f2cb9ef79fb2218a0176'.toLowerCase();
const AMOUNT = '3189691759996810308240';
const WITH_WRAP = true;

export const WRAPPER_ERC20_TOKEN_ABI = [
  'function unwrap(uint256 _amount)'
];

export const HUB_APPROVAL_ABI = [
  'function setApprovalForAll(address operator, bool approved)'
];

export const MULTISEND_ABI = [
  'function multiSend(bytes transactions)'
];

export const SAFE_ABI = [
  'function execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)'
];

export const OPERATE_FLOW_MATRIX_ABI = [
  'function operateFlowMatrix(address[] _flowVertices,(uint16,uint192)[] _flow,(uint16,uint16[],bytes)[] _streams,bytes _packed)'
];

export const MULTISEND_ADDRESS = '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761';

type Call = {
  to: string;
  data: string;
};

describe('transfer wrapped tokens along a path', () => {
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
  const iface = new ethers.Interface(HUB_APPROVAL_ABI);
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
  const iface = new ethers.Interface(OPERATE_FLOW_MATRIX_ABI);
  const data = iface.encodeFunctionData('operateFlowMatrix', [
    fm.flowVertices,
    fm.flowEdges.map((e) => [e.streamSinkId, e.amount]),
    fm.streams.map((s) => [s.sourceCoordinate, s.flowEdgeIds, s.data]),
    fm.packedCoordinates
  ]);
  return { to: hubAddress, data };
}