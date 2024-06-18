/**
 * A trust relation between two avatars.
 */
export type TrustRelation =
  'trusts'
  | 'trustedBy'
  | 'mutuallyTrusts'
  | 'selfTrusts';

/**
 * A single avatar to avatar trust relation that can be either one-way or mutual.
 */
export interface TrustRelationRow {
  /**
   * The avatar.
   */
  subjectAvatar: string;
  /**
   * The trust relation.
   */
  relation: TrustRelation;
  /**
   * Who's trusted by or is trusting the avatar.
   */
  objectAvatar: string;

  /**
   * When the last trust relation (in either direction) was last established.
   */
  timestamp: number;
}