<script lang="ts">
  import { Avatar } from '@circles-sdk/sdk/dist';
  import { AvatarState } from '@circles-sdk/sdk/dist/avatar';
  import Collapsible from '../common/VerticalCollapsible.svelte';
  import ActionButton from '../common/ActionButton.svelte';
  import Transfer from '../transfer/Transfer.svelte';
  import Trust from '../trust/Trust.svelte';
  import InviteHuman from '../InviteHuman.svelte';
  import Signup from '../signup/Signup.svelte';
  import GroupMint from '../group/GroupMint.svelte';
  import VerticalLayout from '../common/VerticalLayout.svelte';

  export let avatar: Avatar;

  $: avatarState = avatar.state;
  $: isRegistered = $avatarState && avatar.isRegistered();
  $: canTrust = $avatarState && avatar.isRegistered();
  $: canTransfer = $avatarState && avatar.canTransfer();
  $: canInvite = $avatarState && avatar.canInvite();
  $: canMint = $avatarState && avatar.canMint();
</script>
<Collapsible label="Signup" isOpen={!isRegistered || $avatarState === AvatarState.V1_StoppedHuman}>
  <Signup {avatar} />
</Collapsible>
<Collapsible label="Actions" isOpen={isRegistered}>
  <ActionButton disabled={$avatarState !== AvatarState.V1_Human}
                action={avatar.stopV1}>Stop v1
  </ActionButton>
  <Collapsible label="Invite" isOpen={false} isLocked={!canInvite}>
    <InviteHuman avatar={avatar} />
  </Collapsible>
  <Collapsible label="Mint" isOpen={false} isLocked={!canMint}>
    <VerticalLayout>
      <div>
        <ActionButton disabled={!canMint}
                      action={avatar.personalMint}>Personal mint
        </ActionButton>
      </div>
      <GroupMint avatar={avatar} />
    </VerticalLayout>
  </Collapsible>
  <Collapsible isLocked={!canTransfer} label="Transfer" isOpen={false}>
    <Transfer avatar={avatar} />
  </Collapsible>
  <Collapsible isLocked={!canTrust} label="Trust" isOpen={false}>
    <Trust avatar={avatar} />
  </Collapsible>
</Collapsible>