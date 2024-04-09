<script lang="ts" context="module">
  import { Avatar } from '@circles-sdk/sdk/dist';
  import { get, writable } from 'svelte/store';
  import type { AvatarEvent } from '@circles-sdk/sdk/dist/avatar';
  import { onMount } from 'svelte';


  let events = writable<AvatarEvent[]>([]);

  export function subscribeAvatar(avatar: Avatar) {
    avatar.lastEvent.subscribe((event) => {
      const e = get(events);
      e.unshift(event);
      events.set(e);

      const replacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };

      // append the event to the local storage
      const storedEvents = localStorage.getItem('avatarEvents');
      if (storedEvents) {
        const parsedEvents = JSON.parse(storedEvents);
        parsedEvents.push(event);
        localStorage.setItem('avatarEvents', JSON.stringify(parsedEvents, replacer));
      } else {
        localStorage.setItem('avatarEvents', JSON.stringify([event], replacer));
      }
    });
  }
</script>
<script lang="ts">
  import Collapsible from './common/VerticalCollapsible.svelte';

  onMount(() => {
    const storedEvents = localStorage.getItem('avatarEvents');
    if (storedEvents) {
      events.set(JSON.parse(storedEvents));
    }
  });
</script>
<div>
  <ul style="list-style: none">
    {#each $events as event}
      <li>
        <Collapsible label={event.name} isOpen={false}>
                    <pre>{JSON.stringify(event.data, (_, b) => {
                      if (typeof b === 'bigint') {
                        return b.toString();
                      } else {
                        return b;
                      }
                    }, 2)}</pre>
        </Collapsible>
      </li>
    {/each}
  </ul>
</div>