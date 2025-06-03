import { AvatarInterfaceV2 } from '../AvatarInterface';
import {
  AbiCoder,
  ContractRunner,
  ContractTransactionReceipt,
  ethers,
  formatEther, keccak256, toUtf8Bytes,
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
import {
  Address,
  addressToUInt256,
  cidV0ToUint8Array,
  CirclesConverter
} from '@circles-sdk/utils';
import { Profile } from '@circles-sdk/profiles';
import { TokenType } from '@circles-sdk/data/dist/rows/tokenInfoRow';
import { BatchRun, TransactionResponse } from '@circles-sdk/adapter';
import {
  createFlowMatrix, findMaxFlow, findPath, FindPathParams, FlowMatrix,
  getExpectedUnwrappedTokenTotals,
  getTokenInfoMapFromPath,
  getWrappedTokenTotalsFromPath,
  replaceWrappedTokens,
  shrinkPathValues
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
      this.address,
      <FindPathParams>{
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

    // approve self if necessary
    const approvalStatus = await this.sdk.v2Hub!.isApprovedForAll(this.address, this.address);
    if (!approvalStatus) {
      const txData = this.sdk.v2Hub!.interface.encodeFunctionData('setApprovalForAll', [this.address, true]);
      batch.addTransaction({
        to: this.sdk.circlesConfig.v2HubAddress!,
        data: txData,
        value: 0n
      });
    }

    // Determine which edges need to be unwrapped and what unwrapped values are expected
    const tokenInfoMap = await getTokenInfoMapFromPath(this.sdk.circlesConfig.circlesRpcUrl, path);
    const wrappedTotals = getWrappedTokenTotalsFromPath(path, tokenInfoMap);
    const unwrappedTotals = getExpectedUnwrappedTokenTotals(wrappedTotals, tokenInfoMap);

    // add unwrap calls for each wrapped token
    const unwrapCalls = this.buildUnwrapCalls(wrappedTotals);
    unwrapCalls.forEach(unwrap => {
      batch.addTransaction({
        to: unwrap.to,
        data: unwrap.data,
        value: 0n
      });
    });

    // rewrite path -> all ERC-20 wrappers replaced by their avatars
    const pathUnwrapped = replaceWrappedTokens(path, unwrappedTotals);

    // remove a bit from each flow edge to account for rounding errors (only if we handle inflationary wrappers)
    const hasInflationaryWrapper = Object.values(wrappedTotals).some(o => o[1] === 'CrcV2_ERC20WrapperDeployed_Inflationary');
    const shrunkPath = hasInflationaryWrapper
      ? shrinkPathValues(pathUnwrapped) // sledgehammer-shrink all values in the path by 0.0000...1%
      : pathUnwrapped;

    if (hasInflationaryWrapper) {
      console.log(`Path before shrinking: ${JSON.stringify(pathUnwrapped, null, 2)}`);
      console.log(`Path after shrinking: ${JSON.stringify(shrunkPath, null, 2)}`);
    }

    const flowMatrix = createFlowMatrix(
      this.address,
      to,
      shrunkPath.maxFlow,
      shrunkPath.transfers
    );

    if (txData) {
      for (let i = 0; i < flowMatrix.streams.length; i++) {
        flowMatrix.streams[i].data = txData || new Uint8Array(0);
      }
    }

    const operateFlowMatrixCall = this.encodeOperateFlowMatrix(this.sdk.circlesConfig.v2HubAddress!, flowMatrix);
    batch.addTransaction({
      to: operateFlowMatrixCall.to,
      data: operateFlowMatrixCall.data,
      value: 0n
    });
  }

  /**
   * Build one unwrap() call per wrapped token that the sender must execute
   * before the path runs. Works for both inflationary and demurraged wrappers.
   */
  private buildUnwrapCalls(
    totals: Record<string, [bigint, string]>
  ) {
    const WRAPPER_ERC20_TOKEN_ABI = [
      'function unwrap(uint256 _amount)'
    ];
    const iface = new ethers.Interface(WRAPPER_ERC20_TOKEN_ABI);

    return Object.entries(totals).map(([wrapperAddr, [amtDemurraged, wrapperType]]) => {
      const needsStaticAmount = wrapperType === 'CrcV2_ERC20WrapperDeployed_Inflationary';

      const amountForUnwrap = needsStaticAmount
        ? CirclesConverter.attoCirclesToAttoStaticCircles(amtDemurraged)
        : amtDemurraged; // 1:1 for demurraged wrappers

      return {
        to: wrapperAddr as Address,
        data: iface.encodeFunctionData('unwrap', [amountForUnwrap.toString()])
      };
    });
  }

  /**
   * Encode Hub.operateFlowMatrix calldata for on‑chain execution.
   */
  private encodeOperateFlowMatrix(
    hubAddress: Address,
    fm: FlowMatrix
  ) {
    const iface = new ethers.Interface(OPERATE_FLOW_MATRIX_ABI);
    const data = iface.encodeFunctionData('operateFlowMatrix', [
      fm.flowVertices,
      fm.flowEdges.map((e) => [e.streamSinkId, e.amount]),
      fm.streams.map((s) => [s.sourceCoordinate, s.flowEdgeIds, s.data]),
      fm.packedCoordinates
    ]);
    return { to: hubAddress, data };
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

    if(groupType == "CrcV2_BaseGroupCreated") {
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

    if(groupType == "CrcV2_BaseGroupCreated") {
      if(collaterals.length !== amounts.length) {
        throw new Error('Collateral and amounts arrays must be the same length');
      }

      if(!collaterals.length || !amounts.length) {
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

      const sourceCoordinate = flowVertices.indexOf(currentAvatar as Address)
      const groupTokenIndex = flowVertices.indexOf(group as Address);
      const treasuryIndex = flowVertices.indexOf(treasuryAddress as Address);

      // Construct the streams array
      const streams = [
        {
          sourceCoordinate, // Points to sender
          flowEdgeIds,
          data: "0x"
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

    if (groupType !== "CrcV2_BaseGroupCreated")
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
      if(
        (trustObject.relation === "mutuallyTrusts" || trustObject.relation === "trusts") &&
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
    )

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
}
