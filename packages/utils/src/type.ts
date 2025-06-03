export type Address = `0x${string}`;

// Token type enum
export enum BaseGroupMintType {
  ERC1155 = 'ERC1155',
  INFLATIONARY = 'TYPE_INFLATIONARY',
  DEMURRAGE = 'TYPE_DEMURRAGE'
}