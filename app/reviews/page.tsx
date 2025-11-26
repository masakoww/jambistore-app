"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star, Search, Filter, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Fallback useWebsite hook if the '@/contexts/WebsiteContext' module is not available.
// This provides the minimal { language } shape the page expects.
// Replace or remove if you add a real WebsiteContext module in your project.
function useWebsite() {
  return { language: "en" as "en" | "id" };
}

interface Review {
  id: string;
  productSlug: string;
  productName?: string;
  orderId: string;
  rating: number;
  comment: string;
  maskedEmail: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const { language } = useWebsite();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reviews, searchTerm, filterRating]);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/reviews?limit=100");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reviews];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (review) =>
          review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.maskedEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          review.productName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by rating
    if (filterRating !== null) {
      filtered = filtered.filter((review) => review.rating === filterRating);
    }

    setFilteredReviews(filtered);
  };

  const ratingCounts = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((r) => r.rating === rating).length,
  }));

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const text = {
    id: {
      title: "Ulasan Pelanggan",
      subtitle: "Lihat apa kata pelanggan kami tentang produk kami",
      search: "Cari ulasan...",
      filterByRating: "Filter berdasarkan rating",
      allRatings: "Semua Rating",
      totalReviews: "Total Ulasan",
      avgRating: "Rating Rata-rata",
      verifiedBuyer: "Pembeli Terverifikasi",
      noReviews: "Belum ada ulasan",
      noResults: "Tidak ada ulasan yang cocok dengan filter Anda",
    },
    en: {
      title: "Customer Reviews",
      subtitle: "See what our customers say about our products",
      search: "Search reviews...",
      filterByRating: "Filter by rating",
      allRatings: "All Ratings",
      totalReviews: "Total Reviews",
      avgRating: "Average Rating",
      verifiedBuyer: "Verified Buyer",
      noReviews: "No reviews yet",
      noResults: "No reviews match your filters",
    },
  };

  const t = text[language as keyof typeof text];

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t.title}
            </h1>
            <p className="text-gray-400 text-lg">{t.subtitle}</p>
          </motion.div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="text-3xl font-bold text-white mb-2">
                {reviews.length}
              </div>
              <div className="text-gray-400">{t.totalReviews}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl font-bold text-white">
                  {averageRating.toFixed(1)}
                </span>
                <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
              </div>
              <div className="text-gray-400">{t.avgRating}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <div className="space-y-2">
                {ratingCounts.map(({ rating, count }) => (
                  <div key={rating} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 w-16">
                      <span className="text-white">{rating}</span>
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="flex-1 bg-white/10 rounded-full h-2">
                      <div
                        className="bg-yellow-400 h-2 rounded-full transition-all"
                        style={{
                          width: reviews.length
                            ? `${(count / reviews.length) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <span className="text-gray-400 text-sm w-12 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <select
              value={filterRating ?? ""}
              onChange={(e) =>
                setFilterRating(e.target.value ? Number(e.target.value) : null)
              }
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">{t.allRatings}</option>
              <option value="5">5 ⭐</option>
              <option value="4">4 ⭐</option>
              <option value="3">3 ⭐</option>
              <option value="2">2 ⭐</option>
              <option value="1">1 ⭐</option>
            </select>
          </div>

          {/* Reviews List */}
          {filteredReviews.length === 0 ? (
            <div className="text-center py-20">
              <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">
                {reviews.length === 0 ? t.noReviews : t.noResults}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-white font-semibold">
                          {review.maskedEmail}
                        </span>
                        <span className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400">
                          {t.verifiedBuyer}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <span className="text-gray-500 text-sm">
                      {new Date(review.createdAt).toLocaleDateString(
                        language === "id" ? "id-ID" : "en-US",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>

                  <p className="text-gray-300 mb-4">{review.comment}</p>

                  {review.productName && (
                    <div className="text-sm text-gray-500">
                      Product: {review.productName}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
