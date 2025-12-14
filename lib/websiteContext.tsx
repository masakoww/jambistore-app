'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WebsiteSettings, DEFAULT_WEBSITE_SETTINGS, ColorScheme, hexToRgb } from '@/types/website';

type Language = 'id' | 'en';
type Currency = 'IDR' | 'USD';

interface WebsiteContextType {
  settings: WebsiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  language: Language;
  currency: Currency;
  switchLanguage: (lang: Language) => void;
  switchCurrency: (curr: Currency) => void;
}

// Apply color scheme to CSS variables
function applyColorScheme(colorScheme: ColorScheme): void {
  if (typeof document === 'undefined') return;
  
  const root = document.documentElement;
  
  // Primary brand colors
  root.style.setProperty('--color-primary', colorScheme.primaryColor);
  root.style.setProperty('--color-secondary', colorScheme.secondaryColor);
  root.style.setProperty('--color-accent', colorScheme.accentColor);
  
  // Background colors
  root.style.setProperty('--color-bg', colorScheme.backgroundColor);
  root.style.setProperty('--color-surface', colorScheme.surfaceColor);
  root.style.setProperty('--color-card', colorScheme.cardColor);
  
  // Text colors
  root.style.setProperty('--color-text-primary', colorScheme.textPrimary);
  root.style.setProperty('--color-text-secondary', colorScheme.textSecondary);
  root.style.setProperty('--color-text-muted', colorScheme.textMuted);
  
  // Gradient colors
  root.style.setProperty('--color-gradient-from', colorScheme.gradientFrom);
  root.style.setProperty('--color-gradient-to', colorScheme.gradientTo);
  
  // Border and effects
  root.style.setProperty('--color-border', colorScheme.borderColor);
  root.style.setProperty('--color-glow', colorScheme.glowColor);
  
  // Status colors
  root.style.setProperty('--color-success', colorScheme.successColor);
  root.style.setProperty('--color-error', colorScheme.errorColor);
  root.style.setProperty('--color-warning', colorScheme.warningColor);
  
  // RGB values for rgba() usage
  const primaryRgb = hexToRgb(colorScheme.primaryColor);
  const secondaryRgb = hexToRgb(colorScheme.secondaryColor);
  const accentRgb = hexToRgb(colorScheme.accentColor);
  
  if (primaryRgb) {
    root.style.setProperty('--color-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
  }
  if (secondaryRgb) {
    root.style.setProperty('--color-secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
  }
  if (accentRgb) {
    root.style.setProperty('--color-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
  }
}

const WebsiteContext = createContext<WebsiteContextType>({
  settings: DEFAULT_WEBSITE_SETTINGS,
  loading: true,
  refreshSettings: async () => {},
  language: 'id',
  currency: 'IDR',
  switchLanguage: () => {},
  switchCurrency: () => {},
});

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<WebsiteSettings>(DEFAULT_WEBSITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('id');
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load preferences from localStorage on initial mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('website_language') as Language | null;
      const savedCurrency = localStorage.getItem('website_currency') as Currency | null;

      if (savedLanguage && (savedLanguage === 'id' || savedLanguage === 'en')) {
        setLanguage(savedLanguage);
      }

      if (savedCurrency && (savedCurrency === 'IDR' || savedCurrency === 'USD')) {
        setCurrency(savedCurrency);
      }

      setIsInitialized(true);
    }
  }, []);

  // Save language to localStorage when it changes
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('website_language', language);
    }
  }, [language, isInitialized]);

  // Save currency to localStorage when it changes
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      localStorage.setItem('website_currency', currency);
    }
  }, [currency, isInitialized]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      
      if (data.ok) {
        setSettings(data.settings);
        
        // Apply color scheme to CSS variables
        if (data.settings.colorScheme) {
          applyColorScheme(data.settings.colorScheme);
        }
        
        // Update document title
        if (typeof document !== 'undefined') {
          document.title = data.settings.siteName;
        }
      }
    } catch (error) {
      console.error('Error loading website settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const refreshSettings = async () => {
    setLoading(true);
    await loadSettings();
  };

  const switchLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  const switchCurrency = (curr: Currency) => {
    setCurrency(curr);
  };

  return (
    <WebsiteContext.Provider value={{ 
      settings, 
      loading, 
      refreshSettings,
      language,
      currency,
      switchLanguage,
      switchCurrency
    }}>
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error('useWebsite must be used within WebsiteProvider');
  }
  return context;
}
