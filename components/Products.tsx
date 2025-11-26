"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

// Fetch and show the top 4 best-selling products.
// Tries /api/products (expects [{ name,image,gif,gradient,sales }]) and falls back to local data.

type Product = {
  name: string;
  image: string;
  gif: string;
  gradient: string;
  sales: number;
};

const fallbackProducts: Product[] = [
  {
    name: "FiveM",
    image: "/img/fivem-banner.png",
    gif: "/gif/fivem.gif",
    gradient: "from-orange-500/20 to-yellow-500/20",
    sales: 4200,
  },
  {
    name: "Fortnite",
    image: "/img/fornite.png",
    gif: "/gif/fornite.gif",
    gradient: "from-blue-500/20 to-purple-500/20",
    sales: 3800,
  },
  {
    name: "Squad",
    image: "/img/squad.png",
    gif: "/gif/squad.gif",
    gradient: "from-gray-500/20 to-green-500/20",
    sales: 2100,
  },
  {
    name: "Free Fire",
    image: "/img/freefire.png",
    gif: "/gif/freefirebanner.gif",
    gradient: "from-orange-500/20 to-red-500/20",
    sales: 2900,
  },
  // additional items can exist on the server; fallback ensures UI works offline/dev
];

const useTopSelling = (count = 4) => {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // Fetch top-selling products
        const res = await fetch(`/api/products/top-selling?limit=${count}`);
        if (!res.ok) throw new Error("Failed to fetch top-selling products");
        const data = await res.json();
        
        if (!data.ok || !data.data) {
          throw new Error("Invalid response");
        }

        // Map API response to component format
        const productsWithDisplay = data.data.map((p: any) => {
          const displayData = {
            "fivem-cheat": { image: "/img/fivem-banner.png", gif: "/gif/fivem.gif", gradient: "from-orange-500/20 to-yellow-500/20" },
            "fortnite-cheat": { image: "/img/fornite.png", gif: "/gif/fornite.gif", gradient: "from-blue-500/20 to-purple-500/20" },
            "squad-cheat": { image: "/img/squad.png", gif: "/gif/squad.gif", gradient: "from-gray-500/20 to-green-500/20" },
            "freefire-cheat": { image: "/img/freefire.png", gif: "/gif/freefirebanner.gif", gradient: "from-orange-500/20 to-red-500/20" },
          } as Record<string, any>;

          const display = displayData[p.slug] || {
            image: p.heroImageUrl || "/img/placeholder.png",
            gif: p.heroGifUrl || p.heroImageUrl || "/img/placeholder.png",
            gradient: "from-purple-500/20 to-pink-500/20"
          };

          return {
            name: p.title,
            image: display.image,
            gif: display.gif,
            gradient: display.gradient,
            sales: p.sales || 0,
          };
        });

        if (mounted) setProducts(productsWithDisplay);
      } catch (error) {
        console.error("Error loading top-selling products:", error);
        // fallback: pick top `count` from local dataset
        const topFallback = [...fallbackProducts]
          .sort((a, b) => b.sales - a.sales)
          .slice(0, count);
        if (mounted) setProducts(topFallback);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [count]);

  return products;
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  },
};

export default function Products() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const products = useTopSelling(4);

  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Our Products
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-400 text-lg"
          >
            Click on any game below to explore our available cheats and features
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 flex justify-center"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ChevronDown className="w-6 h-6 text-gray-500" />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Products Grid - Horizontal Layout */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {products.map((product, index) => (
            <motion.div key={index} variants={item}>
              <Link
                href={`/products/${product.name.toLowerCase().replace(/\s+/g, '')}`}
                className="group relative overflow-hidden rounded-xl block"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ aspectRatio: "16/9" }}
              >
                {/* Background Image/GIF with smooth transition */}
                <div className="absolute inset-0 bg-black">
                  {/* Static Image */}
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: hoveredIndex === index ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                      loading="lazy"
                      decoding="async"
                    />
                  </motion.div>

                  {/* GIF on hover */}
                  <motion.div
                    className="absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Image
                      src={product.gif}
                      alt={`${product.name} animation`}
                      fill
                      className="object-cover"
                      unoptimized
                      loading="lazy"
                      decoding="async"
                    />
                  </motion.div>

                  {/* Gradient Overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${product.gradient} opacity-30 group-hover:opacity-50 transition-opacity duration-300`}
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300" />
                </div>

                {/* Content Overlay */}
                <div className="relative h-full flex flex-col justify-between p-6 z-10">
                  {/* Top: Logo/Initial */}
                  <motion.div
                    className="self-start"
                    initial={{ rotate: -10, opacity: 0 }}
                    whileInView={{ rotate: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.4 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.6 }}
                      className="w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                    >
                      <span className="font-bold text-xl text-white">
                        {product.name[0]}
                      </span>
                    </motion.div>
                  </motion.div>

                  {/* Bottom: Game Name */}
                  <motion.div
                    whileHover={{ x: 5 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                      {product.name}
                    </h3>
                  </motion.div>

                  {/* Shine effect on hover */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.8 }}
                    style={{ pointerEvents: "none" }}
                  />
                </div>

                {/* Border glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-purple-500/50"
                  initial={{ opacity: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
