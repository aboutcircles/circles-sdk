<script lang="ts">
  import { Avatar } from '@circles-sdk/sdk/dist/avatar';
  import ActionButton from '../common/ActionButton.svelte';
  import TrustRelations from './TrustRelations.svelte';
  import Collapsible from '../common/VerticalCollapsible.svelte';
  import TrustHistory from './TrustHistory.svelte';

  export let avatar: Avatar;

  let to: string;

  const trust = async () => {
    await avatar.trust(to);
  };

  const untrust = async () => {
    await avatar.untrust(to);
  };
</script>
<div class="form-group">
  <div class="form-group">
    <label for="from">From:</label>
    <input type="text" readonly class="form-control" id="from" name="from" placeholder="0x..."
           value={avatar.address}>
  </div>
  <div class="form-group">
    <label for="to">To:</label>
    <input type="text" class="form-control" id="to" name="to" placeholder="0x..." bind:value={to}>
  </div>
  <ActionButton action={trust}>
    Trust
  </ActionButton>
  <ActionButton action={untrust}>
    Untrust
  </ActionButton>

  <Collapsible label="Current" isOpen={false}>
    <TrustRelations {avatar} />
  </Collapsible>
  <Collapsible label="History" isOpen={false}>
    <TrustHistory {avatar} />
  </Collapsible>
</div>
