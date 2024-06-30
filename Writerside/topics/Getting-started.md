# Getting started

At the end of this guide, you'll have a configured Circles SDK instance which you can use to
interact with the Circles smart contracts.

## Install dependencies

Start by installing the sdk package and ethers6 using npm.

```bash
npm i @circles-sdk/sdk ethers
```

## Initialize the SDK

To initialize the SDK, you need to provide a chain specific configuration and an ethers
AbstractSigner.

### Chain configuration

<tabs>
    <tab id="chiado-chain" title="Chiado">
       The Gnosis Chain testnet has both versions (v1 and v2) of the Circles smart contracts.<br/>
       <code-block lang="typescript">
        const chainConfig: ChainConfig = {
           circlesRpcUrl: "https://chiado-rpc.aboutcircles.com",
           v1HubAddress: "0xdbf22d4e8962db3b2f1d9ff55be728a887e47710",
           v2HubAddress: "0x2066CDA98F98397185483aaB26A89445addD6740",
           migrationAddress: "0x2A545B54bb456A0189EbC53ed7090BfFc4a6Af94"
        };
       </code-block>
    </tab>
    <tab id="gnosis-chain" title="Gnosis">
       The Gnosis Chain mainnet is the production environment for Circles v1.<br/>
       <code-block lang="typescript">
        const chainConfig: ChainConfig = {
           pathfinderUrl: 'https://pathfinder.aboutcircles.com',
           circlesRpcUrl: "https://rpc.helsinki.aboutcircles.com",
           v1HubAddress: "0x29b9a7fbb8995b2423a71cc17cf9810798f6c543"
        };
       </code-block>
    </tab>
</tabs>

### AbstractSigner

<tabs>
    <tab id="browser-wallet" title="Browser wallet (e.g. MetaMask)">
        Use a browser plugin that provides a <code>window.ethereum</code> object.<br/>
       <code-block lang="typescript">
        import {BrowserProvider} from "ethers";
        &nbsp;
        const signer: AbstractSigner = new BrowserProvider(window.ethereum);
       </code-block>   
    </tab>
    <tab id="private-key" title="Private Key">
        Use a JsonRpcProvider with a private key.<br/>
       <code-block lang="typescript">
        import {JsonRpcProvider, Wallet, AbstractSigner} from "ethers";
        &nbsp;
        const privateKey = "";
        const provider = new JsonRpcProvider("http://localhost:8545");
        const signer: AbstractSigner = new Wallet(privateKey, provider);
       </code-block>   
    </tab>
</tabs>