import { Address } from "@circles-sdk/utils";

/**
 * A trust relation between two avatars.
 */
export type TrustRelation =
  'trusts'
  | 'trustedBy'
  | 'mutuallyTrusts'
  | 'selfTrusts'
  | 'variesByVersion';

/**
 * A single avatar-to-avatar trust relation that can be either one-way, mutual, or version-specific.
 */
export interface TrustRelationRow {
  /**
   * The avatar.
   */
  subjectAvatar: Address;

  /**
   * The trust relation.
   * Can be one of the defined TrustRelation values or "variesByVersion" for mixed states across versions.
   */
  relation: TrustRelation;

  /**
   * Who's trusted by or is trusting the avatar.
   */
  objectAvatar: Address;

  /**
   * When the last trust relation (in either direction) was established.
   */
  timestamp: number;

  /**
   * The versions involved in this trust relation.
   */
  versions: number[];

  /**
   * A map of version-specific trust relations, providing granular details per version.
   */
  versionSpecificRelations?: { [version: number]: TrustRelation };
}