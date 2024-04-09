<script lang="ts">
  import { Avatar } from '@circles-sdk/sdk/dist/avatar';
  import ActionButton from '../common/ActionButton.svelte';

  export let avatar: Avatar;

  let profileCID: string = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
  let name: string = '';

  const signup = async () => {
    await avatar.registerOrganization(name, profileCID);
  };
</script>
<div class="form-group">
  <div class="form-group">
    <label for="to">Profile CID</label>
    <input type="text" class="form-control" id="to" name="to" placeholder="Qm..."
           bind:value={profileCID}>
  </div>
  <div class="form-group">
    <label for="name">Name</label>
    <input type="text" class="form-control" id="name" name="name" placeholder="My Org"
           bind:value={name}>
  </div>
  <ActionButton action={signup}>
    Signup Organization @ v2
  </ActionButton>
</div>
