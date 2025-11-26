"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageCircle } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  icon: "update" | "contact";
}

const notifications: Notification[] = [
  {
    id: 1,
    title: "UPDATE PRODUCT",
    message: "New features and improvements are now available!",
    icon: "update",
  },
  {
    id: 2,
    title: "CONTACT SUPPORT",
    message: "Need help? Our support team is ready to assist you.",
    icon: "contact",
  },
];

export default function AppleNotification() {
  const [visibleNotifications, setVisibleNotifications] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Show first notification after 1 second
    const initialTimer = setTimeout(() => {
      if (notifications[0]) {
        setVisibleNotifications([notifications[0].id]);
      }
    }, 1000);

    return () => clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    // Show next notification every 5 seconds (4s display + 1s gap)
    if (currentIndex < notifications.length - 1) {
      const timer = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setVisibleNotifications([notifications[currentIndex + 1].id]);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  // Auto dismiss after 4 seconds
  useEffect(() => {
    visibleNotifications.forEach((id) => {
      const timer = setTimeout(() => {
        setVisibleNotifications((prev) => prev.filter((nId) => nId !== id));
      }, 4000);

      return () => clearTimeout(timer);
    });
  }, [visibleNotifications]);

  const handleDismiss = (id: number) => {
    setVisibleNotifications((prev) => prev.filter((nId) => nId !== id));
  };

  const getIcon = (type: "update" | "contact") => {
    if (type === "update") {
      return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
    return <MessageCircle className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) =>
          visibleNotifications.includes(notification.id) ? (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: -50, scale: 0.9, x: 100 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
              className="pointer-events-auto w-80 bg-black/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Gradient top border (Apple style) */}
              <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500" />

              <div className="p-4 flex items-start gap-3">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
                >
                  {getIcon(notification.icon)}
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <motion.h3
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm font-bold text-white tracking-wide"
                  >
                    {notification.title}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xs text-gray-400 mt-1 line-clamp-2"
                  >
                    {notification.message}
                  </motion.p>
                </div>

                {/* Close Button */}
                <motion.button
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => handleDismiss(notification.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                </motion.button>
              </div>

              {/* Progress bar */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 4, ease: "linear" }}
                className="h-0.5 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 origin-left"
              />
            </motion.div>
          ) : null
        )}
      </AnimatePresence>
    </div>
  );
}
