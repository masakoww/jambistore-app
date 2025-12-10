import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Products from "@/components/Products";
import Features from "@/components/Features";
import Reviews from "@/components/Reviews";
import FAQ from "@/components/FAQ";
import MoreProducts from "@/components/MoreProducts";
import PaymentMethods from "@/components/PaymentMethods";
import Footer from "@/components/Footer";
import AppleNotification from "@/components/AppleNotification";

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
