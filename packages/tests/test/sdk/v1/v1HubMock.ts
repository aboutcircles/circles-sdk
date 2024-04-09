export const v1HubMock = {
  organizations: jest.fn(),
  userToToken: jest.fn(),
  v1Token: jest.fn((address: string) => ({
    stopped: jest.fn()
  }))
};