import { AvatarInterfaceV2 } from '../AvatarInterface';
import {
  AbiCoder,
  ContractRunner,
  ContractTransaction,
  ContractTransactionReceipt,
  ethers,
  formatEther,
  keccak256,
  toUtf8Bytes,
  TransactionReceipt,
  ZeroAddress
} from 'ethers';
import { Sdk } from '../sdk';
import {
  AvatarRow,
  CirclesQuery,
  TokenBalanceRow,
  TransactionHistoryRow,
  TrustRelationRow
} from '@circles-sdk/data';
import { Address, addressToUInt256, cidV0ToUint8Array, CirclesConverter } from '@circles-sdk/utils';
import { Profile } from '@circles-sdk/profiles';
import { TokenType } from '@circles-sdk/data/dist/rows/tokenInfoRow';
import { BatchRun, TransactionRequest, TransactionResponse } from '@circles-sdk/adapter';
import { BaseGroup__factory } from '@circles-sdk/abi-v2';
import {
  createFlowMatrix,
  findMaxFlow,
  findPath,
  FindPathParams,
  FlowMatrix,
  getTokenInfoMapFromPath
} from '@circles-sdk/pathfinder';

export const OPERATE_FLOW_MATRIX_ABI = [
  'function operateFlowMatrix(address[] _flowVertices,(uint16,uint192)[] _flow,(uint16,uint16[],bytes)[] _streams,bytes _packed)'
];

export class V2Avatar implements AvatarInterfaceV2 {
  public readonly sdk: Sdk;

  get address(): Address {
    return this.avatarInfo.avatar;
  }

  public readonly avatarInfo: AvatarRow;

  private _cachedProfile: Profile | undefined;
  private _cachedProfileCid: string | undefined;

  public readonly METADATATYPE_GROUPREDEEM = keccak256(toUtf8Bytes('CIRCLESv2:RESERVED_DATA:CirclesGroupRedeem'));

  constructor(sdk: Sdk, avatarInfo: AvatarRow) {
    this.sdk = sdk;
    this.avatarInfo = avatarInfo;

    if (this.avatarInfo.version != 2) {
      throw new Error('Avatar is not a v2 avatar');
    }
  }

