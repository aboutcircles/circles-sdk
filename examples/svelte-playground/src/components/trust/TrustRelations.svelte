<script lang="ts">
  import { Avatar } from '@circles-sdk/sdk/dist/avatar';

  export let avatar: Avatar;
</script>
{#if avatar}
  {#await avatar.v1Data.queryTrustRelations(avatar.address)}
    <p>Loading...</p>
  {:then trustRelations}
    <pre>{JSON.stringify(trustRelations, null, 2)}</pre>
  {/await}
{/if}