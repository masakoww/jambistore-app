"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Features from "@/components/Features";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import MoreProducts from "@/components/MoreProducts";
import PaymentMethods from "@/components/PaymentMethods";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import ParticleBackground from "@/components/animations/ParticleBackground";
import AppleNotification from "@/components/AppleNotification";
import FloatingButtons from "@/components/FloatingButton";
import { AnimatePresence, motion } from "framer-motion";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && (
          <LoadingScreen onLoadingComplete={() => setIsLoading(false)} />
        )}
      </AnimatePresence>

      {!isLoading && (
        <>
          <AppleNotification />
          <ParticleBackground />
          
          <motion.main
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-black relative z-10"
          >
            <Navbar />
            <Hero />
            <Products />
            <Features />
            <Reviews />
            <FAQ />
            <MoreProducts />
            <PaymentMethods />
            <FloatingButtons />
            <Footer />
          </motion.main>
        </>
      )}
    </>
  );
}
