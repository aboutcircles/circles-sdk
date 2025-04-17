import {CirclesConfig} from "./circlesConfig";

export const circlesConfig: { [chainId: number]: CirclesConfig } = {
  100: {
    circlesRpcUrl: "https://rpc.aboutcircles.com/",
    pathfinderUrl: "https://pathfinder.aboutcircles.com",
    profileServiceUrl: "https://rpc.aboutcircles.com/profiles/",
    v1HubAddress: "0x29b9a7fbb8995b2423a71cc17cf9810798f6c543",
    v2HubAddress: "0xc12C1E50ABB450d6205Ea2C3Fa861b3B834d13e8",
    nameRegistryAddress: "0xA27566fD89162cC3D40Cb59c87AAaA49B85F3474",
    v1NameRegistryAddress: "0x1eaD7F904F6fFC619c58B85e04F890b394E08172",
    migrationAddress: "0xD44B8dcFBaDfC78EA64c55B705BFc68199B56376",
    baseGroupMintPolicy: "0xcCa27c26CF7BAC2a9928f42201d48220F0e3a549",
    standardTreasury: "0x08F90aB73A515308f03A718257ff9887ED330C6e",
    coreMembersGroupDeployer: "0xFEca40Eb02FB1f4F5F795fC7a03c1A27819B1Ded",
    baseGroupDeployer: "0xD0B5Bd9962197BEaC4cbA24244ec3587f19Bd06d"
  }
}
