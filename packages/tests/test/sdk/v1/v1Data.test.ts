import { V1Data } from '@circles-sdk/sdk';

describe('V1Data', () => {
  describe('Query trusts', () => {
    it('returns trusts', async () => {
      const v1Data = new V1Data(`https://circles-rpc.circlesubi.id`, `0x29b9a7fBb8995b2423a71cC17cf9810798F6C543`);
      const trusts = v1Data.queryTrustOnChainAsyncIterator(`0xDE374ece6fA50e781E81Aac78e811b33D16912c7`, 12541946, 16);
      for await (const trust of trusts) {
        for (const key in trust) {
          // console.log(key, trust[key]);
        }
      }
    }, 15 * 60 * 60 * 1000);
  });
});