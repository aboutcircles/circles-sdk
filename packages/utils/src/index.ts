import { ethers } from 'ethers';
import multihash from 'multihashes';
import { Address } from './type';

/**
 * Converts a CIDv0 string to a UInt8Array, stripping the hashing algorithm identifier.
 * @param {string} cidV0 - The CIDv0 string (e.g., Qm...).
 * @returns {Uint8Array} - The resulting UInt8Array of the 32-byte hash digest.
 */
export function cidV0ToUint8Array(cidV0: string) {
  // Decode the base58 CIDv0 string to a Multihash
  const multihashBytes = multihash.fromB58String(cidV0);

  // Verify the multihash algorithm (should be SHA-256)
  const decodedMultihash = multihash.decode(multihashBytes);
  if (decodedMultihash.code !== multihash.names['sha2-256']) {
    throw new Error('Unsupported hash algorithm. Only SHA-256 is supported for CIDv0.');
  }

  // Extract and return the 32-byte hash digest
  return decodedMultihash.digest;
}

/**
 * Converts a 32-byte UInt8Array back to a CIDv0 string by adding the hashing algorithm identifier.
 * @param {Uint8Array} uint8Array - The 32-byte hash digest.
 * @returns {string} - The resulting CIDv0 string (e.g., Qm...).
 */
export function uint8ArrayToCidV0(uint8Array: Uint8Array) {
  if (uint8Array.length !== 32) {
    throw new Error('Invalid array length. Expected 32 bytes.');
  }

  // Recreate the Multihash (prefix with SHA-256 code and length)
  const multihashBytes = multihash.encode(uint8Array, 'sha2-256');

  // Encode the Multihash as a base58 CIDv0 string
  return multihash.toB58String(multihashBytes);
}

/**
 * Converts a Uint8Array to a hex string.
 * @param uint8Array - The Uint8Array to convert.
 */
