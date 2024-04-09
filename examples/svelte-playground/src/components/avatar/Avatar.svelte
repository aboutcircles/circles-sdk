<script lang="ts">
  import AvatarInfo from './AvatarInfo.svelte';
  import AvatarActions from './AvatarActions.svelte';
  import { Avatar } from '@circles-sdk/sdk/dist/index.js';

  export let avatar: Avatar;

</script>
<div>
  <AvatarInfo {avatar} />
  <AvatarActions {avatar} />
</div>