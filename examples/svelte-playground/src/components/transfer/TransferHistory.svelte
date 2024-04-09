<script lang="ts">
import TransferHistoryItemHeader from './TransferHistoryItemHeader.svelte';
import VerticalLayout from '../common/VerticalLayout.svelte';
import TransferHistoryItem from './TransferHistoryItem.svelte';
import { Avatar } from '@circles-sdk/sdk/dist/avatar';

export let avatar:Avatar;
</script>

<VerticalLayout>
  <TransferHistoryItemHeader />
  {#if avatar}
    {#await avatar.v1Data.queryAllTransfers(avatar.address)}
      <p>Loading...</p>
    {:then transferHistory}
      {#each transferHistory as item}
        <TransferHistoryItem from={item.fromAddress}
                             to={item.toAddress}
                             amount={item.amount}
                             timestamp={item.timestamp}
                             txHash={item.transactionHash} />
      {/each}
    {/await}
  {/if}
</VerticalLayout>