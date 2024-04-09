<script lang="ts">
  import { Avatar } from '@circles-sdk/sdk/dist/avatar';
  import VerticalLayout from '../common/VerticalLayout.svelte';
  import TrustHistoryItemHeader from './TrustHistoryItemHeader.svelte';
  import TrustHistoryItem from './TrustHistoryItem.svelte';

  export let avatar: Avatar;
</script>

<VerticalLayout>
  <TrustHistoryItemHeader />
  {#if avatar}
    {#await avatar.v1Data.queryAllTrusts(avatar.address)}
      <p>Loading...</p>
    {:then transferHistory}
      {#each transferHistory as item}
        <TrustHistoryItem
          user={item.userAddress}
          canSendTo={item.canSendToAddress}
          limit={item.limit}
          txHash={item.transactionHash}
          timestamp={item.timestamp}
          />
      {/each}
    {/await}
  {/if}
</VerticalLayout>
