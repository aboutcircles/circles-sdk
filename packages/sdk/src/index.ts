// Deprecation warning - show once when module is first imported
console.warn(
  '\nDEPRECATION NOTICE:\n' +
  'This package is deprecated. Please migrate to @aboutcircles/sdk.\n' +
  'See migration guide: https://github.com/aboutcircles/sdk/blob/main/MIGRATION_GUIDE.md\n'
);

export { Avatar } from './avatar';
export { Observable } from '@circles-sdk/data';
export { Sdk } from './sdk';
export { V1Avatar } from './v1/v1Avatar';
export { CirclesConfig } from './circlesConfig';
export { AvatarRow, TrustListRow, TrustRelationRow } from '@circles-sdk/data';
export { AvatarInterface, AvatarInterfaceV2 } from './AvatarInterface';
export { V1Pathfinder } from './v1/pathfinderV1';
export { MaxFlowResponse, TransferPathStep } from './pathfinderTypes'
export { circlesConfig } from './config';