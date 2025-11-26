"use client";

import {
  Shield,
  Zap,
  MessageCircle,
  Sliders,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "Secure & Verified",
    description:
      "All products are sourced from official distributors and verified authentic. Your purchases are protected with secure payment processing and encrypted delivery.",
  },
  {
    icon: Zap,
    title: "Instant Delivery",
    description:
      "Receive your product keys and download links immediately after payment. No waiting, no delays - start using your purchase within seconds of checkout.",
  },
  {
    icon: MessageCircle,
    title: "24/7 Support",
    description:
      "Our dedicated support team is available around the clock via live chat and email. Get help with activation, troubleshooting, or any questions anytime you need it.",
  },
  {
    icon: Sliders,
    title: "Flexible Licensing",
    description:
      "Choose from various license options to match your needs - from single-device licenses to multi-user plans. Scale up or down based on your requirements.",
  },
  {
    icon: RefreshCw,
    title: "Lifetime Updates",
    description:
      "Many products include free lifetime updates and ongoing support. Stay current with the latest versions and features without additional costs.",
  },
  {
    icon: TrendingUp,
    title: "Best Value Prices",
    description:
      "Competitive pricing on all digital products with frequent promotions and bundle deals. Get premium software and services without breaking the bank.",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
    },
  },
};

export default function Features() {
  return (
    <section className="py-20 px-4 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-white mb-4"
          >
            Why Choose Us
          </motion.h2>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.3 },
              }}
              className="group p-6 rounded-xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-purple-500/50 transition-colors duration-300"
            >
              {/* Icon */}
              <motion.div
                className="mb-4 w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center"
                whileHover={{
                  rotate: 360,
                  scale: 1.1,
                }}
                transition={{ duration: 0.6 }}
              >
                <feature.icon className="w-6 h-6 text-purple-400" />
              </motion.div>

              {/* Title */}
              <motion.h3
                className="text-xl font-bold text-white mb-3"
                whileHover={{ x: 5 }}
                transition={{ duration: 0.2 }}
              >
                {feature.title}
              </motion.h3>

              {/* Description */}
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Glow Effect */}
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300 pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
