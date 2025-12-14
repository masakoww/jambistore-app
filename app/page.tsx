import dynamic from 'next/dynamic';
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import AppleNotification from "@/components/AppleNotification";

// Lazy load components below the fold for faster initial load
const Products = dynamic(() => import("@/components/Products"), {
  loading: () => <div className="min-h-[400px] bg-black animate-pulse" />,
  ssr: true,
});

const Features = dynamic(() => import("@/components/Features"), {
  loading: () => <div className="min-h-[300px] bg-black" />,
  ssr: true,
});

const Reviews = dynamic(() => import("@/components/Reviews"), {
  loading: () => <div className="min-h-[300px] bg-black" />,
  ssr: true,
});

const FAQ = dynamic(() => import("@/components/FAQ"), {
  loading: () => <div className="min-h-[200px] bg-black" />,
  ssr: true,
});

const MoreProducts = dynamic(() => import("@/components/MoreProducts"), {
  loading: () => <div className="min-h-[300px] bg-black" />,
  ssr: true,
});

const PaymentMethods = dynamic(() => import("@/components/PaymentMethods"), {
  loading: () => <div className="min-h-[200px] bg-black" />,
  ssr: true,
});

const Footer = dynamic(() => import("@/components/Footer"), {
  loading: () => <div className="min-h-[100px] bg-black" />,
  ssr: true,
});

export default function Home() {
  return (
    <>
      <AppleNotification />
      
      <main className="min-h-screen bg-black relative z-10">
        <Navbar />
        <Hero />
        <Products />
        <Features />
        <Reviews />
        <FAQ />
        <MoreProducts />
        <PaymentMethods />
        <Footer />
      </main>
    </>
  );
}
