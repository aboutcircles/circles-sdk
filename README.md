# Circles SDK

The Circles SDK is a TypeScript library designed to simplify the interaction with
the [circles-contracts](https://github.com/circlesUBI/circles-contracts).

## Installation

Install the Circles SDK using npm:

```bash
npm install @circles-sdk/sdk
```

## Initialization

Configure the Circles SDK with a Circles RPC and a Pathfinder endpoint.

```typescript 
import { ChainConfig } from "@circles-sdk/sdk";

const chainConfig: ChainConfig = {
  circlesRpcUrl: 'https://rpc.aboutcircles.com',
  pathfinderUrl: 'https://pathfinder.aboutcircles.com'
};
```

Additionally, you need an ethers.js provider and a signer. Assuming you are using MetaMask:

```typescript
import { ethers } from "ethers";

const windowEthereum = (window as any).ethereum;
if (!windowEthereum) {
  throw new Error('window.ethereum is not installed');
}
const browserProvider = new ethers.BrowserProvider(windowEthereum);
const signer = await browserProvider.getSigner();
```

Initialize and use the Circles SDK:

```typescript
const sdk = new Sdk(chainConfig, signer);
```

## Usage

### Avatar

For regular Circles interactions, use the Avatar class:

```typescript
const avatar = await sdk.getAvatar("0x1234...");
````

The `getAvatar` method will throw an error if the address is not registered.
Use `sdk.data.getAvatarInfo` to check if an address is registered.

If you want to sign the connected wallet up for Circles, use the `registerHuman`
or `registerOrganization` methods.

```typescript
const human = await sdk.registerHuman();
const organization = await sdk.registerOrganization();
```

Note that a wallet can only be signed up for Circles once. Either as a human or as an organization.

The `Avatar` class provides the following methods:

* __trust__: Trusts another avatar. Trusting an avatar means you're willing to accept Circles that
  have been issued by this avatar.
* __untrust__: Revokes trust from another avatar. This means you will no longer accept Circles
  issued by this avatar.
* __getMintableAmount__: Gets the amount available to mint via `personalMint`.
* __personalMint__: Mints the available Circles for the avatar.
* __transfer__: Transfers Circles to another avatar.
* __getTrustRelations__: Gets the current incoming and outgoing trust relations of the avatar.
* __getTotalBalance__: Gets the total balance of the avatar.
* __getTransactionHistory__: Gets the transaction history of the avatar.

### Data

If you are only interested in reading Circles data, use the CirclesData class:

```typescript
import { CirclesData, CirclesRpc } from '@circles-sdk/data';

const rpc = new CirclesRpc(chainConfig.circlesRpcUrl);
const data = new CirclesData(rpc);
```

The `CirclesData` class provides the following methods:

* __getAvatarInfo__: Gets basic information about an avatar, including signup timestamp, Circles
  version, avatar type, and token address/id.
* __getTotalBalance__: Gets the total balance of an avatar.
* __getTokenBalances__: Gets the detailed token balances of an avatar.
* __getTransactionHistory__: Gets the transaction history of an avatar.
* __getTrustRelations__: Gets the current incoming and outgoing trust relations of an address.

If you need more control about the queried data, you can query the RPC directly. Please refer to the
[circles-nethermind-plugin](https://github.com/CirclesUBI/circles-nethermind-plugin?tab=readme-ov-file#quickstart)
docs for more information.
