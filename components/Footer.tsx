'use client';

import Link from 'next/link';
import { useWebsite } from '@/lib/websiteContext';

export default function Footer() {
  const { settings } = useWebsite();
  
  return (
    <footer className="py-12 px-4 bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo/Brand */}
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{settings.siteName}</h3>
            <p className="text-gray-400 text-sm">{settings.footer.description}</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-8">
            <Link href="/products" className="text-gray-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="https://discord.gg/KrWnqnbW6f" target="_blank" className="text-gray-400 hover:text-white transition-colors">
              Contact
            </Link>
            <Link href="/tnc" className="text-gray-400 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-500 text-sm">
            All rights reserved. &copy; {new Date().getFullYear()} {settings.siteName}.
          </p>
        </div>
      </div>
    </footer>
  );
}
