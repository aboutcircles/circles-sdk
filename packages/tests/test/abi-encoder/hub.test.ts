describe('Hub', () => {

  /**
   * An EOA or Safe that's not yet registered at the v2 hub.
   */
  const UNREGISTERED_AVATAR = "UNREGISTERED_AVATAR";
  /**
   * A REGISTERED_AVATAR is either one of these:
   * * REGISTERED_HUMAN | INVITED_HUMAN | INVITED_PAUSED_HUMAN | INVITED_ACTIVE_HUMAN
   * * REGISTERED_ORGANIZATION
   * * REGISTERED_GROUP | REGISTERED_CUSTOM_GROUP
   */
  const REGISTERED_AVATAR = "REGISTERED_AVATAR";
  /**
   * A REGISTERED_HUMAN is a human that has registered at the v2 hub.
   * INVITED_HUMAN are a specialization of REGISTERED_HUMAN.
   */
  const REGISTERED_HUMAN = "REGISTERED_HUMAN";
  /**
   * A REGISTERED_ORGANIZATION is an avatar that registered as organization at the v2 hub.
   */
  const REGISTERED_ORGANIZATION = "REGISTERED_ORGANIZATION";
  /**
   * A REGISTERED_GROUP is an avatar that registered as group at the v2 hub and uses the standard treasury.
   */
  const REGISTERED_GROUP = "REGISTERED_GROUP";
  /**
   * A REGISTERED_CUSTOM_GROUP is an avatar that registered as group at the v2 hub and uses a custom treasury.
   */
  const REGISTERED_CUSTOM_GROUP = "REGISTERED_CUSTOM_GROUP";
  /**
   * An INVITED_HUMAN is a human that has been invited to the v2 hub.
   * INVITED_PAUSED_HUMAN are a specialization of INVITED_HUMAN.
   * INVITED_ACTIVE_HUMAN are a specialization of INVITED_HUMAN.
   */
  const INVITED_HUMAN = "INVITED_HUMAN";
  /**
   * An INVITED_PAUSED_HUMAN is an INVITED_HUMAN that has an active v1 token.
   */
  const INVITED_PAUSED_HUMAN = "INVITED_PAUSED_HUMAN";
  /**
   * An INVITED_ACTIVE_HUMAN is an INVITED_HUMAN that has a stopped v1 token.
   */
  const INVITED_ACTIVE_HUMAN = "INVITED_ACTIVE_HUMAN";
  const V1_ACTIVE = "V1_ACTIVE";
  const V1_STOPPED = "V1_STOPPED";
  const V2_PAUSED = "V2_PAUSED";
  const V2_ACTIVE = "V2_ACTIVE";
  const V2_STOPPED = "V2_STOPPED";
  const MINTED_PERSONAL_CIRCLES = "MINT_PERSONAL_CIRCLES";

  const personalCirclesToken = "personal Circles token";
  const msgSender = "msg.sender";
  const v1 = "v1";
  const v2 = "v2";

  // TODO: Add expected events

  describe("state transitions", () => {
    describe(`${UNREGISTERED_AVATAR} to ${REGISTERED_AVATAR}`, () => {
      // A REGISTERED_AVATAR is either one of these:
      // * REGISTERED_HUMAN | INVITED_HUMAN | INVITED_PAUSED_HUMAN | INVITED_ACTIVE_HUMAN
      // * REGISTERED_ORGANIZATION
      // * REGISTERED_GROUP | REGISTERED_CUSTOM_GROUP
      // Any of these states can be reached only once per msg.sender.
      it(`can become a ${REGISTERED_HUMAN} (registerHuman)`, async () => {});
      it(`can become a ${REGISTERED_ORGANIZATION} (registerOrganization)`, async () => {});
      it(`can become a ${REGISTERED_GROUP} (registerGroup)`, async () => {});
      it(`can become a ${REGISTERED_CUSTOM_GROUP} (registerCustomGroup)`, async () => {});
      it(`only one path can be taken per ${msgSender}`, async () => {});
      it(`only if ${msgSender} is not already registered`, async () => {});

      describe(`${UNREGISTERED_AVATAR} to ${REGISTERED_HUMAN} (ON: registerHuman)`, () => {
        it("only before REGISTRATION_PERIOD_END", async () => {});
        it(`only if ${msgSender} has a token at the ${v1} hub`, async () => {});
        it(`only if ${msgSender}'s ${v1} token is ${V1_STOPPED}`, async () => {});
        it(`create a ${personalCirclesToken} for ${msgSender}`, async () => {});
      });

      // TODO: Are organizations or groups migrated from v1 to v2?
      describe(`${UNREGISTERED_AVATAR} to ${REGISTERED_ORGANIZATION} (ON: registerOrganization)`, () => {
      });

      describe(`${UNREGISTERED_AVATAR} to ${REGISTERED_GROUP} (ON: registerGroup)`, () => {
        it(`must have the standard treasury contract`, async () => {});
      });

      describe(`${UNREGISTERED_AVATAR} to ${REGISTERED_CUSTOM_GROUP} (ON: registerCustomGroup)`, () => {
        it(`must have a treasury contract`, async () => {});
        it(`can't have the standard treasury contract`, async () => {});
      });

      describe(`${UNREGISTERED_AVATAR} to ${INVITED_HUMAN} (ON: inviteHuman)`, () => {
        // An invitation is a special case of a registration.
        // It is executed by an INVITER to register an INVITEE.
        // The INVITER must be a REGISTERED_HUMAN and the INVITEE must be an UNREGISTERED_AVATAR.
        // When the INVITEE became an INVITED_HUMAN, the contract mints the INVITEE a welcome bonus consisting of the INVITED_HUMAN's personal Circles.
        // The INVITER is charged with the invitation fee.
        // TODO: Any avatar can invite any address (e.g. CREATE2 address with nothing deployed on yet)?.
        it(`only if INVITER (${msgSender}) is a ${REGISTERED_HUMAN}`, async () => {});
        it(`only if INVITEE is not already a ${REGISTERED_AVATAR}`, async () => {});
        it(`only if INVITER (${msgSender}) has enough ${personalCirclesToken}s to pay the invitation fee`, async () => {});
        it("mint INVITEE's welcome bonus", async () => {});
        it(`charge INVITER (${msgSender}) the invitation fee`, async () => {});
        it(`create a ${personalCirclesToken} for INVITEE`, async () => {});

        describe(`${UNREGISTERED_AVATAR} to ${INVITED_PAUSED_HUMAN} (ON: inviteHuman)`, () => {
          it(`only if INVITEE's ${v1} token is ${V1_ACTIVE}`, async () => {});
          it(`set INVITEE's ${personalCirclesToken}'s minting state to ${V2_PAUSED}`, async () => {});
        });

        describe(`${UNREGISTERED_AVATAR} to ${INVITED_ACTIVE_HUMAN} (ON: inviteHuman)`, () => {
          it(`only if INVITEE's ${v1} token is ${V1_STOPPED}`, async () => {});
          it(`set INVITEE's ${personalCirclesToken}'s minting state to ${V2_ACTIVE}`, async () => {});
        });
      });
    });

    describe(`(${REGISTERED_HUMAN} | ${INVITED_HUMAN}) to ${MINTED_PERSONAL_CIRCLES} (ON: personalMint)`, () => {
      it(`only if ${msgSender}'s ${v1} ${personalCirclesToken} is ${V1_STOPPED}`, async () => {});

      describe(`${INVITED_PAUSED_HUMAN} to ${INVITED_ACTIVE_HUMAN} (ON: personalMint)`, () => {
        // If a UNREGISTERED_HUMAN was invited to v2 but still had n active v1 token then the minting state of the personal Circles token is V2_PAUSED.
        // If the INVITEE's v1 token was stopped in the meantime then the minting state of the personal Circles token will be set to V2_ACTIVE.
        // TODO: Should this be a separate function or do we integrate it into personalMint()?
        it(`only if ${msgSender}'s ${personalCirclesToken}'s minting state is ${V2_PAUSED}`, async () => {});
        it(`set ${msgSender}'s ${personalCirclesToken}'s minting state to ${V2_ACTIVE}`, async () => {});
      });

      describe(`(${REGISTERED_HUMAN} | ${INVITED_ACTIVE_HUMAN}) to ${MINTED_PERSONAL_CIRCLES} (ON: personalMint)`, () => {
        // Every human with an active v2 token can mint max. two weeks worth of personal Circles tokens.
        it(`only if ${msgSender}'s ${personalCirclesToken} is ${V2_ACTIVE}`, async () => {});
        it(`mint as many ${personalCirclesToken}s as ${msgSender} has missed since the last mint`, async () => {});
        it(`mint max. two weeks worth of ${personalCirclesToken} for ${msgSender}`, async () => {});
        it(`set the lastMintTime of ${msgSender} to the current block time`, async () => {});
      });
    });

    describe(`Minting state of ${v1} Circles`, () => {
      it(`can become ${V1_ACTIVE}`, async () => {});
      it(`can become ${V1_STOPPED}`, async () => {});
      it(`can't become ${V1_ACTIVE} again once ${V1_STOPPED}`, async () => {});
    });

    describe(`Minting state of ${v2} Circles`, () => {
      it(`can become ${V2_PAUSED}`, async () => {});
      it(`can become ${V2_ACTIVE}`, async () => {});
      it(`can become ${V2_STOPPED}`, async () => {});
      it(`can't become ${V2_PAUSED} again once ${V2_ACTIVE}`, async () => {});
      it(`can't become ${V2_PAUSED} again once ${V2_STOPPED}`, async () => {});
      it(`can't become ${V2_ACTIVE} again once ${V2_STOPPED}`, async () => {});
    });

    describe(`${personalCirclesToken}s can be ${v1} or ${v2} tokens`, () => {
      it(`a ${V2_PAUSED} token can coexist with an ${V1_ACTIVE} token for the same ${REGISTERED_AVATAR}`, async () => {});
      it(`an ${V2_ACTIVE} token can coexist with a ${V1_STOPPED} token for a ${REGISTERED_AVATAR}`, async () => {});
      it(`an ${V2_ACTIVE} token cannot coexist with an ${V1_ACTIVE} token for the same ${REGISTERED_AVATAR}`, async () => {});
    });
  });
});
