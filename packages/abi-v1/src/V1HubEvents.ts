import { ethers, getAddress } from 'ethers';
import { Event, EventDecoder, ParsedEvent } from './common';
import contractAbi from './V1HubAbi.json';

export type HubTransferEvent = Event & {
  from: string;
  to: string;
  amount: bigint;
};

export type OrganizationSignupEvent = Event & {
  organization: string;
};

export type SignupEvent = Event & {
  user: string;
  token: string;
};

export type TrustEvent = Event & {
  canSendTo: string;
  user: string;
  limit: bigint;
};

export type V1HubEvent =
  HubTransferEvent |
  OrganizationSignupEvent |
  SignupEvent |
  TrustEvent;

export type ParsedV1HubEvent<T extends V1HubEvent> = ParsedEvent<T>;

const parseHubTransferEvent = (log: ethers.LogDescription): HubTransferEvent => ({
  from: getAddress(log.args.getValue('from')),
  to: getAddress(log.args.getValue('to')),
  amount: BigInt(log.args.getValue('amount'))
});

const parseOrganizationSignupEvent = (log: ethers.LogDescription): OrganizationSignupEvent => ({
  organization: getAddress(log.args.getValue('organization'))
});

const parseSignupEvent = (log: ethers.LogDescription): SignupEvent => ({
  user: getAddress(log.args.getValue('user')),
  token: getAddress(log.args.getValue('token'))
});

const parseTrustEvent = (log: ethers.LogDescription): TrustEvent => ({
  canSendTo: getAddress(log.args.getValue('canSendTo')),
  user: getAddress(log.args.getValue('user')),
  limit: BigInt(log.args.getValue('limit'))
});


export class V1HubEvents implements EventDecoder {
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
      case 'HubTransfer':
        eventData = parseHubTransferEvent(decoded);
        break;
      case 'OrganizationSignup':
        eventData = parseOrganizationSignupEvent(decoded);
        break;
      case 'Signup':
        eventData = parseSignupEvent(decoded);
        break;
      case 'Trust':
        eventData = parseTrustEvent(decoded);
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
