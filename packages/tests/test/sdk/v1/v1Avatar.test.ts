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

      const error = "0x071335d8000000000000000000000000b49a7bccd607ef482b71988a11f65fece980eca50000000000000000000000004f24c2cd960d44f76b79f963706602872205db8b";
      parseError(error);

      const wallet = ethers.Wallet.createRandom();
      const sdk = new Sdk(chainConfig, wallet);
      const avatar = await sdk.getAvatar('0xD68193591d47740E51dFBc410da607A351b56586');
      const trustRelations = await avatar.getTrustRelations();
      console.log(trustRelations);
    });
  });
});