export function uint8ArrayToHexString(uint8Array: Uint8Array) {
  return Array.from(uint8Array).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts a hex string to a Uint8Array.
 * @param {string} hexString - The hex string to convert.
 * @returns {Uint8Array} - The resulting Uint8Array.
 */
export function hexStringToUint8Array(hexString: string) {
  const bytes = [];
  for (let i = 0; i < hexString.length; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

/**
 * Converts a string to a Uint8Array.
 * @param {string} str - The string to convert.
 * @returns {Uint8Array} - The resulting Uint8Array.
 */
export function stringToUint8Array(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

export function addressToUInt256(address: Address): bigint {
  // Remove the '0x' prefix if it exists
  let addr: string = address;
  if (addr.startsWith('0x')) {
    addr = addr.slice(2);
  }

  // Convert the address to a BigInt
  return BigInt('0x' + addr);
}

export function uint256ToAddress(uint256: bigint): Address {
  // Convert the BigInt to a hex string
  let hexString = uint256.toString(16);

  // Add leading zeros to ensure the string length is 40
  hexString = hexString.padStart(40, '0');

  // Add the '0x' prefix
  return `0x${hexString}`;
}

export const errorAbis = [
  'error Create2InsufficientBalance(uint256 balance, uint256 needed)',
  'error Create2EmptyBytecode()',
  'error Create2FailedDeployment()',
  'error ReentrancyGuardReentrantCall()',
  'error AddressInsufficientBalance(address account)',
  'error AddressEmptyCode(address target)',
  'error FailedInnerCall()',
  'error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)',
  'error ERC20InvalidSender(address sender)',
  'error ERC20InvalidReceiver(address receiver)',
  'error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed)',
  'error ERC20InvalidApprover(address approver)',
  'error ERC20InvalidSpender(address spender)',
  'error ERC721InvalidOwner(address owner)',
  'error ERC721NonexistentToken(uint256 tokenId)',
  'error ERC721IncorrectOwner(address sender, uint256 tokenId, address owner)',
  'error ERC721InvalidSender(address sender)',
  'error ERC721InvalidReceiver(address receiver)',
  'error ERC721InsufficientApproval(address operator, uint256 tokenId)',
  'error ERC721InvalidApprover(address approver)',
  'error ERC721InvalidOperator(address operator)',
  'error ERC1155InsufficientBalance(address sender, uint256 balance, uint256 needed, uint256 tokenId)',
  'error ERC1155InvalidSender(address sender)',
  'error ERC1155InvalidReceiver(address receiver)',
  'error ERC1155MissingApprovalForAll(address operator, address owner)',
  'error ERC1155InvalidApprover(address approver)',
  'error ERC1155InvalidOperator(address operator)',
  'error ERC1155InvalidArrayLength(uint256 idsLength, uint256 valuesLength)',
  'error OwnableUnauthorizedAccount(address account)',
  'error OwnableInvalidOwner(address owner)',
  'error CirclesErrorNoArgs(uint8)',
  'error CirclesErrorOneAddressArg(address, uint8)',
  'error CirclesErrorAddressUintArgs(address, uint256, uint8)',
  'error CirclesHubFlowEdgeStreamMismatch(uint256 flowEdgeId, uint256 streamId, uint8 code)',
  'error CirclesHubStreamMismatch(uint256 streamId)',
  'error CirclesHubNettedFlowMismatch(uint256 vertexPosition, int256 matrixNettedFlow, int256 streamNettedFlow)',
  'error CirclesERC1155CannotReceiveBatch(uint8 code)',
  'error CirclesInvalidCirclesId(uint256 id, uint8 code)',
  'error CirclesInvalidParameter(uint256 parameter, uint8 code)',
  'error CirclesAmountOverflow(uint256 amount, uint8 code)',
  'error CirclesProxyAlreadyInitialized()',
  'error CirclesIdMustBeDerivedFromAddress(uint256 providedId, uint8 code)',
  'error CirclesReentrancyGuard(uint8 code)',
  'error CirclesStandardTreasuryGroupHasNoVault(address group)',
  'error CirclesStandardTreasuryInvalidMetadataType(bytes32 metadataType, uint8 code)',
  'error CirclesStandardTreasuryInvalidMetadata(bytes metadata, uint8 code)',
  'error CirclesNamesInvalidName(address avatar, string name, uint8 code)',
  'error CirclesNamesShortNameAlreadyAssigned(address avatar, uint72 shortName, uint8 code)',
  'error CirclesNamesShortNameWithNonceTaken(address avatar, uint256 nonce, uint72 shortName, address takenByAvatar)',
  'error CirclesNamesAvatarAlreadyHasCustomNameOrSymbol(address avatar, string nameOrSymbol, uint8 code)',
  'error CirclesNamesOrganizationHasNoSymbol(address organization, uint8 code)',
  'error CirclesNamesShortNameZero(address avatar, uint256 nonce)',
  'error CirclesMigrationAmountMustBeGreaterThanZero()',
  'error InflationaryCirclesOperatorOnlyActOnBalancesOfSender(address sender, address from)',
  'error CirclesOperatorInvalidStreamSource(uint256 streamIndex, uint256 singleSourceCoordinate, uint256 streamSourceCoordinate)',
  'error CirclesStandardTreasuryRedemptionCollateralMismatch(uint256 circlesId, uint256[] redemptionIds, uint256[] redemptionValues, uint256[] burnIds, uint256[] burnValues)',
  'error ERC2612ExpiredSignature(uint256 deadline)',
  'error ERC2612InvalidSigner(address signer, address owner)',
  // Circles Group operator contracts errors
  'error SupergroupProxyAlreadyInitialised()',
  'error SupergroupOnlyHub()',
  'error SupergroupOnlyOwner()',
  'error SupergroupOnlyOwnerOrService()',
  'error SupergroupOnlyAuthorizedOperator()',
  'error SupergroupMustBeRegistered()',
  'error SupergroupMustUseStandardTreasury()',
  'error SupergroupInvalidCallingParameters()',
  'error SupergroupBlockNormalERC1155Transfers()',
  'error SupergroupAlwaysBlockUntrustedIds()',
  'error SupergroupInvalidOperator(address operator)',
  'error SupergroupMustHaveOperatorsActivated()',
  'error SupergroupLogicAssertion()',
  'error SupergroupOperatorRequestInProgress()',
  'error SupergroupFingerprintUnderflow()',
  'error SupergroupOperatorUnservicedGroup(address group)',
  'error SupergroupOperatorNotAuthorizedAndAuthorizationRequired(address group)',
  'error SupergroupOperatorDoesNotImplement()',
  'error ExpectationAlreadySet(bytes32 expectation)',
  'error NoExpectationSet()',
  'error ExpectationMismatch(bytes32 expected, bytes32 actual)',
  'error ExpectationSingleReceiveOnlySupergroupId(uint256 id)',
  'error CMGroupProxyAlreadyInitialised()',
  'error CMGroupOnlyHub()',
  'error CMGroupOnlyHubOrTreasury()',
  'error CMGroupOnlyOwner()',
  'error CMGroupMembershipCheckFailed(address avatar, address failedCondition)',
  'error CMGroupMaxConditionsActive(uint256 conditionsActive)',
  'error CMGroupOnlyOwnerOrService()',
  'error CMGroupInteractionAmountIsBelowMinimum(uint256 id, uint256 receivedAmount, uint256 minimalAmount)',
  'error CMGroupInvalidCallingParameters()',
  'error CMGHandlerOnlyHub()',
  'error CMGHandlerOnlyCMGroup()',
  'error CMGHandlerOnlyOwner()',
  'error CMGHandlerAcceptanceCallUnhandled()',
  'error CMGHandlerOperatorUnservicedGroup(address group)',
  'error CMGHandlerRefuseGroupCircles()',
  'error CMGHandlerConversionOngoing(uint256 amount)',
  'error CMGHandlerNoConversionExpected()',
  'error CMGHandlerReceivedZeroAmount()',
  'error CMGHandlerRedemptionExpectedFromVault(address from)',
  'error CMGHandlerDataHashMismatchUponReceiving(bytes32 expectedDataHash, bytes receivedData)',
  'error CMGHandlerVaultNotFound(address group)',
  'error CMGHandlerCouldNotFillRedemptionRequest()',
  'error CMGHandlerEarlyRevertCollateralNotPresent()',
  'error CMGHandlerOnlyTransferOwnCircles()',
  'error CMGHandlerInvalidCallingParameters()',
  'error CMGHandlerLogicAssertion()',
  'error CMGPrimaryGroupMustBeHumanAndGroupToRegisterPrimaryGroup(address human, address group)',
  'error CMGRedemptionOperatorGroupMustBeRegistered(address group)',
  'error CMGRedemptionOperatorHandlerOfGroupZeroAddress()',
  'error CMGRedemptionOperatorOnlySupportStandardTreasuryGroups(address treasury)',
  'error CMGRedemptionOperatorFoundCollateralExceedsAmountRequested(uint256 requestedAmount, uint256 foundAmount)',
  'error CMGRedemptionOperatorFailedToFindSufficientCollateral(uint256 requestedAmount, uint256 foundAmount)',
  'error CMGRedemptionOperatorInvalidCallingParameters()',
  'error GroupLiquidityProviderGroupCannotBeZeroAddress()',
  'error GroupLiquidityProviderOwnerCannotBeZeroAddress()',
  'error GroupLiquidityProviderCanOnlyTransferOwnTokens()',
  'error GroupLiquidityProviderOnlyAcceptTransfersFromHub()',
  'error GroupLiquidityProviderOnlyAcceptTransfersFromOwnerOrVault()',
  // Liquidity bootstrapping pool factory errors
  'error OnlyFactory()',
  'error OrderNotFilledYet()',
  'error AlreadyCreated()',
  'error InsufficientBackingAssetBalance()',
  'error NotBacker()',
  'error TokensLockedUntilTimestamp(uint256 timestamp)',
  'error OnlyHub()',
  'error NotExactlyRequiredCRCAmount(uint256 required, uint256 received)',
  'error OnlyHumanAvatarsAreSupported()',
  'error BackingInFavorDissalowed()',
  'error UnsupportedBackingAsset(address requestedAsset)',
  'error CirclesBackingDeploymentFailed(address backer)',
  'error OnlyCirclesBacking()',
  'error NotAdmin()',
  'error OnlyTwoTokenLBPSupported()'
];

const errorInterface = new ethers.Interface(errorAbis);

// Parsing the error data using the updated ABI definitions
export function parseError(errorData: string): ethers.ErrorDescription | null {
  try {
    return errorInterface.parseError(errorData);
  } catch (error) {
    throw new Error(`Error decoding the revert data: ${error}. Original error data: ${errorData}`);
  }
}

function getCustomErrorFragment(errorText: string) {
  const abi = [
    'error Error(string)'
  ];

  const iface = new ethers.Interface(abi);
  const errorFragment = iface.getError('Error');
  const encodedError = iface.encodeErrorResult('Error', [errorText]);
  const decodedError = iface.decodeErrorResult('Error', encodedError);

  return {
    fragment: errorFragment,
    name: errorFragment?.name,
    args: decodedError,
    signature: errorFragment?.format(),
    selector: iface.getFunction('Error')?.selector
  };
}


export function handleTransactionError(e: any): never {
  console.log(e);
  // handle when data is null
  if (e.data) {
    const parsedError = parseError(e.data);
    if (parsedError) {
      const bigIntReplacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };
      throw new Error(JSON.stringify(parsedError, bigIntReplacer, 2));
    }
  } else if (!e.data && e.info?.error?.message) {
    throw new Error(JSON.stringify(getCustomErrorFragment(e.info.error.message), null, 2));
  }

  throw new Error(JSON.stringify(getCustomErrorFragment('Unknown'), null, 2));
}

export type { Address } from './type';
export { CirclesConverter } from './circlesConverter';