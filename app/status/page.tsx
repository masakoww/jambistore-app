"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, Clock, AlertCircle } from "lucide-react";

const productStatus = [
  {
    id: 1,
    name: "FiveM",
    image: "/img/fivem.png",
    statuses: [
      {
        label: "Undetected",
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        icon: Check,
      },
      {
        label: "Up to Date",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        icon: Check,
      },
    ],
    detectionInfo: "Never detected",
  },
  {
    id: 2,
    name: "Fortnite",
    image: "/img/fornite.png",
    statuses: [
      {
        label: "Undetected",
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        icon: Check,
      },
      {
        label: "Updating",
        color: "text-red-400",
        bgColor: "bg-red-500/20",
        icon: Clock,
      },
    ],
    detectionInfo: "Never detected",
  },
  {
    id: 3,
    name: "Squad",
    image: "/img/squad.png",
    statuses: [
      {
        label: "Undetected",
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        icon: Check,
      },
      {
        label: "Up to Date",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        icon: Check,
      },
    ],
    detectionInfo: "Never detected",
  },
  {
    id: 4,
    name: "Free Fire Internal",
    image: "/img/freefire.png",
    statuses: [
      {
        label: "Undetected",
        color: "text-green-400",
        bgColor: "bg-green-500/20",
        icon: Check,
      },
      {
        label: "Up to Date",
        color: "text-blue-400",
        bgColor: "bg-blue-500/20",
        icon: Check,
      },
    ],
    detectionInfo: "Never detected",
  },
];

export default function StatusPage() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Product Status
          </h1>
          <p className="text-blue-400 text-lg">
            Real-time status of our products and services
          </p>
        </div>
      </section>

      {/* Status List */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto space-y-4">
          {productStatus.map((product) => (
            <div
              key={product.id}
              className="group bg-white/5 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all duration-300 overflow-hidden"
            >
              <div className="flex items-center gap-4 p-4">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/10">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-white mb-2">
                    {product.name}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Status Badges */}
                    {product.statuses.map((status, index) => {
                      const IconComponent = status.icon;
                      return (
                        <div
                          key={index}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${status.bgColor}`}
                        >
                          <IconComponent
                            className={`w-3.5 h-3.5 ${status.color}`}
                          />
                          <span
                            className={`text-xs font-semibold ${status.color}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      );
                    })}

                    {/* Detection Info */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-gray-400">
                        {product.detectionInfo}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
