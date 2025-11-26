'use client';

import { useState, useEffect } from 'react';
import { Star, Trash2, Search, Filter, Loader2 } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';

interface Review {
  id: string;
  productSlug: string;
  orderId: string;
  rating: number;
  comment: string;
  maskedEmail: string;
  customerEmail: string;
  createdAt: string;
}

export default function ReviewsTab() {
  const { showAlert } = useModal();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [filterProduct, setFilterProduct] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reviews?limit=100');
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

  const handleDeleteReview = async () => {
    if (!selectedReview) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/reviews/${selectedReview.id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_API_KEY || ''
        }
      });

      const data = await response.json();

      if (data.success) {
        showAlert('Ulasan berhasil dihapus.', 'success');
        setReviews(reviews.filter(r => r.id !== selectedReview.id));
        setShowDeleteConfirm(false);
        setSelectedReview(null);
      } else {
        showAlert(data.message || 'Gagal menghapus ulasan.', 'error');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      showAlert('Terjadi kesalahan saat menghapus ulasan.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = 
      review.maskedEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.productSlug.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRating = filterRating === null || review.rating === filterRating;
    const matchesProduct = !filterProduct || review.productSlug.includes(filterProduct.toLowerCase());

    return matchesSearch && matchesRating && matchesProduct;
  });

  const uniqueProducts = Array.from(new Set(reviews.map(r => r.productSlug)));

  const totalReviews = reviews.length;
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <Star className="w-7 h-7 text-yellow-500 fill-yellow-500" />
          <h2 className="text-2xl font-bold text-white">Review</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Kelola dan moderasi ulasan pelanggan untuk semua produk
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-400 text-sm font-medium">Total Review</p>
              <p className="text-white text-2xl font-bold mt-1">{totalReviews}</p>
            </div>
            <Star className="w-8 h-8 text-yellow-500 opacity-50" />
          </div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm font-medium">Rating Rata-rata</p>
              <p className="text-white text-2xl font-bold mt-1">{averageRating} / 5.0</p>
            </div>
            <Star className="w-8 h-8 text-green-500 opacity-50 fill-green-500" />
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm font-medium">Produk Direview</p>
              <p className="text-white text-2xl font-bold mt-1">{uniqueProducts.length}</p>
            </div>
            <Filter className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">Distribusi Rating</h3>
        <div className="space-y-3">
          {ratingDistribution.map(({ rating, count }) => {
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={rating} className="flex items-center gap-4">
                <div className="flex items-center gap-1 w-24">
                  <span className="text-white font-semibold">{rating}</span>
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-gray-400 text-sm w-16 text-right">
                  {count} ({percentage.toFixed(0)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">Filter</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari ulasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Filter by Rating */}
          <select
            value={filterRating === null ? '' : filterRating}
            onChange={(e) => setFilterRating(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Semua Rating</option>
            <option value="5">⭐⭐⭐⭐⭐ (5)</option>
            <option value="4">⭐⭐⭐⭐ (4)</option>
            <option value="3">⭐⭐⭐ (3)</option>
            <option value="2">⭐⭐ (2)</option>
            <option value="1">⭐ (1)</option>
          </select>

          {/* Filter by Product */}
          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">Semua Produk</option>
            {uniqueProducts.map(product => (
              <option key={product} value={product}>{product}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">Tidak ada ulasan yang ditemukan</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {filteredReviews.map((review) => (
              <div key={review.id} className="p-6 hover:bg-white/5 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-semibold">{review.maskedEmail}</h4>
                      <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-xs font-medium">
                        Verified Buyer
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span>Produk: <span className="text-white">{review.productSlug}</span></span>
                      <span>•</span>
                      <span>Order ID: <span className="text-white">{review.orderId}</span></span>
                      <span>•</span>
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex gap-0.5">
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

                    <button
                      onClick={() => {
                        setSelectedReview(review);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-all"
                      title="Hapus ulasan"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <p className="text-gray-300 leading-relaxed">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDeleteConfirm && selectedReview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Hapus Ulasan</h3>
            <p className="text-gray-400 mb-6">
              Apakah Anda yakin ingin menghapus ulasan dari <span className="text-white font-semibold">{selectedReview.maskedEmail}</span>?
              Tindakan ini tidak dapat dibatalkan dan akan memperbarui rating produk.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${
                      i < selectedReview.rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-600'
                    }`} 
                  />
                ))}
              </div>
              <p className="text-gray-300 text-sm">{selectedReview.comment}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedReview(null);
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteReview}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus Ulasan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
