export interface Profile {
  name: string;
  description?: string;
  previewImageUrl?: string;
  imageUrl?: string;
  location?: string;
  geoLocation?: [number, number];
  extensions?: Record<string, any>;
}

export interface GroupProfile extends Profile {
  symbol: string;
}

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

/**
 * Options for search operations.
 */
export interface SearchOptions {
  /**
   * Whether to fetch complete profile data including images.
   */
  fetchComplete?: boolean;
}

export class Profiles {
  constructor(private readonly profileServiceUrl: string) {
  }

  private getProfileServiceUrl(): string {
    return this.profileServiceUrl.endsWith('/') ? this.profileServiceUrl : `${this.profileServiceUrl}/`;
  }

  async create(profile: Profile): Promise<string> {
    const response = await fetch(`${this.getProfileServiceUrl()}pin`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      throw new Error(`Failed to create profile. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }

    const data = await response.json();
    return data.cid;
  }

  /**
   * Retrieves a profile by its CID. If the profile is not found, an error is thrown.
   * @param cid The CID of the profile to retrieve.
   */
  async get(cid: string): Promise<Profile | undefined> {
    const response = await fetch(`${this.getProfileServiceUrl()}get?cid=${cid}`);
    if (!response.ok) {
      console.warn(`Failed to retrieve profile ${cid}. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
      return undefined;
    }

    return await response.json();
  }

  /**
   * Retrieves multiple profiles by their CIDs. If a profile is not found, it will not be included in the result.
   * @param cids The CIDs of the profiles to retrieve.
   * @returns A map of CIDs to profiles. If a profile is not found, it will not be included in the map.
   */
  async getMany(cids: string[]): Promise<Record<string, Profile>> {
    const response = await fetch(`${this.getProfileServiceUrl()}getBatch?cids=${cids.join(',')}`);
    if (!response.ok) {
      throw new Error(`Failed to retrieve profiles ${cids.join(',')}. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }

    const profilesArray = await response.json();
    const profiles: Record<string, Profile> = {};

    for (let i = 0; i < cids.length; i++) {
      if (profilesArray[i]) {
        profiles[cids[i]] = profilesArray[i];
      }
    }

    return profiles;
  }

  /**
   * Search for profiles by name.
   * @param name The name to search for (partial match).
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the search criteria.
   */
  async searchByName(name: string, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    params.append('name', name);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');
    
    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles by name. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Search for profiles by description.
   * @param description The description to search for (partial match).
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the search criteria.
   */
  async searchByDescription(description: string, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    params.append('description', description);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');
    
    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles by description. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Search for profiles by location.
   * @param location The location to search for (partial match).
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the search criteria.
   */
  async searchByLocation(location: string, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    params.append('location', location);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');
    
    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles by location. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Search for a profile by address.
   * @param address The exact address to search for.
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the search criteria (usually one or zero).
   */
  async searchByAddress(address: string, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    params.append('address', address);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');
    
    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles by address. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Search for a profile by CID.
   * @param cid The exact CID to search for.
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the search criteria (usually one or zero).
   */
  async searchByCID(cid: string, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    params.append('CID', cid);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');
    
    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles by CID. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Search for profiles by multiple addresses in a single batch request.
   * @param addresses Array of addresses to search for.
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the provided addresses.
   */
  async searchByAddresses(addresses: string[], options?: SearchOptions): Promise<SearchResultProfile[]> {
    const requestBody: any = { addresses };
    if (options?.fetchComplete) requestBody.fetchComplete = true;
    
    const response = await fetch(`${this.getProfileServiceUrl()}search/addresses`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Failed to search profiles by addresses. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : (data.results || []);
  }

  /**
   * Search for a profile by registeredName.
   * @param registeredName The exact registeredName to search for.
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching the search criteria (usually one or zero).
   */
  async searchByRegisteredName(registeredName: string, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    params.append('registeredName', registeredName);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');
    
    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles by registeredName. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }

  /**
   * Search for profiles using multiple criteria.
   * @param criteria Search criteria object containing any combination of name, description, address, CID, and registeredName.
   * @param options Optional search options, including fetchComplete to retrieve full profile data including images.
   * @returns Array of profiles matching all provided search criteria.
   */
  async search(criteria: {
    name?: string;
    description?: string;
    address?: string;
    CID?: string;
    registeredName?: string;
    location?: string;
  }, options?: SearchOptions): Promise<SearchResultProfile[]> {
    const params = new URLSearchParams();
    if (criteria.name) params.append('name', criteria.name);
    if (criteria.description) params.append('description', criteria.description);
    if (criteria.address) params.append('address', criteria.address);
    if (criteria.CID) params.append('CID', criteria.CID);
    if (criteria.registeredName) params.append('registeredName', criteria.registeredName);
    if (criteria.location) params.append('location', criteria.location);
    if (options?.fetchComplete) params.append('fetchComplete', 'true');

    const response = await fetch(`${this.getProfileServiceUrl()}search?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Failed to search profiles. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }
    return await response.json();
  }
}
