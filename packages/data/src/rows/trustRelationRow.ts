import { Address } from "@circles-sdk/utils";

/**
 * A trust relation between two avatars (v2 only).
 */
export type TrustRelation =
  'trusts'
  | 'trustedBy'
  | 'mutuallyTrusts'
  | 'selfTrusts';

/**
 * A single avatar-to-avatar v2 trust relation that can be either one-way or mutual.
 */
export interface TrustRelationRow {
  /**
   * The avatar.
   */
  subjectAvatar: Address;

  /**
   * The trust relation.
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
}