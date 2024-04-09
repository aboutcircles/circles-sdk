<script lang="ts">
  import HorizontalLayout from '../common/HorizontalLayout.svelte';
  import ActionButton from '../common/ActionButton.svelte';
  import { Avatar } from '@circles-sdk/sdk';

  let canMint = true;
  let group: string = '';
  let amount: number = 0;

  export let avatar: Avatar;

  async function groupMint() {
    const collateral: string[] = [avatar.address];
    const amounts: bigint[] = [await avatar.getTokenBalance()];
    const data: Uint8Array = new Uint8Array(0);
    const groupMintTxReceipt = await avatar.groupMint(group, collateral, amounts, data);
  }

</script>
<div class="form-group">
  <div class="form-group">
    <label for="group">Group</label>
    <input type="text" class="form-control" id="group" name="group" placeholder="0x..."
           bind:value={group}>
  </div>
  <div class="form-group">
    <label for="amount">Amount</label>
    <input type="number" class="form-control" id="amount" name="amount" placeholder="0"
           bind:value={amount}>
  </div>
</div>
<HorizontalLayout>
  <ActionButton disabled={!canMint}
                action={groupMint}>Group mint
  </ActionButton>
</HorizontalLayout>