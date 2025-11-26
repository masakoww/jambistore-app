'use client';

import Link from 'next/link';

export default function MoreProducts() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black via-purple-900/20 to-black">
      <div className="max-w-4xl mx-auto text-center">
        {/* Background GIF */}
        <div 
          className="relative rounded-2xl overflow-hidden mb-8"
          style={{
            backgroundImage: 'url(/gif/background.gif)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '200px',
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative h-full flex flex-col items-center justify-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              We have so many other products!
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              Take a look at our full list of our cheats
            </p>
            <Link
              href="/products"
              className="px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
            >
              See all products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
