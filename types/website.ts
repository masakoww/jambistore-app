// Website Global Settings Type
export interface WebsiteSettings {
  siteName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  bannerUrls: string[];
  paymentMethods: string[];
  footer: {
    description: string;
    socialLinks: { name: string; url: string }[];
  };
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: 'Anonymous Store',
  tagline: 'The premium cheating experience',
  primaryColor: '#ec4899',
  secondaryColor: '#8b5cf6',
  accentColor: '#06b6d4',
  logoUrl: '',
  bannerUrls: [],
  paymentMethods: ['pakasir'],
  footer: {
    description: 'Premium game cheats and tools',
    socialLinks: []
  },
  updatedAt: new Date().toISOString()
};
