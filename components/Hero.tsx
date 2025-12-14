"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, ChevronDown } from "lucide-react";
import { useWebsite } from "@/lib/websiteContext";

export default function Hero() {
  const { settings } = useWebsite();

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 z-0">
          <Image
            src="/gif/anonmyousbanner.gif"
            alt="Anonymous Banner Background"
            fill
            priority
            unoptimized
            sizes="100vw"
            quality={60}
            className="object-cover object-center"
            loading="eager"
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
        </div>
      </div>


      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto opacity-0 animate-[fadeIn_0.8s_ease-out_0.2s_forwards]">
        <div
          className="flex justify-center mb-8"
        >
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm text-gray-200 hover:bg-white/20 transition-all group"
          >
            <div className="animate-spin-slow">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-semibold">New</span>
            <span>See our interesting catalog!</span>
            <ChevronDown className="w-4 h-4 rotate-[-90deg] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Main Title with Letter Animation */}
        <div>
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight hover:scale-105 transition-transform duration-300">
            {settings.siteName.split('.')[0] || 'JAMBI Store'}
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          {settings.tagline || 'The premium digital experience'}
        </p>

        {/* CTA Button */}
        <div>
          <Link
            href="/products"
            className="inline-block px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg shadow-purple-500/50"
          >
            Start Dominating!
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/50" />
        </div>
      </div>

    </section>
  );
}
