'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Shield, Clock, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ConnectDiscordPromptProps {
  isLoggedIn: boolean;
  orderId?: string;
  productName?: string;
}

export default function ConnectDiscordPrompt({ 
  isLoggedIn, 
  orderId, 
  productName 
}: ConnectDiscordPromptProps) {
  
  if (!isLoggedIn) {
    // Guest user - prompt to sign up
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl border border-white/10 p-8"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Unlock Live Chat Support
          </h3>
          <p className="text-gray-400">
            Sign up to get instant help with your order
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-1">
                Real-time Chat Support
              </h4>
              <p className="text-gray-400 text-xs">
                Get instant help from our support team via Discord
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-1">
                Order History & Tracking
              </h4>
              <p className="text-gray-400 text-xs">
                View all your orders in one place
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-1">
                Priority Support
              </h4>
              <p className="text-gray-400 text-xs">
                Get faster responses and dedicated assistance
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-1">
                Secure Account
              </h4>
              <p className="text-gray-400 text-xs">
                Keep your orders and information safe
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <Link
            href="/register"
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            <span>Sign Up with Discord</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/register"
            className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Sign Up with Email
          </Link>

          <Link
            href="/login"
            className="w-full py-3 text-gray-400 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Already have an account? <span className="text-purple-400">Login</span>
          </Link>
        </div>
      </motion.div>
    );
  }

  // Logged in but no Discord - prompt to connect
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl border border-white/10 p-8"
    >
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Connect Your Discord
        </h3>
        <p className="text-gray-400">
          Enable live chat support for your order
        </p>
      </div>

      {/* Order Info */}
      {productName && (
        <div className="mb-6 p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs mb-1">Current Order</p>
              <p className="text-white font-semibold">{productName}</p>
            </div>
            {orderId && (
              <div className="text-right">
                <p className="text-gray-400 text-xs mb-1">Order ID</p>
                <p className="text-white font-mono text-xs">{orderId.slice(0, 12)}...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Benefits */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
          <MessageSquare className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <p className="text-white text-sm">
            Chat directly with support about your order
          </p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
          <Zap className="w-5 h-5 text-purple-400 flex-shrink-0" />
          <p className="text-white text-sm">
            Get instant updates and notifications
          </p>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
          <Shield className="w-5 h-5 text-pink-400 flex-shrink-0" />
          <p className="text-white text-sm">
            Secure and verified support channel
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href="/profile"
        className="w-full py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
        <span>Connect Discord Account</span>
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Link>

      <p className="text-center text-gray-500 text-xs mt-4">
        You'll be able to manage your connection anytime from your profile
      </p>
    </motion.div>
  );
}
