# @circles-sdk/profiles

A TypeScript package for managing user profiles in the Circles ecosystem. This package provides methods to create, retrieve, and search profiles stored on IPFS through the Circles Profile Service.

## Installation

```bash
npm install @circles-sdk/profiles
```

## Usage

First, initialize the Profiles class with your profile service URL:

```typescript
import { Profiles } from '@circles/profiles';

const profiles = new Profiles('https://rpc.aboutcircles.com/profiles');
```

### Creating a Profile

```typescript
const profile = {
  name: 'John Doe',
  description: 'Web3 Developer',
  imageUrl: 'https://example.com/image.jpg',
  previewImageUrl: 'https://example.com/preview.jpg',
};

const cid = await profiles.create(profile);
console.log('Profile created with CID:', cid);
```

### Retrieving Profiles

Get a single profile:
```typescript
const profile = await profiles.get('QmYourCID');
if (profile) {
  console.log('Profile:', profile);
}
```

Get multiple profiles:
```typescript
const cids = ['QmCID1', 'QmCID2', 'QmCID3'];
const profilesMap = await profiles.getMany(cids);
console.log('Profiles:', profilesMap);
```

### Searching Profiles

Search by name (partial match):
```typescript
const nameResults = await profiles.searchByName('John');
console.log('Profiles matching name:', nameResults);
```

Search by description (partial match):
```typescript
const descResults = await profiles.searchByDescription('developer');
console.log('Profiles matching description:', descResults);
```

Search by address (exact match):
```typescript
const addressResults = await profiles.searchByAddress('0x123...');
console.log('Profile for address:', addressResults);
```

Search by CID (exact match):
```typescript
const cidResults = await profiles.searchByCID('QmYourCID');
console.log('Profile for CID:', cidResults);
```

Search with multiple criteria:
```typescript
const results = await profiles.search({
  name: 'John',
  description: 'developer',
  // address and CID are optional
});
console.log('Search results:', results);
```

## Types

### Profile
```typescript
interface Profile {
  name: string;
  description?: string;
  previewImageUrl?: string;
  imageUrl?: string;
  extensions?: Record<string, any>;
}
```

### GroupProfile
```typescript
interface GroupProfile extends Profile {
  symbol: string;
}
```

### SearchResultProfile
```typescript
interface SearchResultProfile extends Profile {
  address: string;
}
```

### SearchCriteria
```typescript
interface SearchCriteria {
  name?: string;
  description?: string;
  address?: string;
  CID?: string;
}
```
