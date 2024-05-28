import { TransactionReceipt } from 'ethers';
import { EventDecoder, ParsedEvent } from './common';

export const processEvents = async (receipt: TransactionReceipt, eventDecoder: EventDecoder): Promise<ParsedEvent<any>[]> => {
  const parsedEvents = await Promise.all(
    receipt.logs
      .map(log => eventDecoder.decodeEventData({
        topics: <string[]>log.topics,
        data: log.data
      })));

  return parsedEvents.filter(e => e !== null).map(e => e!);
};