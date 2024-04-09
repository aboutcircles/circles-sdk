/*
findTokenHoldings
 */

import { V2Data } from '@circles-sdk/sdk';

describe('V2Data', () => {
  describe('Query trusts', () => {
    it('returns trusts', async () => {
      const v2Data = new V2Data(`http://localhost:8545`, `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`);
      const trusts = await v2Data.findTokenHoldings(`0xAE8d9be166268B26Cbd4a2DDaEDb7DeE8dba0f6d`);
      for (const trust of trusts) {
        console.log(trust);
      }
    }, 15 * 60 * 60 * 1000);
  });
});