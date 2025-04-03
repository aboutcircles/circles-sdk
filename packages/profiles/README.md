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
  location: 'Berlin, Germany',
  geoLocation: [52.5200, 13.4050]
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

#### Basic Search

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

Search by registeredName (exact match):
```typescript
const nameResults = await profiles.searchByRegisteredName('Jo');
console.log('Profile for registeredName:', nameResults);
```

Search by location (partial match):
```typescript
const locationResults = await profiles.searchByLocation('Berlin');
console.log('Profiles matching location:', locationResults);
```

Search with multiple criteria:
```typescript
const results = await profiles.search({
  name: 'John',
  description: 'developer',
  // address, CID, and registeredName are optional
});
console.log('Search results:', results);
```

Search by multiple addresses in a batch:
```typescript
const addresses = ['0x123...', '0x456...', '0x789...'];
const results = await profiles.searchByAddresses(addresses);
console.log('Profiles for addresses:', results);
```

#### Search with Complete Profile Data

All search methods accept an optional `SearchOptions` parameter with a `fetchComplete` flag to retrieve full profile data including images:

```typescript
// Search by name with complete profile data
const completeProfiles = await profiles.searchByName('John', { fetchComplete: true });
console.log('Complete profiles:', completeProfiles);

// Search with multiple criteria and complete profile data
const completeResults = await profiles.search({
  name: 'John',
  description: 'developer',
}, { fetchComplete: true });
console.log('Complete search results:', completeResults);
```

## Types

### Profile
```typescript
interface Profile {
  name: string;
  description?: string;
  previewImageUrl?: string;
  imageUrl?: string;
  location?: string;
  geoLocation?: [number, number];
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
export interface SearchResultProfile extends Pick<Profile, 'name' | 'description'> {
  CID: string;
  lastUpdatedAt: number;
  address: string;
  registeredName: string | null;
  // Optional fields for complete profiles
  imageUrl?: string;
  previewImageUrl?: string;
  location?: string;
  geoLocation?: [number, number];
}
```

### SearchOptions
```typescript
interface SearchOptions {
  /**
   * Whether to fetch complete profile data including images.
   */
  fetchComplete?: boolean;
}
```

### SearchCriteria
```typescript
interface SearchCriteria {
  name?: string;
  description?: string;
  address?: string;
  CID?: string;
  registeredName?: string;
  location?: string;
}
```
