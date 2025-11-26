'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WebsiteSettings, DEFAULT_WEBSITE_SETTINGS } from '@/types/website';

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
        
        // Apply colors to CSS variables
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--color-primary', data.settings.primaryColor);
          document.documentElement.style.setProperty('--color-secondary', data.settings.secondaryColor);
          document.documentElement.style.setProperty('--color-accent', data.settings.accentColor);
          
          // Update document title
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
