<script lang="ts">
  import { Avatar } from '@circles-sdk/sdk/dist/avatar';
  import ActionButton from '../common/ActionButton.svelte';

  export let avatar: Avatar;

  let profileCID: string = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
  let name: string = '';
  let symbol: string = '';
  let mintPolicy: string = '';

  const signup = async () => {
    await avatar.registerGroup(mintPolicy, name, symbol, profileCID);
  };
</script>
<div class="form-group">
  <div class="form-group">
    <label for="mintPolicy">Mint policy</label>
    <input type="text" class="form-control" id="mintPolicy" name="mintPolicy" placeholder="0x..."
           bind:value={mintPolicy}>
  </div>
  <div class="form-group">
    <label for="cid">Profile CID</label>
    <input type="text" class="form-control" id="cid" name="cid" placeholder="Qm..."
           bind:value={profileCID}>
  </div>
  <div class="form-group">
    <label for="name">Name</label>
    <input type="text" class="form-control" id="name" name="name" placeholder="My Group"
           bind:value={name}>
  </div>
  <div class="form-group">
    <label for="symbol">Symbol</label>
    <input type="text" class="form-control" id="symbol" name="symbol" placeholder="SYMBOL"
           bind:value={symbol}>
  </div>
  <ActionButton action={signup}>
    Signup Group @ v2
  </ActionButton>
</div>
