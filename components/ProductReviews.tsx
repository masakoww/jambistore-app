'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useWebsite } from '@/lib/websiteContext';

interface Review {
  id: string;
  rating: number;
  comment: string;
  maskedEmail: string;
  createdAt: string;
}

interface ProductReviewsProps {
  productSlug: string;
}

export default function ProductReviews({ productSlug }: ProductReviewsProps) {
  const { language } = useWebsite();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [productSlug]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?productSlug=${productSlug}&limit=20`);
      const data = await response.json();
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Error fetching product reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="mt-12 p-8 rounded-2xl bg-[#0a0a0a] border border-white/5">
        <h2 className="text-2xl font-bold text-white mb-6">
          {language === 'id' ? 'Ulasan Pengguna' : 'User Reviews'}
        </h2>
        <div className="text-center text-gray-400 py-8">
          {language === 'id' ? 'Memuat ulasan...' : 'Loading reviews...'}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-12 p-8 rounded-2xl bg-[#0a0a0a] border border-white/5">
      <h2 className="text-2xl font-bold text-white mb-6">
        {language === 'id' ? 'Ulasan Pengguna' : 'User Reviews'}
      </h2>

      {reviews.length === 0 ? (
        <div className="text-center text-gray-400 py-8">
          {language === 'id' 
            ? 'Belum ada ulasan untuk produk ini.' 
            : 'No reviews yet for this product.'}
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-6 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-base font-bold text-white">
                      {review.maskedEmail}
                    </h3>
                    <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                      {language === 'id' ? 'Pembeli Terverifikasi' : 'Verified Buyer'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(review.createdAt)}
                  </p>
                </div>
                {/* Stars */}
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-5 h-5 ${
                        i < review.rating 
                          ? 'fill-yellow-400 text-yellow-400' 
                          : 'text-gray-600'
                      }`} 
                    />
                  ))}
                </div>
              </div>

              {/* Review Text */}
              <p className="text-gray-300 leading-relaxed">
                {review.comment}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
