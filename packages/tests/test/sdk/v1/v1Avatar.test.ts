import { CirclesConfig, Sdk, SdkContractRunner } from '@circles-sdk/sdk';
import { ethers } from 'ethers';
import { parseError } from '@circles-sdk/sdk';

describe('V1Avatar', () => {
  const chainConfig: CirclesConfig = {
    migrationAddress: '0x0A1D308a39A6dF8972A972E586E4b4b3Dc73520f',
    circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
    pathfinderUrl: 'https://pathfinder.aboutcircles.com',
    v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
    v2HubAddress: '0xFFfbD3E62203B888bb8E09c1fcAcE58242674964'
  };

  describe('initialize', () => {
    it('should initialize the avatar', async () => {

      const error = '0xde84eec90000000000000000000000002dadafd4dcb8ac187a90e04eeadf614de69dee73000000000000000000000000d68193591d47740e51dfbc410da607a351b565860000000000000000000000000000000000000000000000000000000000000001';
      const decoded = parseError(error);
      console.log(decoded);

    });
  });
});
