'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useWebsite } from '@/lib/websiteContext';
import Link from 'next/link';

interface Review {
  id: string;
  productSlug: string;
  orderId: string;
  rating: number;
  comment: string;
  maskedEmail: string;
  createdAt: string;
}

export default function Reviews() {
  const { language } = useWebsite();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews?limit=6');
      const data = await response.json();
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Truncate comment to 120 characters
  const truncateComment = (comment: string) => {
    if (comment.length <= 120) return comment;
    return comment.substring(0, 120) + '...';
  };

  if (loading) {
    return (
      <section className="py-20 px-4 bg-gradient-to-b from-black to-purple-900/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {language === 'id' ? 'Ulasan Pengguna' : 'User Reviews'}
            </h2>
          </div>
          <div className="text-center text-gray-400">
            {language === 'id' ? 'Memuat ulasan...' : 'Loading reviews...'}
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null; // Don't show section if no reviews
  }

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-black to-purple-900/10">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            {language === 'id' ? 'Ulasan Pengguna' : 'User Reviews'}
          </h2>
          <p className="text-gray-400">
            {language === 'id' 
              ? 'Apa kata pelanggan kami tentang produk-produk terbaik kami' 
              : 'What our customers say about our best products'}
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:scale-105"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">
                    {review.maskedEmail}
                  </h3>
                  <p className="text-sm text-purple-400">
                    {language === 'id' ? 'Pembeli Terverifikasi' : 'Verified Buyer'}
                  </p>
                </div>
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < review.rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-600'
                      }`} 
                    />
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <p className="text-gray-300 text-sm leading-relaxed">
                {truncateComment(review.comment)}
              </p>
            </div>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <Link
            href="/reviews"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl text-white font-semibold transition-all"
          >
            {language === 'id' ? 'Lihat Semua Ulasan' : 'View All Reviews'}
          </Link>
        </div>
      </div>
    </section>
  );
}
