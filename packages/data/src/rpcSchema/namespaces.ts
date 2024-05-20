export type Namespace = 'V_Crc' | 'CrcV1' | 'V_CrcV1' | 'CrcV2' | 'V_CrcV2';
export type Table = V1Table | V_V1Table | V2Table | V_V2Table;
export type V1Table = 'HubTransfer' | 'Trust' | 'Transfer' | 'Signup' | 'OrganizationSignup';
export type V_V1Table = 'Avatars' | 'TrustRelations';
export type V2Table = 'ApprovalForAll' | 'DiscountCost' | 'InviteHuman' | 'PersonalMint' | 'RegisterGroup' | 'RegisterHuman' | 'RegisterOrganization' | 'RegisterShortName' | 'Stopped' | 'TransferBatch' | 'TransferSingle' | 'Trust' | 'UpdateMetadataDigest' | 'URI';
export type V_V2Table = 'Avatars' | 'TrustRelations' | 'Transfers';