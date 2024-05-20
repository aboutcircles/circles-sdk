import { ethers, getAddress } from 'ethers';
import { Event, EventDecoder, ParsedEvent } from './common';
import contractAbi from './V1TokenAbi.json';

export type ApprovalEvent = Event & {
  owner: string;
  spender: string;
  value: bigint;
};

export type TransferEvent = Event & {
  from: string;
  to: string;
  value: bigint;
};


export type V1TokenEvent =
  ApprovalEvent |
  TransferEvent;

export type ParsedV1TokenEvent<T extends V1TokenEvent> = ParsedEvent<T>;

const parseApprovalEvent = (log: ethers.LogDescription): ApprovalEvent => ({
  owner: getAddress(log.args.getValue('owner')),
  spender: getAddress(log.args.getValue('spender')),
  value: BigInt(log.args.getValue('value'))
});

const parseTransferEvent = (log: ethers.LogDescription): TransferEvent => ({
  from: getAddress(log.args.getValue('from')),
  to: getAddress(log.args.getValue('to')),
  value: BigInt(log.args.getValue('value'))
});


export class V1TokenEvents implements EventDecoder {
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
      case 'Approval':
        eventData = parseApprovalEvent(decoded);
        break;
      case 'Transfer':
        eventData = parseTransferEvent(decoded);
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
