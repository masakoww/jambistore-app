"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [email, setEmail] = useState("");
  const [oobCode, setOobCode] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'invalid', message: string } | null>(null);

  useEffect(() => {
    const code = searchParams.get('oobCode');
    
    if (!code) {
      setStatus({
        type: 'invalid',
        message: "Invalid or missing reset link. Please request a new password reset."
      });
      setIsVerifying(false);
      return;
    }

    // Verify the reset code
    verifyPasswordResetCode(auth, code)
      .then((email) => {
        setEmail(email);
        setOobCode(code);
        setIsVerifying(false);
      })
      .catch((error) => {
        console.error("Code verification error:", error);
        let errorMessage = "This password reset link is invalid or has expired.";
        if (error.code === 'auth/expired-action-code') {
          errorMessage = "This password reset link has expired. Please request a new one.";
        } else if (error.code === 'auth/invalid-action-code') {
          errorMessage = "This password reset link is invalid. It may have already been used.";
        }
        setStatus({
          type: 'invalid',
          message: errorMessage
        });
        setIsVerifying(false);
      });
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    // Validate passwords
    if (password.length < 6) {
      setStatus({
        type: 'error',
        message: "Password must be at least 6 characters long."
      });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({
        type: 'error',
        message: "Passwords do not match."
      });
      return;
    }

    if (!oobCode) {
      setStatus({
        type: 'error',
        message: "Invalid reset code. Please request a new password reset."
      });
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setStatus({
        type: 'success',
        message: "Password reset successful! Redirecting to login..."
      });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?message=password_reset_success');
      }, 2000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = "Failed to reset password. Please try again.";
      if (error.code === 'auth/expired-action-code') {
        errorMessage = "This reset link has expired. Please request a new one.";
      } else if (error.code === 'auth/invalid-action-code') {
        errorMessage = "This reset link is invalid or has already been used.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please use a stronger password.";
      }
      setStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while verifying code
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-pink-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying reset link...</p>
        </motion.div>
      </div>
    );
  }

  // Invalid or expired link
  if (status?.type === 'invalid') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-white/10 p-8 shadow-2xl text-center"
        >
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Reset Link</h1>
          <p className="text-gray-400 mb-6">{status.message}</p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center justify-center w-full py-3 bg-gradient-to-r from-pink-400 to-pink-300 text-black font-bold rounded-xl hover:from-pink-500 hover:to-pink-400 transition-all"
          >
            Request New Reset Link
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-gray-400 hover:text-white mt-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (status?.type === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-white/10 p-8 shadow-2xl text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Password Reset Successful</h1>
          <p className="text-gray-400 mb-4">{status.message}</p>
          <Loader2 className="w-6 h-6 text-pink-400 animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#0a0a0a] rounded-2xl border border-white/10 p-8 shadow-2xl"
      >
        <Link 
          href="/login" 
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Login
        </Link>

        <h1 className="text-3xl font-bold text-white mb-2">Set New Password</h1>
        <p className="text-gray-400 mb-8">
          Enter a new password for <span className="text-pink-400">{email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <div>
            <label className="block text-white font-semibold mb-2">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-white font-semibold mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {status?.type === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400"
            >
              {status.message}
            </motion.div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-pink-400 to-pink-300 text-black font-bold rounded-xl hover:from-pink-500 hover:to-pink-400 transition-all shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Resetting Password...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-pink-400 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
