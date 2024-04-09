<script>
  import { AvatarState } from '@circles-sdk/sdk/dist/avatar.js';
  import SignupOrganization from './SignupOrganization.svelte';
  import Collapsible from '../common/VerticalCollapsible.svelte';
  import ActionButton from '../common/ActionButton.svelte';
  import SignupGroup from './SignupGroup.svelte';
  import SignupHuman from './SignupHuman.svelte';
  import Migrate from './Migrate.svelte';

  export let avatar;

  const signupV1Human = async () => {
    await avatar.v1Hub.signup();
    await avatar.initialize();
  };
  const signupV1Org = async () => {
    await avatar.v1Hub.organizationSignup();
    await avatar.initialize();
  };

  $: avatarState = avatar.state;
  $: isV1 = $avatarState === AvatarState.V1_Human
    || $avatarState === AvatarState.V1_StoppedHuman_and_V2_Human
    || $avatarState === AvatarState.V1_StoppedHuman
    || $avatarState === AvatarState.V1_Organization;
  $: isV2 = $avatarState === AvatarState.V2_Human
    || $avatarState === AvatarState.V2_Group
    || $avatarState === AvatarState.V2_Organization
    || $avatarState === AvatarState.V1_StoppedHuman_and_V2_Human;
</script>
<div>
  <ActionButton disabled={isV1}
                action={signupV1Human}>Signup Human @ v1
  </ActionButton>

  <ActionButton disabled={isV1}
                action={signupV1Org}>Signup Organization @ v1
  </ActionButton>
  <Collapsible label="Signup Human @ v2"
               isLocked={isV2 || $avatarState !== AvatarState.V1_StoppedHuman}>
    <SignupHuman {avatar} />
  </Collapsible>
  <Collapsible label="Signup Organization @ v2"
               isLocked={$avatarState !== AvatarState.Unregistered}>
    <SignupOrganization {avatar} />
  </Collapsible>
  <Collapsible label="Signup Group @ v2" isLocked={$avatarState !== AvatarState.Unregistered}>
    <SignupGroup {avatar} />
  </Collapsible>
  <Collapsible label="Migrate to v2" isLocked={$avatarState !== AvatarState.V1_Human}>
    <Migrate {avatar} />
  </Collapsible>
</div>