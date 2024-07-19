export interface Profile {
    name: string;
    description?: string;
    previewImageUrl?: string;
    imageUrl?: string;
}

export interface GroupProfile extends Profile {
    symbol: string;
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
    async get(cid: string): Promise<Profile|undefined> {
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
}