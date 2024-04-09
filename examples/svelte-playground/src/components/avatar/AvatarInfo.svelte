<script lang="ts">
    import {Avatar} from '@circles-sdk/sdk/dist';
    import {AvatarState} from "@circles-sdk/sdk/dist/avatar";

    export let avatar: Avatar;

    let mintableAmount: string = "0";
    let ownTokenBalance: string = "0";

    $: avatarState = avatar.state;
    $: avatarStateString = $avatarState?.toString();

    $: {
      if (avatarStateString) {
        updateAmounts();
      }
    }

    function updateAmounts() {
      if (!($avatarState === AvatarState.V1_Human
        || $avatarState === AvatarState.V2_Human
        || $avatarState === AvatarState.V1_StoppedHuman_and_V2_Human)) {
        return;
      }

      avatar.getMintableAmount()?.then((amount) => {
        mintableAmount = amount.toString();
      }).catch((e) => {
        console.warn(e);
        mintableAmount = '0';
      });
      avatar.getTokenBalance()?.then((balance) => {
        ownTokenBalance = balance.toString();
      }).catch((e) => {
        console.warn(e);
        ownTokenBalance = '0';
      });
    }

    setInterval(() => {
      updateAmounts();
    }, 5000);
</script>

<div>
    <table>
        <tr>
            <td>Address:</td>
            <td>{avatar.address}</td>
        </tr>
        <tr>
            <td>State:</td>
            <td>{avatarStateString}</td>
        </tr>
        <tr>
            <td>Mintable amount:</td>
            <td>{mintableAmount}</td>
        </tr>
        <tr>
            <td>Own token balance:</td>
            <td>{ownTokenBalance}</td>
        </tr>
    </table>
</div>