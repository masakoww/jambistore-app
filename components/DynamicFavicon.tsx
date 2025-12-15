'use client';

import { useEffect } from 'react';
import { useWebsite } from '@/lib/websiteContext';

export default function DynamicFavicon() {
  const { settings } = useWebsite();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Update favicon if logo URL exists
    if (settings.logoUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      link.href = settings.logoUrl;
    }

    // Update page title - prefer browserTabTitle, fallback to siteName
    const pageTitle = settings.browserTabTitle || settings.siteName;
    if (pageTitle) {
      document.title = pageTitle;
    }
  }, [settings.logoUrl, settings.siteName, settings.browserTabTitle]);

  return null;
}
