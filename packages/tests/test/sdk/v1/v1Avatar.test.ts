import { ChainConfig, Sdk } from '@circles-sdk/sdk';
import { ethers } from 'ethers';
import { parseError } from '@circles-sdk/sdk';

describe('V1Avatar', () => {
  const chainConfig: ChainConfig = {
    migrationAddress: '0x0A1D308a39A6dF8972A972E586E4b4b3Dc73520f',
    circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
    pathfinderUrl: 'https://pathfinder.aboutcircles.com',
    v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
    v2HubAddress: '0xFFfbD3E62203B888bb8E09c1fcAcE58242674964'
  };

  describe('initialize', () => {
    it('should initialize the avatar', async () => {

      const error = '0x03dee4c500000000000000000000000062f1e5d9d635cda3b61d1397f41f465e2fe37a67000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005f2d30a88a3347400000000000000000000000062f1e5d9d635cda3b61d1397f41f465e2fe37a67';
      const decoded = parseError(error);
      console.log(decoded);

      const wallet = ethers.Wallet.createRandom();
      const sdk = new Sdk(chainConfig, {
        runner: wallet,
        address: wallet.address
      });
      const avatar = await sdk.getAvatar('0xD68193591d47740E51dFBc410da607A351b56586');
      const trustRelations = await avatar.getTrustRelations();
      console.log(trustRelations);
    });
  });
});
