<script lang="ts">
    import ActionButton from "./common/ActionButton.svelte";
    import {Avatar} from "@circles-sdk/sdk/dist";
    export let avatar: Avatar;

    let to: string;

    const invite = async () => {
        await avatar.inviteHuman(to);
    }
</script>
<div class="form-group">
    <div class="form-group">
        <label for="to">To:</label>
        <input type="text" class="form-control" id="to" name="to" placeholder="0x..." bind:value={to}>
    </div>
    <ActionButton disabled={!avatar.canInvite()}
                  action={invite}>Invite
    </ActionButton>
</div>