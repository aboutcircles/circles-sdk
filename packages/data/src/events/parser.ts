import { CirclesEvent, CirclesEventType } from './events';

type EventValues = {
  [key: string]: string;
};

type RpcSubscriptionMessage = Array<{
  event: string;
  values: EventValues;
}>;

const hexToBigInt = (hex: string): bigint => BigInt(hex);
const hexToNumber = (hex: string): number => parseInt(hex, 16);

const parseEventValues = (event: CirclesEventType, values: EventValues): CirclesEvent => {
  const baseEvent = {
    $event: event,
    blockNumber: hexToNumber(values.blockNumber),
    timestamp: values.timestamp ? hexToNumber(values.timestamp) : undefined,
    transactionIndex: hexToNumber(values.transactionIndex),
    logIndex: hexToNumber(values.logIndex),
    transactionHash: values.transactionHash
  };

  switch (event) {
    case 'CrcV1_HubTransfer':
      return {
        ...baseEvent,
        from: values.from,
        to: values.to,
        amount: values.amount ? hexToBigInt(values.amount) : undefined
      };
    case 'CrcV1_Signup':
      return {
        ...baseEvent,
        user: values.user,
        token: values.token
      };
    case 'CrcV1_OrganizationSignup':
      return {
        ...baseEvent,
        organization: values.organization
      };
    case 'CrcV1_Trust':
      return {
        ...baseEvent,
        canSendTo: values.canSendTo,
        user: values.user,
        limit: values.limit ? hexToBigInt(values.limit) : undefined
      };
    case 'CrcV1_Transfer':
      return {
        ...baseEvent,
        tokenAddress: values.tokenAddress,
        from: values.from,
        to: values.to,
        amount: values.amount ? hexToBigInt(values.amount) : undefined
      };
    case 'CrcV2_InviteHuman':
      return {
        ...baseEvent,
        inviter: values.inviter,
        invited: values.invited
      };
    case 'CrcV2_PersonalMint':
      return {
        ...baseEvent,
        human: values.human,
        amount: values.amount ? hexToBigInt(values.amount) : undefined,
        startPeriod: values.startPeriod ? hexToBigInt(values.startPeriod) : undefined,
        endPeriod: values.endPeriod ? hexToBigInt(values.endPeriod) : undefined
      };
    case 'CrcV2_RegisterGroup':
      return {
        ...baseEvent,
        group: values.group,
        mint: values.mint,
        treasury: values.treasury,
        name: values.name,
        symbol: values.symbol
      };
    case 'CrcV2_RegisterHuman':
      return {
        ...baseEvent,
        avatar: values.avatar
      };
    case 'CrcV2_RegisterOrganization':
      return {
        ...baseEvent,
        organization: values.organization,
        name: values.name
      };
    case 'CrcV2_Stopped':
      return {
        ...baseEvent,
        avatar: values.avatar
      };
    case 'CrcV2_Trust':
      return {
        ...baseEvent,
        truster: values.truster,
        trustee: values.trustee,
        expiryTime: values.expiryTime ? hexToBigInt(values.expiryTime) : undefined
      };
    case 'CrcV2_TransferSingle':
      return {
        ...baseEvent,
        operator: values.operator,
        from: values.from,
        to: values.to,
        id: values.id ? hexToBigInt(values.id) : undefined,
        value: values.value ? hexToBigInt(values.value) : undefined
      };
    case 'CrcV2_URI':
      return {
        ...baseEvent,
        value: values.value,
        id: values.id ? hexToBigInt(values.id) : undefined
      };
    case 'CrcV2_ApprovalForAll':
      return {
        ...baseEvent,
        account: values.account,
        operator: values.operator,
        approved: values.approved === 'true'
      };
    case 'CrcV2_TransferBatch':
      return {
        ...baseEvent,
        batchIndex: hexToNumber(values.batchIndex),
        operator: values.operator,
        from: values.from,
        to: values.to,
        id: values.id ? hexToBigInt(values.id) : undefined,
        value: values.value ? hexToBigInt(values.value) : undefined
      };
    case 'CrcV2_DiscountCost':
      return {
        ...baseEvent,
        account: values.account,
        id: values.id ? hexToBigInt(values.id) : undefined,
        discountCost: values.discountCost ? hexToBigInt(values.discountCost) : undefined
      };
    case 'CrcV2_RegisterShortName':
      return {
        ...baseEvent,
        avatar: values.avatar,
        shortName: values.shortName ? hexToBigInt(values.shortName) : undefined,
        nonce: values.nonce ? hexToBigInt(values.nonce) : undefined
      };
    case 'CrcV2_UpdateMetadataDigest':
      return {
        ...baseEvent,
        avatar: values.avatar,
        metadataDigest: values.metadataDigest ? Buffer.from(values.metadataDigest, 'hex') : undefined
      };
    case 'CrcV2_CidV0':
      return {
        ...baseEvent,
        avatar: values.avatar,
        cidV0Digest: values.cidV0Digest ? Buffer.from(values.cidV0Digest, 'hex') : undefined
      };
    default:
      throw new Error(`Unknown event type: ${event}`);
  }
};

export const parseRpcSubscriptionMessage = (message: RpcSubscriptionMessage): CirclesEvent[] => {
  return message.map(result => parseEventValues(<CirclesEventType>result.event, result.values));
};