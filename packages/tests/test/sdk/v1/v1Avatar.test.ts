import { parseError } from '@circles-sdk/sdk';

describe('error decoder', () => {
  it('should decode error codes', async () => {
    const error = '0xde84eec90000000000000000000000002dadafd4dcb8ac187a90e04eeadf614de69dee73000000000000000000000000d68193591d47740e51dfbc410da607a351b565860000000000000000000000000000000000000000000000000000000000000001';
    const decoded = parseError(error);
    console.log(decoded);
  });
});
