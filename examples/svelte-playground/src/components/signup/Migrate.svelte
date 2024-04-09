<script lang="ts">
  import ActionButton from '../common/ActionButton.svelte';
  import { Avatar } from '@circles-sdk/sdk';

  export let avatar: Avatar;

  let profileCID: string = "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB";

  const migrate = async () => {
    await avatar.migrateAvatar(profileCID);
  }
</script>
<div class="form-group">
  <div class="form-group">
    <label for="to">Profile CID</label>
    <input type="text" class="form-control" id="to" name="to" placeholder="0x..." bind:value={profileCID}>
  </div>
  <ActionButton action={migrate}>
    Migrate to v2
  </ActionButton>
</div>
