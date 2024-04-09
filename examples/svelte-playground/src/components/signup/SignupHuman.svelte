<script lang="ts">
  import {Avatar} from "@circles-sdk/sdk/dist/avatar";
  import ActionButton from '../common/ActionButton.svelte';

  export let avatar: Avatar;

  let profileCID: string = "QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB";

  const signup = async () => {
    await avatar.registerHuman(profileCID);
  }
</script>
<div class="form-group">
  <div class="form-group">
    <label for="to">Profile CID</label>
    <input type="text" class="form-control" id="to" name="to" placeholder="0x..." bind:value={profileCID}>
  </div>
  <ActionButton action={signup}>
    Signup Human @ v2
  </ActionButton>
</div>
