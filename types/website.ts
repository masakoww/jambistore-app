// Color Scheme Types
export interface ColorScheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  cardColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  gradientFrom: string;
  gradientTo: string;
  borderColor: string;
  glowColor: string;
  successColor: string;
  errorColor: string;
  warningColor: string;
}

export interface ColorPreset {
  id: string;
  name: string;
  colors: ColorScheme;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'pink-purple',
    name: 'Pink & Purple (Default)',
    colors: {
      primaryColor: '#ec4899',
      secondaryColor: '#8b5cf6',
      accentColor: '#06b6d4',
      backgroundColor: '#000000',
      surfaceColor: '#0a0a0a',
      cardColor: '#111111',
      textPrimary: '#ffffff',
      textSecondary: '#d1d5db',
      textMuted: '#6b7280',
      gradientFrom: '#ec4899',
      gradientTo: '#8b5cf6',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      glowColor: 'rgba(236, 72, 153, 0.5)',
      successColor: '#10b981',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
  {
    id: 'cyber-blue',
    name: 'Cyber Blue',
    colors: {
      primaryColor: '#3b82f6',
      secondaryColor: '#06b6d4',
      accentColor: '#8b5cf6',
      backgroundColor: '#000000',
      surfaceColor: '#0a0a12',
      cardColor: '#0f0f1a',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      textMuted: '#64748b',
      gradientFrom: '#3b82f6',
      gradientTo: '#06b6d4',
      borderColor: 'rgba(59, 130, 246, 0.2)',
      glowColor: 'rgba(59, 130, 246, 0.5)',
      successColor: '#10b981',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
  {
    id: 'neon-green',
    name: 'Neon Green',
    colors: {
      primaryColor: '#22c55e',
      secondaryColor: '#10b981',
      accentColor: '#06b6d4',
      backgroundColor: '#000000',
      surfaceColor: '#0a0f0a',
      cardColor: '#0f1a0f',
      textPrimary: '#ffffff',
      textSecondary: '#86efac',
      textMuted: '#6b7280',
      gradientFrom: '#22c55e',
      gradientTo: '#10b981',
      borderColor: 'rgba(34, 197, 94, 0.2)',
      glowColor: 'rgba(34, 197, 94, 0.5)',
      successColor: '#22c55e',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
  {
    id: 'sunset-orange',
    name: 'Sunset Orange',
    colors: {
      primaryColor: '#f97316',
      secondaryColor: '#eab308',
      accentColor: '#ef4444',
      backgroundColor: '#000000',
      surfaceColor: '#0f0a08',
      cardColor: '#1a0f0a',
      textPrimary: '#ffffff',
      textSecondary: '#fed7aa',
      textMuted: '#9a8478',
      gradientFrom: '#f97316',
      gradientTo: '#eab308',
      borderColor: 'rgba(249, 115, 22, 0.2)',
      glowColor: 'rgba(249, 115, 22, 0.5)',
      successColor: '#10b981',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
  {
    id: 'royal-gold',
    name: 'Royal Gold',
    colors: {
      primaryColor: '#eab308',
      secondaryColor: '#d97706',
      accentColor: '#fbbf24',
      backgroundColor: '#000000',
      surfaceColor: '#0f0d08',
      cardColor: '#1a1508',
      textPrimary: '#ffffff',
      textSecondary: '#fef3c7',
      textMuted: '#a8a29e',
      gradientFrom: '#eab308',
      gradientTo: '#d97706',
      borderColor: 'rgba(234, 179, 8, 0.2)',
      glowColor: 'rgba(234, 179, 8, 0.5)',
      successColor: '#10b981',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
  {
    id: 'crimson-red',
    name: 'Crimson Red',
    colors: {
      primaryColor: '#dc2626',
      secondaryColor: '#ef4444',
      accentColor: '#f97316',
      backgroundColor: '#000000',
      surfaceColor: '#0f0808',
      cardColor: '#1a0a0a',
      textPrimary: '#ffffff',
      textSecondary: '#fecaca',
      textMuted: '#9a7878',
      gradientFrom: '#dc2626',
      gradientTo: '#ef4444',
      borderColor: 'rgba(220, 38, 38, 0.2)',
      glowColor: 'rgba(220, 38, 38, 0.5)',
      successColor: '#10b981',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    colors: {
      primaryColor: '#6366f1',
      secondaryColor: '#818cf8',
      accentColor: '#a78bfa',
      backgroundColor: '#030712',
      surfaceColor: '#0f172a',
      cardColor: '#1e293b',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textMuted: '#64748b',
      gradientFrom: '#6366f1',
      gradientTo: '#818cf8',
      borderColor: 'rgba(99, 102, 241, 0.2)',
      glowColor: 'rgba(99, 102, 241, 0.5)',
      successColor: '#10b981',
      errorColor: '#ef4444',
      warningColor: '#f59e0b',
    }
  },
];

export const DEFAULT_COLOR_SCHEME: ColorScheme = COLOR_PRESETS[0].colors;

export function getColorPreset(id: string): ColorPreset | undefined {
  return COLOR_PRESETS.find(preset => preset.id === id);
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// Website Global Settings Type
export interface WebsiteSettings {
  siteName: string;
  tagline: string;
  browserTabTitle?: string;
  colorScheme: ColorScheme;
  selectedPreset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  bannerUrls: string[];
  // Hero Background Settings
  heroBackgroundType?: 'image' | 'color';
  heroBackgroundUrl?: string;
  heroBackgroundColor?: string;
  paymentMethods: string[];
  footer: {
    description: string;
    socialLinks: { name: string; url: string }[];
  };
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_WEBSITE_SETTINGS: WebsiteSettings = {
  siteName: 'Jambi Store',
  tagline: 'The premium cheating experience',
  browserTabTitle: '',
  colorScheme: DEFAULT_COLOR_SCHEME,
  selectedPreset: 'pink-purple',
  primaryColor: '#ec4899',
  secondaryColor: '#8b5cf6',
  accentColor: '#06b6d4',
  logoUrl: '',
  bannerUrls: [],
  heroBackgroundType: 'image',
  heroBackgroundUrl: '',
  heroBackgroundColor: '#000000',
  paymentMethods: ['pakasir'],
  footer: {
    description: 'Premium game cheats and tools',
    socialLinks: []
  },
  updatedAt: new Date().toISOString()
};
