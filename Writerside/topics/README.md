# Circles SDK

The Circles SDK is a TypeScript library designed to simplify the interaction with
the [Circles V1](https://github.com/circlesUBI/circles-contracts) as well as
with [Circles V2](https://github.com/aboutcircles/circles-contracts-v2).

1. [Installation](#installation)
2. [Initialization](#initialization)
3. [Usage](#usage)
    1. [Sdk](#sdk)
    2. [Signup at Circles](#signup-at-circles)
        1. [Circles V1](#circles-v1)
        2. [Circles V2](#circles-v2)
    3. [Avatar](#avatar)
    4. [Circles Data](#data)
        1. [CirclesQuery&lt;T&gt;](#circlequery)
    5. [Events](#events)
        1. [Event types](#event-types)
4. [Building from source](#building-from-source)
5. [Error handling & Troubleshooting](#error-handling-troubleshooting)
   1. [Transaction reverted without a reason](#transaction-reverted-without-a-reason)
   2. [The SDK is not working as expected](#the-sdk-is-not-working-as-expected)

## Installation

Install the Circles SDK using npm:

```bash
npm install @circles-sdk/sdk
```

## Initialization

### 1. Chain configuration

Configure the Circles SDK with a Circles RPC and a Pathfinder endpoint URL and the addresses of the
Circles V1 and V2 hubs.

The below config can be used for the Chiado testnet.

_NOTE_: The node at `circlesRpcUrl` must have
the [circles-nethermind-plugin](https://github.com/CirclesUBI/circles-nethermind-plugin) installed.

```typescript 
import { ChainConfig } from '@circles-sdk/sdk';

// Chiado testnet:
export const chainConfig: ChainConfig = {
  pathfinderUrl: 'https://pathfinder.aboutcircles.com',
  circlesRpcUrl: 'https://chiado-rpc.aboutcircles.com',
  v1HubAddress: '0xdbf22d4e8962db3b2f1d9ff55be728a887e47710',
  v2HubAddress: '0x2066CDA98F98397185483aaB26A89445addD6740',
  migrationAddress: '0x2A545B54bb456A0189EbC53ed7090BfFc4a6Af94'
};
```

### 2. Signer

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

### Sdk

The `Sdk` class acts as entry point to the Circles SDK. It's main purpose is to provide
access to the `Avatar` and `CirclesData` classes. Additionally, it provides access to the
raw TypeChain v1 and v2 hub contract wrappers.

The `Sdk` class implements the following interface:

```typescript
/**
 * The SDK interface.
 */
interface SdkInterface {
  /**
   * The signer used to sign transactions (connected wallet e.g. MetaMask).
   */
  signer: ethers.AbstractSigner;
  /**
   * The chain specific Circles configuration (contract addresses and rpc endpoints).
   */
  chainConfig: ChainConfig;
  /**
   * A configured instance of the CirclesData class, an easy-to-use wrapper around
   * the Circles RPC Query API.
   */
  data: CirclesData;
  /**
   * An instance of the typechain generated Circles V1 Hub contract wrapper.
   */
  v1Hub: HubV1;
  /**
   * An instance of the typechain generated Circles V2 Hub contract wrapper.
   */
  v2Hub: HubV2;
  /**
   * An instance of the v1 Pathfinder client (necessary for transfers; only available on gnosis chain with v1 Circles at the moment).
   */
  v1Pathfinder: Pathfinder;
  /**
   * Gets an Avatar instance by its address. Fails if the avatar is not signed up at Circles.
   * @param avatarAddress The avatar's address.
   * @returns The Avatar instance.
   */
  getAvatar: (avatarAddress: string) => Promise<Avatar>;
  /**
   * Registers the connected wallet as a human avatar in Circles v1.
   * @returns The Avatar instance.
   */
  registerHuman: () => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as a human avatar in Circles v2.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  registerHumanV2: (cidV0: string) => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as an organization avatar in Circles v1.
   */
  registerOrganization: () => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as an organization avatar in Circles v2.
   * @param name The organization's name.
   * @param cidV0 The CIDv0 of the organization's metadata.
   */
  registerOrganizationV2: (name: string, cidV0: string) => Promise<AvatarInterface>;
  /**
   * Registers the connected wallet as a group avatar in Circles v2.
   * @param mint The address of the minting policy contract to use.
   * @param name The group's name.
   * @param symbol The group token's symbol.
   * @param cidV0 The CIDv0 of the group token's metadata.
   */
  registerGroupV2: (mint: string, name: string, symbol: string, cidV0: string) => Promise<AvatarInterface>;
  /**
   * Migrates a v1 avatar and all its Circles holdings to v2.
   * [[ Currently only works for human avatars. ]]
   * @param avatar The avatar's address.
   * @param cidV0 The CIDv0 of the avatar's ERC1155 token metadata.
   */
  migrateAvatar: (avatar: string, cidV0: string) => Promise<void>;
}
````

### Signup at Circles

The Circles SDK provides various `register*`-methods to sign up for Circles V1 and V2.

Note: _An account can only be signed up at Circles once. However, it is possible to migrate an
account that
signed up at v1 to a v2 account._

#### Circles V1

If you want to sign the connected wallet up for Circles V1, use the `registerHuman`
or `registerOrganization` methods.

```typescript
await sdk.registerHuman();
await sdk.registerOrganization();
```

#### Circles V2

If you want to sign the connected wallet up for Circles V2, use
the `registerHumanV2`, `registerOrganizationV2` or `registerGroupV2` method.

```typescript
await sdk.registerHumanV2();
await sdk.registerOrganizationV2();
await sdk.registerGroupV2();
```

### Avatar

After you successfully signed up for Circles, you can use the `getAvatar` method to get the
`Avatar` object for the connected wallet (or for any other address for that matter).

```typescript
const signerAddress = await signer.getAddress();
const avatar = await sdk.getAvatar(signerAddress);
````

The `getAvatar` method will throw an error if the address is not registered.
Use `sdk.data.getAvatarInfo` to check if an address is registered.

The `Avatar` class implements the following interfaces:

```typescript
/**
 * An Avatar represents a user registered at Circles.
 */
export interface AvatarInterface {
  /**
   * The avatar's address.
   */
  readonly address: string;

  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address.
   * If the avatar is initialized and this field is `undefined`, the avatar is not signed up at Circles.
   */
  readonly avatarInfo: AvatarRow | undefined;

  /**
   * Calculates the maximum Circles amount that can be transferred to another avatar.
   *
   * NOTE: This operation can be long-running (minutes).
   *
   * @param to The address of the avatar to transfer to.
   * @returns The maximum amount that can be transferred.
   */
  getMaxTransferableAmount(to: string): Promise<bigint>;

  /**
   * Transfers Circles to another avatar.
   *
   * NOTE: This operation can be long-running (minutes).
   *
   * @param to The address of the avatar to transfer to.
   * @param amount The amount to transfer.
   */
  transfer(to: string, amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Trusts another avatar. Trusting an avatar means you're willing to accept Circles that have been issued by this avatar.
   * @param avatar The address of the avatar to trust.
   */
  trust(avatar: string): Promise<ContractTransactionReceipt>;

  /**
   * Revokes trust from another avatar. This means you will no longer accept Circles issued by this avatar.
   * @param avatar
   */
  untrust(avatar: string): Promise<ContractTransactionReceipt>;

  /**
   * Gets the amount available to mint via `personalMint()`.
   * @returns The amount available to mint or '0'.
   */
  getMintableAmount(): Promise<bigint>;

  /**
   * Mints the available CRC for the avatar.
   */
  personalMint(): Promise<ContractTransactionReceipt>;

  /**
   * Stops the avatar's token. This will prevent any future `personalMint()` calls.
   */
  stop(): Promise<ContractTransactionReceipt>;

  /**
   * Gets all trust relations of the avatar.
   */
  getTrustRelations(): Promise<TrustRelationRow[]>;

  /**
   * Gets a paged query of the transaction history of the avatar.
   * @param pageSize The maximum number of transactions per page.
   */
  getTransactionHistory(pageSize: number): Promise<CirclesQuery<TransactionHistoryRow>>;

  /**
   * Gets the avatar's total circles balance.
   */
  getTotalBalance(): Promise<number>;
}

/**
 * V2 avatars have additional capabilities that are described in this interface.
 */
export interface AvatarInterfaceV2 extends AvatarInterface {
  /**
   * Uses holdings of the avatar as collateral to mint new group tokens.
   * @param group The group which is minting the tokens.
   * @param collateral The addresses of the tokens used as collateral.
   * @param amounts The amounts of the collateral tokens to use.
   * @param data Additional data for the minting operation.
   */
  groupMint(group: string, collateral: string[], amounts: bigint[], data: Uint8Array): Promise<ContractTransactionReceipt>;

  /**
   * Wraps ERC115 Circles into demurraged ERC20 Circles.
   * @param amount The amount of ERC115 Circles to wrap.
   */
  wrapDemurrageErc20(amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Wraps inflation ERC20 Circles into demurraged ERC20 Circles.
   * @param amount The amount of inflation ERC20 Circles to wrap.
   */
  wrapInflationErc20(amount: bigint): Promise<ContractTransactionReceipt>;

  /**
   * Invites an address as human to Circles v2.
   * @param avatar The avatar's avatar.
   */
  inviteHuman(avatar: string): Promise<ContractTransactionReceipt>;
}
```

### Data

If you are only interested in reading Circles data, use the CirclesData class:

```typescript
import { CirclesData, CirclesRpc } from '@circles-sdk/data';

const rpc = new CirclesRpc(chainConfig.circlesRpcUrl);
const data = new CirclesData(rpc);
```

The `CirclesData` class implements the following interface:

```typescript
interface CirclesDataInterface {
  /**
   * Gets basic information about an avatar.
   * This includes the signup timestamp, circles version, avatar type and token address/id.
   * @param avatar The address to check.
   * @returns The avatar information or undefined if the address is not an avatar.
   */
  getAvatarInfo(avatar: string): Promise<AvatarRow | undefined>;

  /**
   * Gets the total CRC v1 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   * @returns The total CRC balance (either as TC 'number' or as CRC in 'wei').
   */
  getTotalBalance(avatar: string, asTimeCircles: boolean): Promise<string>;

  /**
   * Gets the total CRC v2 balance of an address.
   * @param avatar The address to get the CRC balance for.
   * @param asTimeCircles Whether to return the balance as TimeCircles or not (default: true).
   */
  getTotalBalanceV2(avatar: string, asTimeCircles: boolean): Promise<string>;

  /**
   * Gets the detailed CRC v1 token balances of an address.
   * @param avatar The address to get the token balances for.
   * @param asTimeCircles Whether to return the balances as TimeCircles or not (default: true).
   */
  getTokenBalances(avatar: string, asTimeCircles: boolean): Promise<TokenBalanceRow[]>;

  /**
   * Gets the detailed CRC v2 token balances of an address.
   * @param avatar The address to get the token balances for.
   * @param asTimeCircles Whether to return the balances as TimeCircles or not (default: true).
   */
  getTokenBalancesV2(avatar: string, asTimeCircles: boolean): Promise<TokenBalanceRow[]>;

  /**
   * Gets the transaction history of an address.
   * This contains incoming/outgoing transactions and minting of CRC (in v1 and v2).
   * @param avatar The address to get the transaction history for.
   * @param pageSize The maximum number of transactions per page.
   */
  getTransactionHistory(avatar: string, pageSize: number): CirclesQuery<TransactionHistoryRow>;

  /**
   * Gets the current incoming and outgoing trust relations of an address (in v1 and v2).
   * @param avatar The address to get the trust list for.
   * @param pageSize The maximum number of trust relations per page.
   */
  getTrustRelations(avatar: string, pageSize: number): CirclesQuery<TrustListRow>;

  /**
   * Gets all trust relations of an avatar and groups mutual trust relations together.
   * @param avatar The address to get the trust relations for.
   */
  getAggregatedTrustRelations(avatar: string): Promise<TrustRelationRow[]>;

  /**
   * Subscribes to Circles events.
   * @param avatar The address to subscribe to events for. If not provided, subscribes to all events.
   */
  subscribeToEvents(avatar?: string): Promise<Observable<CirclesEvent>>;

  /**
   * Gets the list of avatars that have invited the given avatar.
   * @param avatar The address to get the invitations for.
   * @param pageSize The maximum number of invitations per page.
   */
  getInvitations(avatar: string, pageSize: number): CirclesQuery<InvitationRow>;

  /**
   * Gets the avatar that invited the given avatar.
   * @param avatar The address to get the inviter for.
   */
  getInvitedBy(avatar: string): Promise<string | undefined>;
}
```

If you need more control about the queried data, you can query the RPC directly. Please refer to the
[circles-nethermind-plugin](https://github.com/CirclesUBI/circles-nethermind-plugin?tab=readme-ov-file#quickstart)
docs for more information.

#### CircleQuery

The `CirclesQuery` class is a wrapper around
the [Circles RPC query API](https://github.com/CirclesUBI/circles-nethermind-plugin?tab=readme-ov-file#circles_query).
It allows you to query data in a paged manner.

Note: _The max. page size is 1000._

```typescript
const query = await sdk.data.getTransactionHistory(signerAddress, 25);
let pageNo = 0;
while (await query.queryNextPage()) {
  const resultRows = query.currentPage?.results ?? [];
  console.log(`Page ${pageNo++}: ${resultRows.length} results`);
}
```

The `CirclesData` class provides a decent selection of common queries already,
but you can also use the `CirclesQuery` class directly. See
the [Circles RPC query API](https://github.com/CirclesUBI/circles-nethermind-plugin?tab=readme-ov-file#circles_query)
documentation for more information about the query capabilities.

```typescript
type Invitation = {
  blockNumber: number;
  transactionIndex: number;
  logIndex: number;
  timestamp: number;
  transactionHash: string;
  inviter: string;
  invited: string;
};

const query = new CirclesQuery<Invitation>(this.rpc, {
  namespace: 'CrcV2',
  table: 'InviteHuman',
  columns: [
    'blockNumber',
    'transactionIndex',
    'logIndex',
    'timestamp',
    'transactionHash',
    'inviter',
    'invited'
  ],
  filter: [
    {
      Type: 'FilterPredicate',
      FilterType: 'Equals',
      Column: 'inviter',
      Value: signerAddress.toLowerCase()
    }
  ],
  sortOrder: 'DESC',
  limit: pageSize
});
```

### Events

You can use the `@circles-sdk/data` package to subscribe to Circles events:

```typescript
// Subscribing without an avatar address will subscribe to all events (firehose style).
const allEvents = await sdk.data.subscribeToEvents();
allEvents.subscribe((event) => {
  console.log(event);
});

// Subscribing to events for a specific avatar.
const avatarEvents = await sdk.data.subscribeToEvents(signerAddress);
avatarEvents.subscribe((event) => {
  console.log(event);
});
```

Alternatively, you can use an `Avatar` instance to subscribe to events specific to that avatar:

```typescript
const avatar = await sdk.getAvatar(signerAddress);
const avatarEvents = await avatar.subscribeToEvents();
avatarEvents.subscribe((event) => {
  console.log(event);
});
```

#### Event types

The `CirclesEvent` type is an union of all possible Circles events.
Please consult the source code for the fields of each event type.

```typescript
export type CirclesEvent =
  | CrcV1_HubTransfer
  | CrcV1_Signup
  | CrcV1_OrganizationSignup
  | CrcV1_Trust
  | CrcV1_Transfer
  | CrcV2_InviteHuman
  | CrcV2_PersonalMint
  | CrcV2_RegisterGroup
  | CrcV2_RegisterHuman
  | CrcV2_RegisterOrganization
  | CrcV2_Stopped
  | CrcV2_Trust
  | CrcV2_TransferSingle
  | CrcV2_URI
  | CrcV2_ApprovalForAll
  | CrcV2_TransferBatch
  | CrcV2_DiscountCost
  | CrcV2_RegisterShortName
  | CrcV2_UpdateMetadataDigest
  | CrcV2_CidV0;
```

## Building from source

```shell
git clone https://github.com/CirclesUBI/circles-sdk.git
cd circles-sdk
npm install
npm run build
```

## Error handling & Troubleshooting

### Transaction reverted without a reason

Due to contract size constraints, the circles v2 contracts don't use revert reasons. This means that
most errors will be thrown as `Error: Transaction reverted without a reason string`.

The error handling in the SDK is very rudimentary at the moment. So if you encounter such an error,
check your browser console for a message in the format:

```
Revert: 0x071335d8000000000000000000000000b49a7bccd607ef482b71988a11f65fece980eca50000000000000000000000004f24c2cd960d44f76b79f963706602872205db8b
```

This message contains the encoded error message. You can decode it using the `parseError` function
from the SDK:

```typescript
import { parseError } from '@circles-sdk/sdk';

const error = "0x071335d8000000000000000000000000b49a7bccd607ef482b71988a11f65fece980eca50000000000000000000000004f24c2cd960d44f76b79f963706602872205db8b";
parseError(error);
```

This will give you a human-readable error message:

```
ErrorDescription {
  fragment: ErrorFragment {
    type: 'error',
    inputs: [ [ParamType], [ParamType] ],
    name: 'CirclesERC1155MintBlocked'
  },
  name: 'CirclesERC1155MintBlocked',
  args: Result(2) [
    '0xb49a7bccD607Ef482B71988A11f65fEce980ecA5',
    '0x4f24C2CD960d44f76B79F963706602872205DB8B'
  ],
  signature: 'CirclesERC1155MintBlocked(address,address)',
  selector: '0x071335d8'
}
```

### The SDK is not working as expected

If you encounter any issues with the SDK, please open an issue on the GitHub repository.
In the meantime, try to work around the issue e.g. by using the hub contracts directly (`sdk.v1Hub`
or `sdk.v2Hub`).