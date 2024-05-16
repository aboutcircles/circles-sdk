import { ethers, getAddress } from 'ethers';
import { Event, EventDecoder, ParsedEvent } from './common';
import contractAbi from './V2HubAbi.json';

export type ApprovalForAllEvent = Event & {
  account: string;
  operator: string;
  approved: boolean;
};

export type DiscountCostEvent = Event & {
  account: string;
  id: bigint;
  discountCost: bigint;
};

export type InviteHumanEvent = Event & {
  inviter: string;
  invited: string;
};

export type PersonalMintEvent = Event & {
  human: string;
  amount: bigint;
  startPeriod: bigint;
  endPeriod: bigint;
};

export type RegisterGroupEvent = Event & {
  group: string;
  mint: string;
  treasury: string;
  name: string;
  symbol: string;
};

export type RegisterHumanEvent = Event & {
  avatar: string;
};

export type RegisterOrganizationEvent = Event & {
  organization: string;
  name: string;
};

export type StoppedEvent = Event & {
  avatar: string;
};

export type TransferBatchEvent = Event & {
  operator: string;
  from: string;
  to: string;
  ids: bigint[];
  values: bigint[];
};

export type TransferSingleEvent = Event & {
  operator: string;
  from: string;
  to: string;
  id: bigint;
  value: bigint;
};

export type TrustEvent = Event & {
  truster: string;
  trustee: string;
  expiryTime: bigint;
};

export type URIEvent = Event & {
  value: string;
  id: bigint;
};



export type V2HubEvent =
  ApprovalForAllEvent |
  DiscountCostEvent |
  InviteHumanEvent |
  PersonalMintEvent |
  RegisterGroupEvent |
  RegisterHumanEvent |
  RegisterOrganizationEvent |
  StoppedEvent |
  TransferBatchEvent |
  TransferSingleEvent |
  TrustEvent |
  URIEvent;

export type ParsedV2HubEvent<T extends V2HubEvent> = ParsedEvent<T>;

const parseApprovalForAllEvent = (log: ethers.LogDescription): ApprovalForAllEvent => ({
  account: getAddress(log.args.getValue('account')),
  operator: getAddress(log.args.getValue('operator')),
  approved: log.args.getValue('approved')
});

const parseDiscountCostEvent = (log: ethers.LogDescription): DiscountCostEvent => ({
  account: getAddress(log.args.getValue('account')),
  id: BigInt(log.args.getValue('id')),
  discountCost: BigInt(log.args.getValue('discountCost'))
});

const parseInviteHumanEvent = (log: ethers.LogDescription): InviteHumanEvent => ({
  inviter: getAddress(log.args.getValue('inviter')),
  invited: getAddress(log.args.getValue('invited'))
});

const parsePersonalMintEvent = (log: ethers.LogDescription): PersonalMintEvent => ({
  human: getAddress(log.args.getValue('human')),
  amount: BigInt(log.args.getValue('amount')),
  startPeriod: BigInt(log.args.getValue('startPeriod')),
  endPeriod: BigInt(log.args.getValue('endPeriod'))
});

const parseRegisterGroupEvent = (log: ethers.LogDescription): RegisterGroupEvent => ({
  group: getAddress(log.args.getValue('group')),
  mint: getAddress(log.args.getValue('mint')),
  treasury: getAddress(log.args.getValue('treasury')),
  name: log.args.getValue('name'),
  symbol: log.args.getValue('symbol')
});

const parseRegisterHumanEvent = (log: ethers.LogDescription): RegisterHumanEvent => ({
  avatar: getAddress(log.args.getValue('avatar'))
});

const parseRegisterOrganizationEvent = (log: ethers.LogDescription): RegisterOrganizationEvent => ({
  organization: getAddress(log.args.getValue('organization')),
  name: log.args.getValue('name')
});

const parseStoppedEvent = (log: ethers.LogDescription): StoppedEvent => ({
  avatar: getAddress(log.args.getValue('avatar'))
});

const parseTransferBatchEvent = (log: ethers.LogDescription): TransferBatchEvent => ({
  operator: getAddress(log.args.getValue('operator')),
  from: getAddress(log.args.getValue('from')),
  to: getAddress(log.args.getValue('to')),
  ids: log.args.getValue('ids'),
  values: log.args.getValue('values')
});

const parseTransferSingleEvent = (log: ethers.LogDescription): TransferSingleEvent => ({
  operator: getAddress(log.args.getValue('operator')),
  from: getAddress(log.args.getValue('from')),
  to: getAddress(log.args.getValue('to')),
  id: BigInt(log.args.getValue('id')),
  value: BigInt(log.args.getValue('value'))
});

const parseTrustEvent = (log: ethers.LogDescription): TrustEvent => ({
  truster: getAddress(log.args.getValue('truster')),
  trustee: getAddress(log.args.getValue('trustee')),
  expiryTime: BigInt(log.args.getValue('expiryTime'))
});

const parseURIEvent = (log: ethers.LogDescription): URIEvent => ({
  value: log.args.getValue('value'),
  id: BigInt(log.args.getValue('id'))
});



export class V2HubEvents implements EventDecoder {
  private readonly contractInterface: ethers.Interface = new ethers.Interface(contractAbi);

  decodeEventData<T extends Event>(log: {
    topics: string[],
    data: string
  }): ParsedEvent<T> | null {
    const decoded = this.contractInterface.parseLog(log);
    if (!decoded) {
      return null;
    }

    let eventData: any;
    switch (decoded.name) {
      case 'ApprovalForAll':
        eventData = parseApprovalForAllEvent(decoded);
        break;
      case 'DiscountCost':
        eventData = parseDiscountCostEvent(decoded);
        break;
      case 'InviteHuman':
        eventData = parseInviteHumanEvent(decoded);
        break;
      case 'PersonalMint':
        eventData = parsePersonalMintEvent(decoded);
        break;
      case 'RegisterGroup':
        eventData = parseRegisterGroupEvent(decoded);
        break;
      case 'RegisterHuman':
        eventData = parseRegisterHumanEvent(decoded);
        break;
      case 'RegisterOrganization':
        eventData = parseRegisterOrganizationEvent(decoded);
        break;
      case 'Stopped':
        eventData = parseStoppedEvent(decoded);
        break;
      case 'TransferBatch':
        eventData = parseTransferBatchEvent(decoded);
        break;
      case 'TransferSingle':
        eventData = parseTransferSingleEvent(decoded);
        break;
      case 'Trust':
        eventData = parseTrustEvent(decoded);
        break;
      case 'URI':
        eventData = parseURIEvent(decoded);
        break;
      default:
        return null;
    }

    return {
      name: decoded.name,
      data: eventData
    };
  }
}
