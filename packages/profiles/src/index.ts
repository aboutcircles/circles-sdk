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
    const profileServiceUrl = this.profileServiceUrl.endsWith('/') ? this.profileServiceUrl : `${this.profileServiceUrl}/`;
    const response = await fetch(`${this.getProfileServiceUrl()}pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });

    if (!response.ok) {
      throw new Error(`Failed to create profile. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }

    const data = await response.json();
    return data.cid;
  }

  async get(cid: string): Promise<Profile> {
    const profileServiceUrl = this.profileServiceUrl.endsWith('/') ? this.profileServiceUrl : `${this.profileServiceUrl}/`;
    const response = await fetch(`${this.getProfileServiceUrl()}get?cid=${cid}`);
    if (!response.ok) {
      throw new Error(`Failed to retrieve profile ${cid}. Status: ${response.status} ${response.statusText}. Body: ${await response.text()}`);
    }

    return await response.json();
  }
}