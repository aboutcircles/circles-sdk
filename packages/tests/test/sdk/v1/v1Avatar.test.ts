import { V1Avatar, V1AvatarState } from '@circles-sdk/sdk';
import { ethers } from 'ethers';
import { generateRandomAddress } from '../../util';
import { v1HubMock } from './v1HubMock';
import { mockProvider } from '../mockProvider';

describe('V1Avatar', () => {
  const avatarAddress = generateRandomAddress();
  const tokenAddress = generateRandomAddress();

  describe('initialize', () => {
    beforeEach(() => {
      (v1HubMock.organizations as jest.Mock).mockClear();
      (v1HubMock.userToToken as jest.Mock).mockClear();
      (v1HubMock.v1Token as jest.Mock).mockClear();
    });

    it('initializes as an unregistered user', async () => {
      // does not have an entry in the organizations mapping
      (v1HubMock.organizations as jest.Mock).mockResolvedValue(false);
      // does not have a token
      (v1HubMock.userToToken as jest.Mock).mockResolvedValue(ethers.ZeroAddress);

      const avatar = new V1Avatar((v1HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V1AvatarState.Unregistered);
    });

    it('initializes as a human', async () => {
      // has a token
      (v1HubMock.userToToken as jest.Mock).mockResolvedValue(tokenAddress);
      // token is not stopped
      (v1HubMock.v1Token as jest.Mock).mockReturnValue({
        stopped: jest.fn().mockResolvedValue(false)
      });

      const avatar = new V1Avatar((v1HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V1AvatarState.Human);
    });


    it('initializes as a stopped human', async () => {
      // has a token
      (v1HubMock.userToToken as jest.Mock).mockResolvedValue(tokenAddress);
      // token is stopped
      (v1HubMock.v1Token as jest.Mock).mockReturnValue({
        stopped: jest.fn().mockResolvedValue(true)
      });

      const avatar = new V1Avatar((v1HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V1AvatarState.StoppedHuman);
    });

    it('initializes as an organization', async () => {
      // has an entry in the organizations mapping
      (v1HubMock.organizations as jest.Mock).mockResolvedValue(true);
      // does not have a token
      (v1HubMock.userToToken as jest.Mock).mockResolvedValue(ethers.ZeroAddress);

      const avatar = new V1Avatar((v1HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V1AvatarState.Organization);
    });
  });
});
