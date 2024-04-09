import { generateRandomAddress } from '../../util';
import { V2Avatar, V2AvatarState } from '@circles-sdk/sdk';
import { mockProvider } from '../mockProvider';
import { v2HubMock } from './v2HubMock';

describe('V2Avatar', () => {
  const avatarAddress = generateRandomAddress();

  describe('initialize', () => {
    beforeEach(() => {
      (v2HubMock.isHuman as jest.Mock).mockClear();
      (v2HubMock.isOrganization as jest.Mock).mockClear();
      (v2HubMock.isGroup as jest.Mock).mockClear();
    });

    it('initializes as an unregistered user', async () => {
      (v2HubMock.isHuman as jest.Mock).mockResolvedValue(false);
      (v2HubMock.isOrganization as jest.Mock).mockResolvedValue(false);
      (v2HubMock.isGroup as jest.Mock).mockResolvedValue(false);

      const avatar = new V2Avatar((v2HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V2AvatarState.Unregistered);
    });

    it('initializes as a human', async () => {
      (v2HubMock.isHuman as jest.Mock).mockResolvedValue(true);
      (v2HubMock.isOrganization as jest.Mock).mockResolvedValue(false);
      (v2HubMock.isGroup as jest.Mock).mockResolvedValue(false);

      const avatar = new V2Avatar((v2HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V2AvatarState.Human);
    });

    it('initializes as an organization', async () => {
      (v2HubMock.isHuman as jest.Mock).mockResolvedValue(false);
      (v2HubMock.isOrganization as jest.Mock).mockResolvedValue(true);
      (v2HubMock.isGroup as jest.Mock).mockResolvedValue(false);

      const avatar = new V2Avatar((v2HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V2AvatarState.Organization);
    });

    it('initializes as a group', async () => {
      (v2HubMock.isHuman as jest.Mock).mockResolvedValue(false);
      (v2HubMock.isOrganization as jest.Mock).mockResolvedValue(false);
      (v2HubMock.isGroup as jest.Mock).mockResolvedValue(true);

      const avatar = new V2Avatar((v2HubMock as any), avatarAddress, mockProvider);
      await avatar.initialize();

      expect(avatar.state.value).toBe(V2AvatarState.Group);
    });
  });
});
