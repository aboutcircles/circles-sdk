<script lang="ts">
    import {Avatar} from "@circles-sdk/sdk/dist/avatar";
    import ActionButton from "../common/ActionButton.svelte";
    import TransferHistory from './TransferHistory.svelte';
    import Collapsible from '../common/VerticalCollapsible.svelte';

    export let avatar: Avatar;

    let to: string;
    let amount: string;

    const transfer = async () => {
        await avatar.transfer(to, BigInt(amount));
    }
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
    <div class="form-group">
        <label for="amount">Amount:</label>
        <input type="text" class="form-control" id="amount" name="amount" placeholder="0" bind:value={amount}>
    </div>
    <ActionButton action={transfer}>
        Transfer
    </ActionButton>
</div>
<Collapsible label="History" isOpen={false}>
  <TransferHistory {avatar} />
</Collapsible>
