"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/animations/ParticleBackground";
import { Search, Check, Info, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Product } from "@/types/product";
import { useWebsite } from "@/lib/websiteContext";

// Fallback display data for products (used for images/gifs only)
const productDisplayData: Record<string, { image: string; gif: string }> = {
  "fivem-cheat": {
    image: "/img/fivem-banner.png",
    gif: "/gif/fivem.gif",
  },
  "fortnite-cheat": {
    image: "/img/fornite.png",
    gif: "/gif/fornite.gif",
  },
  "squad-cheat": {
    image: "/img/squad.png",
    gif: "/gif/squad.gif",
  },
  "freefire-cheat": {
    image: "/img/freefire.png",
    gif: "/gif/freefirebanner.gif",
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  },
};

export default function ProductsPage() {
  const { language } = useWebsite();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string, name: string, slug: string, icon?: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        
        console.log('Products API response:', data);
        
        if (data.success) {
          const validProducts = (data.data || []).filter((p: Product) => 
            p.plans && Array.isArray(p.plans) && p.plans.length > 0
          );
          console.log('Valid products with plans:', validProducts.length, 'out of', data.data?.length || 0);
          setProducts(validProducts);
        } else {
          console.error('API returned error:', data.message);
          setError(data.message || 'Failed to load products');
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch categories via server-side API (avoids client Firestore permissions)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();

        if (data.success) {
          setCategories(data.categories || []);
        } else {
          console.error('Error fetching categories via API:', data.message);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'ALL' || !selectedCategory
        ? true
        : product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* Purple Particle Background Effect */}
      <ParticleBackground />
      
      <main className="min-h-screen bg-black relative z-10">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-6xl font-bold text-white mb-4"
          >
            Our Products
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-gray-400 text-lg"
          >
            Choose the perfect solution for your needs
          </motion.p>
        </div>
      </section>

      {/* Search and Filter */}
      <section className="px-4 pb-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors cursor-pointer min-w-[180px]"
              >
                <option value="name-asc" className="bg-gray-900">
                  Name (A-Z)
                </option>
                <option value="name-desc" className="bg-gray-900">
                  Name (Z-A)
                </option>
                <option value="price-low" className="bg-gray-900">
                  Price (Low to High)
                </option>
                <option value="price-high" className="bg-gray-900">
                  Price (High to Low)
                </option>
              </select>
            </div>

            {/* Category Filter Buttons */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-4 py-2 rounded-lg font-medium border transition-all ${
                    selectedCategory === 'ALL'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                      : 'border-white/10 text-gray-400 hover:text-white hover:border-purple-500/60'
                  }`}
                >
                  {language === 'id' ? 'SEMUA' : 'ALL'}
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium border transition-all ${
                      selectedCategory === category.id
                        ? 'border-purple-500 bg-purple-500/10 text-purple-200'
                        : 'border-white/10 text-gray-400 hover:text-white hover:border-purple-500/60'
                    }`}
                  >
                    {category.icon && <span className="mr-2">{category.icon}</span>}
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-4 pb-20">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <p className="text-red-400 text-lg">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No products found</p>
            </div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProducts.map((product) => {
                const displayData = productDisplayData[product.slug] || {
                  image: product.heroImageUrl || '/img/placeholder.png',
                  gif: product.heroGifUrl || product.heroImageUrl || '/img/placeholder.png',
                };
                
                // Determine status badges based on product flags
                const statusBadges = [];
                if (product.status === 'ACTIVE' && !product.flags?.isUpdating) {
                  statusBadges.push({
                    label: "Available",
                    color: "text-green-400",
                    bgColor: "bg-green-500/20",
                    icon: "check",
                  });
                }
                if (product.flags?.isUpdating) {
                  statusBadges.push({
                    label: "Updating",
                    color: "text-yellow-400",
                    bgColor: "bg-yellow-500/20",
                    icon: "updating",
                  });
                }
                if (product.status === 'INACTIVE') {
                  statusBadges.push({
                    label: "Unavailable",
                    color: "text-red-400",
                    bgColor: "bg-red-500/20",
                    icon: "updating",
                  });
                }

                // Get first 3 features or show feature count
                const featuresToShow = product.features?.slice(0, 2) || [];
                const remainingFeatures = (product.features?.length || 0) - featuresToShow.length;

                // Get lowest price - handle empty plans array
                const lowestPlan = product.plans && product.plans.length > 0
                  ? product.plans.reduce((min, plan) => 
                      plan.priceNumber < min.priceNumber ? plan : min
                    )
                  : null;

                // Skip products without plans
                if (!lowestPlan) return null;

                return (
                  <motion.div
                    key={product.id}
                    variants={itemVariants}
                    onMouseEnter={() => setHoveredId(product.id!)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="group bg-[#0a0a0a] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-all duration-300"
                  >
                    {/* Product Image */}
                    <div className="relative h-64 overflow-hidden">
                      {/* Static Image */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: hoveredId === product.id ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Image
                          src={displayData.image}
                          alt={product.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </motion.div>

                      {/* GIF on Hover */}
                      <motion.div
                        className="absolute inset-0"
                        animate={{ opacity: hoveredId === product.id ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Image
                          src={displayData.gif}
                          alt={`${product.title} animation`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </motion.div>

                      {/* Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                      {/* Product Name Overlay */}
                      <div className="absolute bottom-4 left-4">
                        <h3 className="text-3xl font-bold text-white drop-shadow-lg">
                          {product.title}
                        </h3>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-6 space-y-4">
                      {/* Status Badges */}
                      {statusBadges.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {statusBadges.map((status, index) => (
                            <div
                              key={index}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bgColor}`}
                            >
                              {status.icon === "check" && (
                                <Check className={`w-3.5 h-3.5 ${status.color}`} />
                              )}
                              {status.icon === "updating" && (
                                <div
                                  className={`w-3.5 h-3.5 rounded-full border-2 border-current ${status.color} animate-spin border-t-transparent`}
                                />
                              )}
                              <span
                                className={`text-xs font-semibold ${status.color}`}
                              >
                                {status.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-gray-400 text-sm leading-relaxed min-h-[40px] line-clamp-2">
                        {product.subtitle || product.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-2">
                        {featuresToShow.map((feature, index) => (
                          <div key={feature.id} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-gray-300 text-sm truncate">
                              {feature.title}
                            </span>
                          </div>
                        ))}
                        {remainingFeatures > 0 && (
                          <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                            <span className="text-gray-300 text-sm">
                              {remainingFeatures} more feature{remainingFeatures > 1 ? 's' : ''}
                            </span>
                            <Info className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                          </div>
                        )}
                      </div>

                      {/* Price and Button */}
                      <div className="flex items-end justify-between pt-4 border-t border-white/5">
                        <div>
                          <p className="text-gray-500 text-xs mb-1">Starting at</p>
                          <p className="text-white font-bold text-2xl">
                            {lowestPlan.priceString}{" "}
                            <span className="text-gray-500 text-sm font-normal">
                              {lowestPlan.period || ''}
                            </span>
                          </p>
                        </div>
                        <Link href={`/products/${product.slug}`}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-red-500 text-white text-sm font-semibold rounded-lg hover:from-pink-600 hover:to-red-600 transition-all shadow-lg shadow-pink-500/25"
                          >
                            Buy Now!
                          </motion.button>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
    </main>
    </>
  );
}