  trusts(otherAvatar: Address): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(this.address, otherAvatar);
  }

  isTrustedBy(otherAvatar: Address): Promise<boolean> {
    return this.sdk.v2Hub!.isTrusted(otherAvatar, this.address);
  }

  async updateMetadata(cid: string): Promise<ContractTransactionReceipt> {
    this.throwIfNameRegistryIsNotAvailable();

    const digest = cidV0ToUint8Array(cid);
    const tx = await this.sdk.nameRegistry?.updateMetadataDigest(digest);
    const receipt = await tx?.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }

    this.avatarInfo.cidV0 = cid;

    return receipt;
  }

  async getMaxTransferableAmount(
    to: Address,
    tokenId?: Address,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[]): Promise<number> {
    this.throwIfV2IsNotAvailable();
    to = to.toLowerCase() as Address;

    excludeFromTokens = await this.sdk.getDefaultTokenExcludeList(to, excludeFromTokens);

    if (tokenId) {
      const tokenInfo = await this.sdk.data.getTokenInfo(tokenId);
      if (!tokenInfo) {
        throw new Error('Token not found');
      }

      const tokenBalances = await this.sdk.data.getTokenBalances(this.address);
      const tokenBalance = tokenBalances.filter(b => b.version === 2 && b.tokenAddress === tokenInfo.token)[0];
      return tokenBalance?.circles ?? 0;
    }

    const result = await findMaxFlow(
      this.sdk.circlesConfig.circlesRpcUrl,
      <FindPathParams>{
        from: this.address,
        to,
        useWrappedBalances,
        fromTokens,
        toTokens,
        excludeFromTokens,
        excludeToTokens
      });

    return CirclesConverter.attoCirclesToCircles(CirclesConverter.truncateToSixDecimals(result));
  }

  async getMintableAmount(): Promise<number> {
    this.throwIfV2IsNotAvailable();
    const [a, _, __] = await this.sdk.v2Hub!.calculateIssuance(this.address);
    return parseFloat(formatEther(a));
  }

  async getTotalBalance(): Promise<number> {
    return parseFloat(await this.sdk.data.getTotalBalanceV2(this.address, true));
  }

  async getGasTokenBalance(): Promise<bigint> {
    // TODO: re-implement
    // return await this.sdk.contractRunner.provider?.getBalance(this.address) ?? 0n;
    return 0n;
  }

  async getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>> {
    const query = this.sdk.data.getTransactionHistory(this.address, pageSize);
    await query.queryNextPage();

    return query;
  }

  async getTrustRelations(): Promise<TrustRelationRow[]> {
    return this.sdk.data.getAggregatedTrustRelations(this.address, 2);
  }

  async getBalances(): Promise<TokenBalanceRow[]> {
    return await this.sdk.data.getTokenBalances(this.address);
  }

  async personalMint(): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.personalMint();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Personal mint failed');
    }

    return receipt;
  }

  async stop(): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();
    const tx = await this.sdk.v2Hub!.stop();
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Stop failed');
    }

    return receipt;
  }

  private async transitiveTransfer(
    to: Address,
    amount: bigint,
    batch: BatchRun,
    txData?: Uint8Array,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[]
  ) {
    this.throwIfV2IsNotAvailable();

    to = to.toLowerCase() as Address;
    excludeFromTokens = await this.sdk.getDefaultTokenExcludeList(to, excludeFromTokens);
    amount = CirclesConverter.truncateToSixDecimals(amount);

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
    const path = await findPath(
      this.sdk.circlesConfig.circlesRpcUrl,
      {
        from: this.address,
        to,
        targetFlow: amount.toString(),
        useWrappedBalances,
        fromTokens,
        toTokens,
        excludeFromTokens,
        excludeToTokens
      }
    );

    const wrapCalls: TransactionRequest[] = [];
    const unwrapCalls: TransactionRequest[] = [];

    // Get the token info for all tokens in the path
    const tokenInfoMap = await getTokenInfoMapFromPath(this.sdk.circlesConfig.circlesRpcUrl, path);

    // Find all wrapped edges (can only originate from the sender)
    const allWrappedEdges = path.transfers
      .filter(o => o.from == this.avatarInfo.avatar)
      .filter(o => !!tokenInfoMap.get(o.tokenOwner.toLowerCase())?.type.startsWith('CrcV2_ERC20WrapperDeployed'));

    // Filter the static edges
    const wrappedStaticEdges = allWrappedEdges.filter(o => tokenInfoMap.get(o.tokenOwner.toLowerCase())?.type === 'CrcV2_ERC20WrapperDeployed_Inflationary');
    const wrapedStaticEdgeTotalsByToken: Record<string, bigint> = {};
    wrappedStaticEdges.forEach(o => {
      if (!wrapedStaticEdgeTotalsByToken[o.tokenOwner]) {
        wrapedStaticEdgeTotalsByToken[o.tokenOwner] = BigInt(0);
      }
      wrapedStaticEdgeTotalsByToken[o.tokenOwner] += BigInt(o.value);
    });

    // Filter the demurraged edges
    const wrappedDemurragedEdges = allWrappedEdges.filter(o => tokenInfoMap.get(o.tokenOwner.toLowerCase())?.type === 'CrcV2_ERC20WrapperDeployed_Demurraged');
    const wrappedDemurragedEdgeTotalsByToken: Record<string, bigint> = {};
    wrappedDemurragedEdges.forEach(o => {
      if (!wrappedDemurragedEdgeTotalsByToken[o.tokenOwner]) {
        wrappedDemurragedEdgeTotalsByToken[o.tokenOwner] = BigInt(0);
      }
      wrappedDemurragedEdgeTotalsByToken[o.tokenOwner] += BigInt(o.value);
    });

    const WRAPPER_ERC20_TOKEN_ABI = [
      'function unwrap(uint256 _amount)'
    ];

    // Unwrap all used static wrapped tokens fully
    const usedStaticTokenCount = Object.keys(wrapedStaticEdgeTotalsByToken).length;
    const wrappedStaticBalanceByTokenInStaticUnits: Record<string, bigint> = {};
    if (usedStaticTokenCount > 0) {
      const senderWrappedStaticTotals = await this.getStaticWrappedTokenTotalsFromSender(this.address);

      const relevantWrappedStaticBalances = senderWrappedStaticTotals.filter(o => !!wrapedStaticEdgeTotalsByToken[o.tokenAddress]);
      relevantWrappedStaticBalances.forEach(o => {
        wrappedStaticBalanceByTokenInStaticUnits[o.tokenAddress] = BigInt(o.staticAttoCircles);

        unwrapCalls.push({
          to: o.tokenAddress as Address,
          data: new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI).encodeFunctionData('unwrap', [BigInt(o.staticAttoCircles)]),
          value: 0n
        });
      });
    }

    // Unwrap all used demurraged wrapped tokens exactly
    const usedDemurragedTokenCount = Object.keys(wrappedDemurragedEdgeTotalsByToken).length;
    if (usedDemurragedTokenCount > 0) {
      Object.entries(wrappedDemurragedEdgeTotalsByToken).forEach(([wrapperAddr, total]) => {
        unwrapCalls.push({
          to: wrapperAddr as Address,
          data: new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI).encodeFunctionData('unwrap', [total]),
          value: 0n
        });
      });
    }

    // From this point on, we have enough (unwrapped, demurraged) tokens of each kind to
    // facilitate the transfer. However, the returned path still contains the wrapped token
    // addresses as "tokenOwner". We need to look up the real token owner and replace it
    // in the path (we create a copy).
    const unwrappedStaticTokensUsedInDemurragedUnits: Record<string, bigint> = {};

    const unwrappedTransfers = path.transfers.map(o => {
      const tokenInfo = tokenInfoMap.get(o.tokenOwner.toLowerCase());
      if (tokenInfo && tokenInfo.type.startsWith('CrcV2_ERC20WrapperDeployed')) {
        // Use the opportunity to also do some bookkeeping about how many demurraged tokens
        // from the unwrapped static tokens have been used so far. We need this to later know
        // how many demurraged tokens we have left to wrap them again.
        if (tokenInfo.type === 'CrcV2_ERC20WrapperDeployed_Inflationary') {
          if (!unwrappedStaticTokensUsedInDemurragedUnits[tokenInfo.token]) {
            unwrappedStaticTokensUsedInDemurragedUnits[tokenInfo.token] = BigInt(0);
          }
          unwrappedStaticTokensUsedInDemurragedUnits[tokenInfo.token] += BigInt(o.value);
        }

        return {
          ...o,
          tokenOwner: tokenInfo.tokenOwner
        };
      }
      return o;
    });

    // Calculate what's left after the transfer for each static token and prepare the wrap calls
    await Promise.all(Object.entries(unwrappedStaticTokensUsedInDemurragedUnits).map(async ([token, totalUsedDemurraged]) => {
      const totalStaticTokenBalance = wrappedStaticBalanceByTokenInStaticUnits[token];
      const totalDemurragedTokenBalance = CirclesConverter.attoStaticCirclesToAttoCircles(totalStaticTokenBalance);
      const remainingDemurragedBalance = totalDemurragedTokenBalance - totalUsedDemurraged;

      // Add the wrap call for the remaining static balance
      const realTokenOwner = tokenInfoMap.get(token.toLowerCase())?.tokenOwner;
      if (!realTokenOwner) {
        throw new Error(`Token owner not found for token: ${token}`);
      }
      const wrapTx = await this.sdk.v2Hub!.wrap.populateTransaction(realTokenOwner, remainingDemurragedBalance, 1);
      wrapCalls.push({
        to: wrapTx.to as Address,
        data: wrapTx.data,
        value: 0n
      });
    }));

    // Finally, we can create the flow matrix with the unwrapped transfers
    const flowMatrix: FlowMatrix = createFlowMatrix(
      this.address,
      to,
      path.maxFlow,
      unwrappedTransfers
    );

    // If we have data, attach it to the streams
    if (txData) {
      for (let i = 0; i < flowMatrix.streams.length; i++) {
        flowMatrix.streams[i].data = txData || new Uint8Array(0);
      }
    }

    // Create the operateFlowMatrix call
    const operateFlowMatrixCall = await this.sdk.v2Hub!.operateFlowMatrix.populateTransaction(
      flowMatrix.flowVertices,
      flowMatrix.flowEdges,
      flowMatrix.streams,
      flowMatrix.packedCoordinates
    );

    const selfApprovalCall = await this.sdk.v2Hub!.setApprovalForAll.populateTransaction(this.address, true);
    if (!selfApprovalCall) {
      throw new Error('Failed to create self-approval call');
    }

    // Prepare the Safe multi-send call
    const subCalls: ContractTransaction[] = [
      selfApprovalCall,
      ...unwrapCalls,
      operateFlowMatrixCall,
      ...wrapCalls
    ];

    subCalls.forEach(call => {
      batch.addTransaction({
        to: call.to as Address,
        data: call.data,
        value: 0n
      });
    });
  }

  private async directTransfer(to: Address, amount: bigint, tokenAddress: Address, txData?: Uint8Array): Promise<TransactionReceipt> {
    const tokenInf = await this.sdk.data.getTokenInfo(tokenAddress);
    console.log(`Direct transfer - of: ${amount} - tokenId: ${tokenInf?.token} - to: ${to}`);
    if (!tokenInf) {
      throw new Error('Token not found');
    }

    const erc1155Types = new Set<TokenType>(['CrcV2_RegisterHuman', 'CrcV2_RegisterGroup']);
    const erc20Types = new Set<TokenType>(['CrcV2_ERC20WrapperDeployed_Demurraged', 'CrcV2_ERC20WrapperDeployed_Inflationary', 'CrcV1_Signup']);

    if (erc1155Types.has(tokenInf.type)) {
      return await this.transferErc1155(tokenAddress, to, amount, txData);
    } else if (erc20Types.has(tokenInf.type)) {
      return <TransactionReceipt><unknown>await this.transferErc20(to, amount, tokenAddress);
    }
    throw new Error(`Token type ${tokenInf.type} not supported`);
  }

  private async transferErc20(to: Address, amount: bigint, tokenAddress: Address) {
    const iface = new ethers.Interface(['function transfer(address to, uint256 value)']);
    const data = iface.encodeFunctionData('transfer', [to, amount]);

    if (!this.sdk?.contractRunner?.sendTransaction) {
      throw new Error('ContractRunner not available');
    }

    return await this.sdk.contractRunner.sendTransaction({
      to: tokenAddress,
      data: data,
      value: 0n
    });
  }

  private async transferErc1155(tokenAddress: Address, to: Address, amount: bigint, txData?: Uint8Array) {
    const numericTokenId = addressToUInt256(tokenAddress);
    txData = txData || new Uint8Array(0);
    console.log(`numericTokenId: ${numericTokenId}`);
    const tx = await this.sdk.v2Hub?.safeTransferFrom(
      this.address,
      to,
      numericTokenId,
      amount,
      txData);

    const receipt = await tx?.wait();
    if (!receipt) {
      throw new Error('Transfer failed');
    }

    return receipt;
  }

  async transfer(
    to: Address,
    amount: bigint,
    tokenAddress?: Address,
    txData?: Uint8Array,
    useWrappedBalances?: boolean,
    fromTokens?: Address[],
    toTokens?: Address[],
    excludeFromTokens?: Address[],
    excludeToTokens?: Address[]): Promise<TransactionReceipt> {
    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    if (!tokenAddress) {
      const batch = this.sdk.contractRunner.sendBatchTransaction();

      await this.transitiveTransfer(
        to,
        amount,
        batch,
        txData,
        useWrappedBalances,
        fromTokens,
        toTokens,
        excludeFromTokens,
        excludeToTokens);

      return <TransactionReceipt><unknown>(await batch.run());
    } else {
      return this.directTransfer(to, amount, tokenAddress, txData);
    }
  }

  async trust(avatar: Address | Address[]): Promise<TransactionResponse> {
    this.throwIfV2IsNotAvailable();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.sdk.v2Hub!.interface.encodeFunctionData('trust', [av, BigInt('79228162514264337593543950335')]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v2HubAddress!,
        data: txData,
        value: 0n
      });
    }

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Trust failed');
    }

    return receipt;
  }

  async untrust(avatar: Address | Address[]): Promise<TransactionResponse> {
    this.throwIfV2IsNotAvailable();

    if (!this.sdk?.contractRunner?.sendBatchTransaction) {
      throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
    }

    const avatars = Array.isArray(avatar) ? avatar : [avatar];
    const batch = this.sdk.contractRunner.sendBatchTransaction();

    for (const av of avatars) {
      const txData = this.sdk.v2Hub!.interface.encodeFunctionData('trust', [av, BigInt('0')]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v2HubAddress!,
        data: txData,
        value: 0n
      });
    }

    const receipt = await batch.run();
    if (!receipt) {
      throw new Error('Untrust failed');
    }

    return receipt;
  }

  /**
   * @dev This function enables users to convert personal tokens to group tokens (gCRC)
   *      For BaseGroup, it sends tokens to the group's BaseMintHandler contract which
   *      handles the conversion process. For default group types, it calls the Hub's groupMint directly.
   *
   *      The BaseMintHandler works as follows:
   *      1. It receives ERC1155 tokens via safeBatchTransferFrom
   *      2. In its onERC1155BatchReceived/onERC1155Received functions, it:
   *         - Calls the Hub's groupMint function
   *         - Hub mints the gCRC tokens and sends them back to the BaseMintHandler
   *         - BaseMintHandler forwards tokens to the beneficiary (or wraps to ERC20 if requested)
   *
   *      The optional `data` parameter can be set to `keccak256("TYPE_DEMURRAGE")` or `keccak256("TYPE_INFLATIONARY")` constants
   *      to wrap the minted gCRC into specialized ERC20 tokens before returning to the beneficiary.
   *
   * @param group The address of the group
   * @param collateral An array of collateral token addresses to convert into group tokens
   * @param amounts An array of amounts to convert, corresponding to each collateral address
   * @param data Additional data, for BaseGroup can contain token type constants to request ERC20 wrapping
   * @returns A promise resolving to the transaction receipt after mining
   */
  async groupMint(group: Address, collateral: Address[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt> {
    this.throwIfV2IsNotAvailable();

    group = group.toLowerCase() as Address;
    const groupType = await this.sdk.getGroupType(group);

    if (groupType == 'CrcV2_BaseGroupCreated') {
      const baseGroup = BaseGroup__factory.connect(group, <ContractRunner>this.sdk.contractRunner);

      // Get Base Group Mint handler address
      const baseGroupMintHandler = (await baseGroup.BASE_MINT_HANDLER()) ?? ZeroAddress;
      // Convert collateral tokens addresses to the uint format
      const collateralIds = collateral.map(collateralId => addressToUInt256(collateralId as Address));
      // Send tokens to the mint handler
      const tx = await this.sdk.v2Hub!.safeBatchTransferFrom(
        this.address,
        baseGroupMintHandler,
        collateralIds,
        amounts,
        data
      );

      // Wait on the receipt
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Group mint failed');
      }

      return receipt;
    } else {
      // For the default groups follow use the regular hub groupMint function
      const tx = await this.sdk.v2Hub!.groupMint(group, collateral, amounts, data);
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Group mint failed');
      }

      return receipt;
    }
  }

  async getRedeemableAmount(group: Address, collateral: Address): Promise<bigint> {
    // Define the group treasury address
    const treasuryAddress = (await this.sdk.v2Hub!.treasuries(group)).toLowerCase();

    return (await this.sdk.v2Hub?.balanceOf(treasuryAddress, BigInt(collateral))) || 0n;
  }

  /**
   * @notice Redeems collateral tokens from a group's treasury in exchange for group tokens
   * @dev Allows redemption of collateral from group treasuries using equivalent group tokens.
   * Implementation varies by group type:
   * - For CrcV2_BaseGroupCreated: Uses flowMatrix operations with vertex coordination
   * - For standard groups: Uses ERC1155 safeTransferFrom with encoded metadata
   *
   * @param group The address of the group from which to redeem collateral
   * @param collaterals Array of collateral token addresses to redeem
   * @param amounts Array of collateral amounts to redeem
   *
   * @return A Promise resolving to the transaction receipt upon successful redemption
   */
  async groupRedeem(
    group: Address,
    collaterals: Address[],
    amounts: bigint[]
  ): Promise<ContractTransactionReceipt | TransactionReceipt> {
    this.throwIfV2IsNotAvailable();

    group = group.toLowerCase() as Address;
    const groupType = await this.sdk.getGroupType(group);

    if (groupType == 'CrcV2_BaseGroupCreated') {
      if (collaterals.length !== amounts.length) {
        throw new Error('Collateral and amounts arrays must be the same length');
      }

      if (!collaterals.length || !amounts.length) {
        throw new Error('Collateral and amounts arrays cannot be empty');
      }

      const totalAmount = amounts.reduce((sum, current) => sum + current, 0n);

      // Define the group treasury address
      const treasuryAddress = (await this.sdk.v2Hub!.treasuries(group)).toLowerCase();
      // Address of the redeemer
      const currentAvatar = this.address.toLowerCase();

      // Check if the recipient trusts all collaterals
      for (const collateral of collaterals) {
        const isTrusted = await this.trusts(collateral);
        if (!isTrusted) {
          throw new Error(`Collateral ${collateral} is not trusted`);
        }
      }

      if (!this.sdk?.contractRunner?.sendBatchTransaction) {
        throw new Error('ContractRunner (or sendBatchTransaction capability) not available');
      }

      const batch = this.sdk.contractRunner.sendBatchTransaction();
      // Check if the account is approved as operator
      const approvalStatus = await this.sdk.v2Hub!.isApprovedForAll(this.address, this.address);

      if (!approvalStatus) {
        const tx = this.sdk.v2Hub!.interface.encodeFunctionData('setApprovalForAll', [this.address, true]);
        batch.addTransaction({
          to: this.sdk.circlesConfig.v2HubAddress!,
          data: tx,
          value: 0n
        });
      }

      const flowVertices = [
        // Convert to a Set to remove duplicates
        ...new Set([
          // Construct the unsorted flow vertices array
          ...collaterals,
          currentAvatar,
          group,
          treasuryAddress
        ].map(address => address.toLowerCase()))
      ].sort((a, b) => {
        // Sort addresses in ascending order based on their numeric value
        const aValue = BigInt(a);
        const bValue = BigInt(b);

        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      });

      // Construct the flow array
      const flow = [{ streamSinkId: 0, amount: totalAmount.toString() }];
      const flowEdgeIds: number[] = [];

      amounts.forEach(amount => {
        flow.push({
          streamSinkId: 1,
          amount: amount.toString()
        });

        flowEdgeIds.push(flowEdgeIds.length + 1);
      });

      const sourceCoordinate = flowVertices.indexOf(currentAvatar as Address);
      const groupTokenIndex = flowVertices.indexOf(group as Address);
      const treasuryIndex = flowVertices.indexOf(treasuryAddress as Address);

      // Construct the streams array
      const streams = [
        {
          sourceCoordinate, // Points to sender
          flowEdgeIds,
          data: '0x'
        }
      ];

      const coordinates = [
        groupTokenIndex, // token
        sourceCoordinate, // from
        treasuryIndex // to
      ];

      collaterals.forEach((collateral: Address) => {
        const collateralIndex = flowVertices.indexOf(collateral.toLowerCase() as Address);

        coordinates.push(
          collateralIndex,
          treasuryIndex,
          sourceCoordinate
        );
      });

      // The packed coordinates
      const packedCoordinates = '0x' + coordinates
        .map(index => index.toString(16).padStart(4, '0'))
        .join('');

      const tx = this.sdk.v2Hub!.interface.encodeFunctionData('operateFlowMatrix', [
        flowVertices,
        flow,
        streams,
        packedCoordinates
      ]);

      batch.addTransaction({
        to: this.sdk.circlesConfig.v2HubAddress!,
        data: tx,
        value: 0n
      });

      // Call the hub's operateFlowMatrix function with the constructed parameters
      const receipt = await batch.run();
      if (!receipt) {
        throw new Error('Group redeem failed');
      }

      return <TransactionReceipt><unknown>(receipt);
    } else {
      const standardTreasury = this.sdk.circlesConfig.standardTreasury;
      if (!standardTreasury) {
        throw new Error('No standard treasury address in config.');
      }

      // 1) Sum up requested redemption amounts
      let totalValue = 0n;
      for (const val of amounts) {
        totalValue += val;
      }
      if (totalValue === 0n) {
        throw new Error('Cannot redeem zero amount.');
      }

      // 2) Encode the "BaseRedemptionPolicy" data:
      //    struct BaseRedemptionPolicy {
      //       uint256[] redemptionIds;
      //       uint256[] redemptionValues;
      //    }
      // Convert each collateral address to its numeric ID:
      const redemptionIds = collaterals.map(collateral => addressToUInt256(collateral));
      const baseRedemptionPolicyEncoded = AbiCoder.defaultAbiCoder().encode(
        ['tuple(uint256[] redemptionIds, uint256[] redemptionValues)'],
        [[redemptionIds, amounts]]
      );

      // 3) Encode the Metadata struct:
      //    struct Metadata {
      //       bytes32 metadataType;
      //       bytes   metadata;         // must be empty for groupRedeem
      //       bytes   erc1155UserData;  // your redemption policy
      //    }
      const metadataTuple = [
        this.METADATATYPE_GROUPREDEEM,
        '0x',                       // empty 'metadata' for groupRedeem
        baseRedemptionPolicyEncoded
      ];

      // Encode as a single tuple
      const metadataEncoded = AbiCoder.defaultAbiCoder().encode(
        ['tuple(bytes32, bytes, bytes)'],
        [metadataTuple]
      );

      // 4) safeTransferFrom(...) to StandardTreasury
      const groupId = addressToUInt256(group);

      const tx = await this.sdk.v2Hub!.safeTransferFrom(
        this.address,
        standardTreasury,
        groupId,
        totalValue,
        metadataEncoded
      );

      // 5) Wait on the receipt
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Group redeem failed');
      }

      return receipt;
    }
  }

  /**
   * @notice Automatically redeems collateral tokens from a Base Group's treasury
   * @dev Performs automatic redemption by determining trusted collaterals and using pathfinder for optimal flow.
   *
   * Only supports CrcV2_BaseGroupCreated group types. The function uses the v2 pathfinder to determine
   * the optimal redemption path and validates that sufficient liquidity exists before attempting redemption.
   *
   * @param group The address of the Base Group from which to redeem collateral tokens
   * @param amount The amount of group tokens to redeem for collateral (must be > 0 and <= max redeemable)
   *
   * @return A Promise resolving to the transaction receipt upon successful automatic redemption
   *
   */
  async groupRedeemAuto(
    group: Address,
    amount: bigint
  ): Promise<TransactionReceipt> {
    this.throwIfV2IsNotAvailable();

    group = group.toLowerCase() as Address;
    const groupType = await this.sdk.getGroupType(group);

    if (groupType !== 'CrcV2_BaseGroupCreated')
      throw new Error('Only Base Groups support this method');

    // Address of the redeemer
    const currentAvatar = this.address.toLowerCase() as Address;

    // Define the group treasury address
    const treasuryAddress = (await this.sdk.v2Hub!.treasuries(group)).toLowerCase();

    // Get list of all tokens in the treasury
    const treasuryTokens = (await this.sdk.data.getTokenBalances(treasuryAddress as Address))
      .filter(balance => balance.isErc1155)
      .map(balance => balance.tokenAddress);

    const trustRelationships = await this.sdk.data.getAggregatedTrustRelations(currentAvatar, 2);
    // Get list of tokens to expect from pathfinder
    const expectedToTokens = trustRelationships.filter(trustObject => {
      if (
        (trustObject.relation === 'mutuallyTrusts' || trustObject.relation === 'trusts') &&
        treasuryTokens.includes(trustObject.objectAvatar)
      ) return true;
    }).map(trustObject => trustObject.objectAvatar);

    // Check if enough tokens as amount
    const getMaxRedeemableAmount = await this.sdk.v2Pathfinder.getMaxFlow(
      currentAvatar,
      currentAvatar,
      false,
      [group],
      expectedToTokens
    );

    if (BigInt(getMaxRedeemableAmount) < amount)
      throw new Error(`Specified amount ${amount} exceeds max tokens flow ${getMaxRedeemableAmount}`);

    const receipt = await this.transfer(
      currentAvatar,
      amount,
      undefined,
      undefined,
      false,
      [group],
      expectedToTokens
    );

    if (!receipt) {
      throw new Error('Group redeem failed');
    }
    return receipt;
  }

  async getProfile(): Promise<Profile | undefined> {
    const profileCid = this.avatarInfo?.cidV0;
    if (this._cachedProfile && this._cachedProfileCid === profileCid) {
      return this._cachedProfile;
    }

    if (profileCid) {
      try {
        const profileData = await this.sdk?.profiles?.get(profileCid);
        if (profileData) {
          this._cachedProfile = profileData;
          this._cachedProfileCid = profileCid;

          return this._cachedProfile;
        }
      } catch (e) {
        console.warn(`Couldn't load profile for CID ${profileCid}`, e);
      }
    }

    return undefined;
  }

  async registerShortNameWithNonce(nonce: number): Promise<ContractTransactionReceipt> {
    const tx = await this.sdk.nameRegistry?.registerShortNameWithNonce(nonce);
    if (!tx) {
      throw new Error('Failed to register short name with nonce');
    }
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Registering short name with nonce failed');
    }

    return receipt;
  }

  async updateProfile(profile: Profile): Promise<string> {
    const result = await this.sdk?.profiles?.create(profile);
    if (!result) {
      throw new Error('Failed to update profile. The profile service did not return a CID.');
    }

    const updateCidResult = await this.updateMetadata(result);
    if (!updateCidResult) {
      throw new Error('Failed to update profile. The CID was not updated.');
    }

    this.avatarInfo.cidV0 = result;

    return result;
  }

  async wrapDemurrageErc20(avatarAddress: Address, amount: bigint): Promise<Address> {
    const wrapResult = await this.sdk.v2Hub?.wrap(avatarAddress, amount, 0n /*Demurrage*/);
    const receipt = await wrapResult?.wait();
    console.log(`wrapDemurrageErc20 receipt: ${receipt}`);

    if (!receipt) {
      throw new Error('Wrap failed');
    }

    // TODO: Return the address of the wrapper
    //return await this.decodeErc20WrapperDeployed(receipt);
    return ZeroAddress as Address;
  }

  async wrapInflationErc20(avatarAddress: Address, amount: bigint): Promise<Address> {
    const wrapResult = await this.sdk.v2Hub?.wrap(avatarAddress, amount, 1n /*Inflation*/);
    const receipt = await wrapResult?.wait();
    console.log(`wrapInflationErc20 receipt: ${receipt}`);

    if (!receipt) {
      throw new Error('Wrap failed');
    }

    // TODO: Return the address of the wrapper
    //return await this.decodeErc20WrapperDeployed(receipt);
    return ZeroAddress as Address;
  }

  async unwrapDemurrageErc20(wrapperTokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt> {
    const demurragedWrapper = await this.sdk.getDemurragedWrapper(wrapperTokenAddress);
    const tx = await demurragedWrapper.unwrap(amount);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Unwrap failed');
    }
    return receipt;
  }

  async unwrapInflationErc20(wrapperTokenAddress: Address, amount: bigint): Promise<ContractTransactionReceipt> {
    const inflationWrapper = await this.sdk.getInflationaryWrapper(wrapperTokenAddress);
    const tx = await inflationWrapper.unwrap(amount);
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error('Unwrap failed');
    }
    return receipt;
  }

  /**
   * Invite a user to Circles.
   * @param avatar The address of the avatar to invite. Can be either a v1 address or an address that's not signed up yet.
   */
  async inviteHuman(avatar: Address): Promise<TransactionResponse> {
    this.throwIfV2IsNotAvailable();

    const avatarInfo = await this.sdk.data.getAvatarInfo(avatar);
    if (avatarInfo?.version == 2) {
      throw new Error('Avatar is already a v2 avatar');
    }

    const receipt = await this.trust(avatar);
    if (!receipt) {
      throw new Error('Invite failed');
    }

    return receipt;
  }

  /**
   * Gets the total supply of either this avatar's Personal- or Group-Circles, depending on the avatar's type.
   * Returns '0' for organizations or if the avatar is not signed up at Circles.
   */
  async getTotalSupply(): Promise<bigint> {
    this.throwIfV2IsNotAvailable();
    return await this.sdk.v2Hub!.totalSupply(this.address);
  }

  private throwIfV2IsNotAvailable() {
    if (!this.sdk.circlesConfig.v2HubAddress) {
      throw new Error('V2 is not available');
    }
  }

  private throwIfNameRegistryIsNotAvailable() {
    if (!this.sdk.nameRegistry) {
      throw new Error('Name registry is not available');
    }
  }

  private async getStaticWrappedTokenTotalsFromSender(senderAddress: string): Promise<{
    tokenAddress: string;
    tokenOwner: string;
    tokenType: string;
    staticAttoCircles: string;
    attoCircles: string;
  }[]> {
    const res = await this.sdk.circlesRpc.call<{
      tokenAddress: string;
      tokenOwner: string;
      tokenType: string;
      staticAttoCircles: string;
      attoCircles: string;
    }[]>('circles_getTokenBalances', [senderAddress]);

    return res.result.filter(o => o.tokenType == 'CrcV2_ERC20WrapperDeployed_Inflationary');
  }
}
