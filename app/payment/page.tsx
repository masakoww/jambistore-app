"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Wallet,
  Bitcoin,
  ArrowLeft,
  Check,
  Shield,
  Lock,
  AlertCircle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/firebase";
import { useModal } from "@/contexts/ModalContext";
import type { PaymentGateway } from '@/types/settings';

// Payment gateway API routes:
// - /app/api/pakasir/create/route.ts and /app/api/pakasir/status/route.ts
// - /app/api/ipaymu/create/route.ts and /app/api/ipaymu/status/route.ts
// - /app/api/tokopay/create/route.ts and /app/api/tokopay/status/route.ts

interface QRISData {
  reference: string;
  qr_url: string;
  qr_string: string;
  amount: number;
  expired_time: number;
}

interface PaymentStatus {
  status: "UNPAID" | "PAID" | "EXPIRED" | "FAILED";
  reference: string;
  amount: number;
  paid_amount?: number;
}

// Payment method types - will be dynamically updated with manual QRIS options
const defaultPaymentMethods = [
  {
    id: "qris",
    name: "Auto QRIS",
    description: "Automatic verification via QRIS",
    icon: Wallet,
    badge: "Instant",
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "paypal",
    name: "PayPal",
    description: "Fast and secure with PayPal",
    icon: CreditCard,
    badge: null,
    color: "from-blue-600 to-blue-700",
  },
];

// Product data
const productData: Record<string, any> = {
  fivem: {
    name: "FiveM",
    image: "/img/fivem-banner.png",
    plans: {
      weekly: { price: 13, period: "Weekly" },
      monthly: { price: 20, period: "Monthly" },
      lifetime: { price: 82, period: "Lifetime" },
    },
  },
  fortnite: {
    name: "Fortnite",
    image: "/img/fornite.png",
    plans: {
      daily: { price: 10, period: "Daily" },
      weekly: { price: 30, period: "Weekly" },
      monthly: { price: 60, period: "Monthly" },
    },
  },
  squad: {
    name: "Squad",
    image: "/img/squad.png",
    plans: {
      daily: { price: 5, period: "Daily" },
      weekly: { price: 15, period: "Weekly" },
      monthly: { price: 45, period: "Monthly" },
    },
  },
  freefire: {
    name: "Free Fire Internal",
    image: "/img/freefire.png",
    plans: {
      "1hour": { price: 0.068, period: "1 Hour" },
      "2days": { price: 1.7, period: "2 Days" },
      "7days": { price: 2.7, period: "7 Days" },
      "30days": { price: 6.8, period: "30 Days" },
      lifetime: { price: 47, period: "Lifetime" },
    },
  },
};

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert } = useModal();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  // Prevent back navigation after order is created
  useEffect(() => {
    const orderIdFromUrl = searchParams.get("orderId");
    if (orderIdFromUrl) {
      // Disable browser back button for orders
      const handlePopState = (e: PopStateEvent) => {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      };
      
      window.history.pushState(null, '', window.location.href);
      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [searchParams]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [step, setStep] = useState(1); // 1: Select Method, 2: Payment Details, 3: Confirmation
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrisData, setQrisData] = useState<QRISData | null>(null);
  const [isGeneratingQRIS, setIsGeneratingQRIS] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(
    null,
  );
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [activeGateway, setActiveGateway] = useState<PaymentGateway>('pakasir');
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentSettings, setPaymentSettings] = useState<any>({ methods: { manualQRIS: true, autoQRIS: false, paypal: false } });
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [manualQRISSettings, setManualQRISSettings] = useState<any>(null);
  const [loadingManualQRIS, setLoadingManualQRIS] = useState(true);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [idempotencyKey] = useState(() => `web-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  // Get orderId from URL params
  const orderIdFromUrl = searchParams.get("orderId");

  // Fallback to hardcoded data (for old links)
  const productId = searchParams.get("product") || "fivem";
  const planId = searchParams.get("plan") || "weekly";

  const product = orderData ? {
    name: orderData.productName,
    image: orderData.productImage || `/img/${orderData.productSlug}-banner.png`, // Use stored image or fallback
    plans: {

      [(orderData.planId || orderData.item?.planId || 'default')]: {
        price: orderData.total || orderData.item?.price || 0,
        period: orderData.planName || orderData.item?.planName || '',
      }
    }
  } : productData[productId];
  
  const plan = orderData ? {
    price: orderData.total || orderData.item?.price || 0,
    period: orderData.planName || orderData.item?.planName || '',
  } : product?.plans[planId];

  // Build payment methods array dynamically based on enabled settings
  const paymentMethods = [
    // Manual QRIS options (if manualQRIS enabled AND specific QRIS enabled)
    ...(paymentSettings?.methods?.manualQRIS && manualQRISSettings?.qris1?.enabled ? [{
      id: "manual_qris_1",
      name: manualQRISSettings.qris1.label || "Manual QRIS 1",
      description: manualQRISSettings.qris1.description || "Upload payment proof after scanning",
      icon: Wallet,
      badge: "Manual",
      color: "from-purple-500 to-pink-500",
    }] : []),
    ...(paymentSettings?.methods?.manualQRIS && manualQRISSettings?.qris2?.enabled ? [{
      id: "manual_qris_2",
      name: manualQRISSettings.qris2.label || "Manual QRIS 2",
      description: manualQRISSettings.qris2.description || "Upload payment proof after scanning",
      icon: Wallet,
      badge: "Manual",
      color: "from-pink-500 to-red-500",
    }] : []),
    // Auto QRIS (if autoQRIS enabled)
    ...(paymentSettings?.methods?.autoQRIS ? [{
      id: "qris",
      name: "Auto QRIS",
      description: "Automatic verification via QRIS",
      icon: Wallet,
      badge: "Instant",
      color: "from-blue-500 to-cyan-500",
    }] : []),
    // PayPal (if paypal enabled)
    ...(paymentSettings?.methods?.paypal ? [{
      id: "paypal",
      name: "PayPal",
      description: "Fast and secure with PayPal",
      icon: CreditCard,
      badge: null,
      color: "from-blue-600 to-blue-700",
    }] : [])
  ];

  // Set email from user if logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Fetch order data from Firestore
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderIdFromUrl) {
        console.log('⚠️ No order ID in URL, using hardcoded product data');
        setLoadingOrder(false);
        return;
      }

      try {
        setLoadingOrder(true);
        console.log('📦 Fetching order:', orderIdFromUrl);
        
        // Fetch via API instead of direct Firestore access (avoids permission issues)
        const response = await fetch(`/api/orders/${orderIdFromUrl}`);
        const data = await response.json();
        
        if (data.ok && data.order) {
          console.log('✅ Order loaded:', data.order);
          setOrderData(data.order);
          setOrderId(orderIdFromUrl);
          
          // Set customer info if available
          if (data.order.customer?.email) {
            setEmail(data.order.customer.email);
          }
          if (data.order.customer?.name) {
            setCustomerName(data.order.customer.name);
          }
          if (data.order.customer?.phone) {
            setCustomerPhone(data.order.customer.phone);
          }

          // Check if product has a specific gateway configured
          if (data.order.productGateway) {
            console.log('🎯 Product-specific gateway:', data.order.productGateway);
            setActiveGateway(data.order.productGateway);
          }
        } else {
          console.error('❌ Order not found:', orderIdFromUrl, data.message);
        }
      } catch (error) {
        console.error('❌ Error fetching order:', error);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [orderIdFromUrl]);

  useEffect(() => {
    if (!orderIdFromUrl || !orderData || hasRedirected) return;

    if (orderData.locked === true || (orderData.status && orderData.status !== 'PENDING')) {
      setHasRedirected(true);
      const params = new URLSearchParams();
      params.set('order', orderIdFromUrl);
      params.set('from', 'payment-locked');
      router.replace(`/track?${params.toString()}`);
    }
  }, [orderIdFromUrl, orderData, hasRedirected, router]);

  // Load active payment gateway and payment methods from API
  useEffect(() => {
    const loadGatewaySettings = async () => {
      try {
        const response = await fetch('/api/settings/payment');
        const data = await response.json();
        
        if (data.ok) {
          // Store payment settings (which methods are enabled)
          setPaymentSettings(data);
          setActiveGateway(data.activeGateway || 'pakasir');
          console.log('🔧 Payment settings loaded:', data.methods);
          console.log('🔧 Active payment gateway:', data.activeGateway || 'pakasir');
        } else {
          console.log('⚙️ No gateway settings found, using defaults');
          setActiveGateway('pakasir');
        }
      } catch (error) {
        console.error('Error loading gateway settings:', error);
        // Default to pakasir if error
        setActiveGateway('pakasir');
      }
    };

    loadGatewaySettings();
  }, []);

  // Load manual QRIS settings
  useEffect(() => {
    const loadManualQRISSettings = async () => {
      try {
        setLoadingManualQRIS(true);
        const response = await fetch('/api/settings/manual-qris');
        const data = await response.json();
        
        if (data.ok) {
          setManualQRISSettings(data.settings);
          console.log('🔧 Manual QRIS settings loaded:', data.settings);
        }
      } catch (error) {
        console.error('Error loading manual QRIS settings:', error);
      } finally {
        setLoadingManualQRIS(false);
      }
    };

    loadManualQRISSettings();
  }, []);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Close QR modal on ESC key press
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isQRModalOpen) {
        setIsQRModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isQRModalOpen]);

  const handlePaymentMethodSelect = async (methodId: string) => {
    setSelectedMethod(methodId);

    // If QRIS selected, generate QR code immediately
    if (methodId === "qris") {
      setTimeout(async () => {
        setStep(2);
        await generateQRIS();
      }, 300);
    } else if (methodId === "manual_qris_1" || methodId === "manual_qris_2") {
      // For manual QRIS, just go to step 2 to show QR code and upload form
      setTimeout(() => setStep(2), 300);
      
      // Update order payment method
      if (orderId) {
        try {
          await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              payment: {
                provider: methodId,
                status: 'PENDING'
              }
            })
          });
        } catch (error) {
          console.error('Error updating order payment method:', error);
        }
      }
    } else {
      setTimeout(() => setStep(2), 300);
    }
  };

  // Generate QRIS code via Backend API (Dynamic Gateway)
  const generateQRIS = async () => {
    // Validate required fields
    if (!email || !email.trim()) {
      setPaymentError("Please enter your email address");
      return;
    }

    if (!customerPhone || !customerPhone.trim()) {
      setPaymentError("Please enter your phone number");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setPaymentError("Please enter a valid email address");
      return;
    }

    setIsGeneratingQRIS(true);
    setPaymentError(null);

    try {
      // Update order with customer info if we have an orderId
      if (orderId) {
        console.log('📝 Updating order with customer info:', orderId);
        try {
          await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              customer: {
                name: email.split('@')[0],
                email: email,
                phone: customerPhone,
              },
            }),
          });
        } catch (updateError) {
          console.warn('⚠️ Failed to update order customer info:', updateError);
          // Continue anyway - not critical
        }
      }

      let amountIDR: number;
      
      // If we have order data, use the total directly (already in IDR)
      if (orderData) {
        amountIDR = orderData.total || orderData.amount || 0;
        console.log('💰 Using order total (IDR):', amountIDR);
      } else {
        // Fallback: convert USD to IDR for hardcoded prices
        const amount = parseFloat(getTotalAmount());
        amountIDR = Math.round(amount * 15000);
        console.log('💰 Converting USD to IDR:', amount, '→', amountIDR);
      }
      
      const merchantRef = `${activeGateway.toUpperCase()}_${Date.now()}`;

      const payload = {
        merchant_ref: merchantRef,
        amount: amountIDR,
        customer_name: email.split('@')[0] || "Customer", // Use email prefix as name
        customer_email: email || "noemail@example.com",
        customer_phone: customerPhone || "081234567890",
        order_id: merchantRef,
        order_items: [
          {
            sku: product.name.toUpperCase(),
            name: `${product.name} - ${plan.period}`,
            price: amountIDR,
            quantity: 1,
            product_url: window.location.origin,
            image_url: `${window.location.origin}${product.image}`,
          },
        ],
        return_url: `${window.location.origin}/track?order=${orderId || merchantRef}`,

      };

      console.log(`🚀 Generating QRIS via ${activeGateway} gateway...`, payload);

      // Call dynamic backend API route based on active gateway
      const response = await fetch(`/api/${activeGateway}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log(`📥 ${activeGateway.toUpperCase()} API Response:`, data);

      if (data.success && data.data) {
        // Map different gateway response formats to common format
        const qrUrl = data.data.qr_url || data.data.qr_link || data.data.qr_image;
        const qrString = data.data.qr_string || data.data.qr_content;
        const reference = data.data.reference || data.data.trx_id || data.data.transaction_id || merchantRef;
        
        setQrisData({
          reference: reference,
          qr_url: qrUrl,
          qr_string: qrString,
          amount: data.data.amount || data.data.total_bayar || amountIDR,
          expired_time: data.data.expired_time || data.data.expired_ts || Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        });

        console.log(`✅ QRIS generated successfully via ${activeGateway}!`);
        console.log("📍 Reference:", reference);
        console.log("💰 Amount:", data.data.amount || amountIDR);

        // Start polling payment status
        startPaymentStatusPolling(reference);
      } else {
        console.error(`❌ Failed to generate QRIS via ${activeGateway}:`, data.message);
        setPaymentError(data.message || `Failed to generate QRIS code from ${activeGateway}. Please check your API configuration.`);
      }
    } catch (error) {
      console.error(`❌ Error generating QRIS via ${activeGateway}:`, error);
      setPaymentError(
        `Failed to connect to ${activeGateway} payment gateway. Please try again.`,
      );
    } finally {
      setIsGeneratingQRIS(false);
    }
  };

  // Check payment status via Backend API (Dynamic Gateway)
  const checkPaymentStatus = async (reference: string) => {
    try {
      // Get amount from qrisData for payment verification
      const amount = qrisData?.amount || 0;
      
      // Build query params based on gateway requirements
      let queryParams = `reference=${reference}`;
      if (activeGateway === 'pakasir') {
        queryParams += `&amount=${amount}`;
      } else if (activeGateway === 'ipaymu') {
        queryParams += `&transactionId=${reference}`;
      } else if (activeGateway === 'tokopay') {
        queryParams += `&trx_id=${reference}`;
      }
      
      const response = await fetch(
        `/api/${activeGateway}/status?${queryParams}`,
        {
          method: "GET",
        },
      );

      const data = await response.json();

      if (data.success && data.data) {
        const status: PaymentStatus = {
          status: data.data.status,
          reference: data.data.reference,
          amount: data.data.amount,
          paid_amount: data.data.amount_received,
        };

        setPaymentStatus(status);

        console.log(`💳 Payment Status Update (${activeGateway}):`, {
          reference: reference,
          status: status.status,
          amount: status.amount,
          paid: status.paid_amount,
        });

        // If paid, stop polling
        if (status.status === "PAID") {
          console.log(`✅ Payment CONFIRMED via ${activeGateway}!`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`Error checking payment status via ${activeGateway}:`, error);
      return false;
    }
  };

  // Manual refresh payment status
  const handleManualRefresh = async () => {
    if (!qrisData?.reference) return;

    setIsManualRefreshing(true);
    try {
      const isPaid = await checkPaymentStatus(qrisData.reference);
      if (isPaid) {
        console.log("✅ Payment confirmed via manual refresh!");
      } else {
        console.log("⏳ Payment still pending...");
      }
    } catch (error) {
      console.error("Error during manual refresh:", error);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Poll payment status every 3 seconds
  const startPaymentStatusPolling = (reference: string) => {
    const pollInterval = setInterval(async () => {
      const isPaid = await checkPaymentStatus(reference);

      if (isPaid) {
        clearInterval(pollInterval);
      }
    }, 3000); // Check every 3 seconds

    // Store interval ID to clear on unmount
    return () => clearInterval(pollInterval);
  };


  const handleProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (images only)
    if (!file.type.startsWith('image/')) {
      setPaymentError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPaymentError('File size must be less than 5MB');
      return;
    }

    // Validate email before upload
    if (!email || !email.trim()) {
      setPaymentError('Please enter your email address first');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setPaymentError('Please enter a valid email address first');
      return;
    }

    if (!orderId) {
      setPaymentError('Order ID not found');
      return;
    }

    setProofFile(file);
    setPaymentError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // AUTO UPLOAD - Upload immediately when file is selected
    setUploadingProof(true);

    try {
      const formData = new FormData();
      formData.append('proof', file);
      formData.append('email', email);

      const response = await fetch(`/api/orders/${orderId}/upload-proof`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.ok) {
        // Mark proof as uploaded - this will auto-enable Complete Payment button
        setProofUploaded(true);
        console.log('✅ Payment proof uploaded successfully!');
      } else {
        setPaymentError(data.message || 'Failed to upload payment proof');
        // Clear file on error
        setProofFile(null);
        setProofPreview(null);
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      setPaymentError('Failed to upload payment proof. Please try again.');
      // Clear file on error
      setProofFile(null);
      setProofPreview(null);
    } finally {
      setUploadingProof(false);
    }
  };

  // Upload payment proof
  const handleUploadProof = async () => {
    if (!proofFile || !orderId) {
      setPaymentError('Please select a payment proof image');
      return;
    }

    if (!email || !email.trim()) {
      setPaymentError('Please enter your email address');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setPaymentError('Please enter a valid email address');
      return;
    }

    setUploadingProof(true);
    setPaymentError(null);

    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      formData.append('email', email);

      const response = await fetch(`/api/orders/${orderId}/upload-proof`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.ok) {
        // Mark proof as uploaded
        setProofUploaded(true);
        // Show success message
        showAlert('Payment proof uploaded successfully! You can now complete your payment.', 'success');
      } else {
        setPaymentError(data.message || 'Failed to upload payment proof');
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      setPaymentError('Failed to upload payment proof. Please try again.');
    } finally {
      setUploadingProof(false);
    }
  };

  // Complete payment and create Discord ticket if connected
  const handleCompletePayment = async () => {
    if (!orderId) {
      showAlert('Order ID not found. Please try again.', 'error');
      return;
    }

    setIsCompletingPayment(true);

    try {
      // Get Discord user ID if user is logged in
      let discordUserId = null;
      if (user?.uid) {
        try {
          const userDoc = await fetch(`/api/users/${user.uid}`);
          const userData = await userDoc.json();
          if (userData.ok && userData.user?.discordUserId) {
            discordUserId = userData.user.discordUserId;
          }
        } catch (err) {
          console.log('User not connected to Discord yet');
        }
      }

      const response = await fetch(`/api/orders/${orderId}/complete-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.uid,
          userEmail: user?.email || email,
          discordUserId: discordUserId,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        // Set payment completed state - show success modal instead of auto-redirect
        setPaymentCompleted(true);
        console.log('✅ Payment completed successfully!');
      } else {
        throw new Error(data.message || 'Failed to complete payment');
      }
    } catch (error: any) {
      console.error('Error completing payment:', error);
      showAlert('Failed to complete payment: ' + error.message, 'error');
    } finally {
      setIsCompletingPayment(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isProcessing) return;

    // Proof upload is now optional - users can complete payment without proof

    // For QRIS, check payment status first
    if (selectedMethod === "qris") {
      if (!qrisData) {
        setPaymentError("QRIS code not generated. Please try again.");
        return;
      }

      if (!paymentStatus || paymentStatus.status !== "PAID") {
        setPaymentError(
          "Payment not completed. Please scan and pay the QRIS code first.",
        );
        return;
      }

      // Verify amount matches
      if (
        paymentStatus.paid_amount &&
        paymentStatus.paid_amount !== qrisData.amount
      ) {
        setPaymentError(
          `Payment amount mismatch. Expected: ${qrisData.amount}, Received: ${paymentStatus.paid_amount}`,
        );
        return;
      }
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      let finalOrderId = orderId;

      // If we already have an order (from product page), just use it
      if (orderId) {
        console.log('✅ Using existing order:', orderId);
        // Optionally update order status to PAID

      } else {
        // Fallback: Create new order if coming from old flow
        console.log('⚠️ No existing order, creating new one...');
        const orderResponse = await fetch('/api/orders/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productSlug: orderData?.productSlug || productId,
            planId: orderData?.item?.planId || planId,
            userId: user?.uid,
            customer: {
              name: email.split('@')[0],
              email: email,
            },
            idempotencyKey,
          }),
        });

        const newOrderData = await orderResponse.json();

        if (!newOrderData.ok) {
          throw new Error(newOrderData.error || 'Failed to create order');
        }

        finalOrderId = newOrderData.orderId;
      }

      setOrderId(finalOrderId);
      setIsProcessing(false);
      setStep(3);

      // Auto redirect to track page after 3 seconds
      setTimeout(() => {
        window.location.href = `/track?order=${finalOrderId}`;
      }, 3000);
    } catch (error: any) {
      console.error("Error processing payment:", error);
      setPaymentError(error.message || "Failed to process payment. Please try again.");
      setIsProcessing(false);
    }
  };

  const getTaxAmount = () => {
    // If we have order data, tax is already included in the price
    if (orderData) {
      return "0";
    }
    return plan ? (plan.price * 0.1).toFixed(2) : "0.00";
  };

  const getTotalAmount = () => {
    // If we have order data, use the price directly (already in IDR, no tax to add)
    if (orderData) {

      const orderTotal = orderData.total || orderData.amount || 0;
      return orderTotal.toString();
    }
    // Fallback for old hardcoded prices (USD with tax)
    return plan ? (plan.price + parseFloat(getTaxAmount())).toFixed(2) : "0.00";
  };

  const formatPrice = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    // If we have order data, format as IDR
    if (orderData) {
      return `Rp ${num.toLocaleString('id-ID')}`;
    }
    
    // Fallback for old hardcoded prices (USD)
    return `$${num.toFixed(2)}`;
  };

  if (!product || !plan) {
    return (
      <main className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-32 pb-20 px-4 text-center">
          <h1 className="text-2xl text-white">Invalid product or plan</h1>
        </div>
        <Footer />
      </main>
    );
  }

  if (loadingOrder && orderIdFromUrl) {
    return (
      <main className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-32 pb-20 px-4 text-center">
          <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
          <h1 className="text-2xl text-white">Loading your order...</h1>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <>
    <main className="min-h-screen bg-black">
      <Navbar />

      {/* Page Header */}
      <section className="pt-32 pb-8 px-4">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Products</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Checkout
            </h1>
            <p className="text-gray-400">
              Complete your purchase securely and start using {product.name}{" "}
              today
            </p>
          </motion.div>

          {/* Progress Steps */}
          <div className="mt-8 flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step >= s
                      ? "border-pink-500 bg-pink-500/20 text-pink-400"
                      : "border-gray-600 text-gray-600"
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 md:w-24 h-0.5 mx-2 transition-all ${
                      step > s ? "bg-pink-500" : "bg-gray-600"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Summary - Sticky Sidebar */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 sticky top-24">
                <h2 className="text-xl font-bold text-white mb-4">
                  Order Summary
                </h2>

                {/* Product Card */}
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {product.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{plan.period} Access</p>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white font-semibold">
                      {formatPrice(plan.price)}
                    </span>
                  </div>
                  {!orderData && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Tax (10%)</span>
                      <span className="text-white font-semibold">
                        ${getTaxAmount()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-pink-400">
                    {formatPrice(getTotalAmount())}
                  </span>
                </div>

                {/* Security Badge */}
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Shield className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 text-sm font-semibold">
                      Secure Payment
                    </p>
                    <p className="text-gray-400 text-xs">
                      Your data is protected with SSL encryption
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Payment Methods & Forms */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-2"
            >
              <AnimatePresence mode="wait">
                {/* Step 1: Select Payment Method */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 md:p-8">
                      <h2 className="text-2xl font-bold text-white mb-2">
                        Select Payment Method
                      </h2>
                      <p className="text-gray-400 mb-6">
                        Choose your preferred way to pay
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentMethods.map((method) => (
                          <motion.button
                            key={method.id}
                            onClick={() => handlePaymentMethodSelect(method.id)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`relative p-6 rounded-xl border-2 transition-all text-left ${
                              selectedMethod === method.id
                                ? "border-pink-500 bg-pink-500/10"
                                : "border-white/10 bg-white/5 hover:border-white/20"
                            }`}
                          >
                            {method.badge && (
                              <div className="absolute top-3 right-3 px-2 py-1 bg-pink-500 text-white text-xs font-semibold rounded-full">
                                {method.badge}
                              </div>
                            )}

                            <div
                              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center mb-4`}
                            >
                              <method.icon className="w-6 h-6 text-white" />
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">
                              {method.name}
                            </h3>
                            <p className="text-gray-400 text-sm mb-4">
                              {method.description}
                            </p>

                            <div className="flex items-center gap-2 text-pink-400 text-sm font-semibold">
                              <span>Continue</span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Payment Details */}
                {step === 2 && selectedMethod && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 md:p-8">
                      <button
                        onClick={() => setStep(1)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Change payment method</span>
                      </button>

                      <h2 className="text-2xl font-bold text-white mb-2">
                        Payment Details
                      </h2>
                      <p className="text-gray-400 mb-6">
                        Complete your payment information
                      </p>

                      {/* IMPORTANT WARNING */}
                      <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-500/50">
                        <div className="flex items-start gap-3">
                          <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <div className="flex-1">
                            <h3 className="text-red-400 font-bold text-lg mb-1">
                              ⚠️ IMPORTANT - READ CAREFULLY
                            </h3>
                            <p className="text-white font-semibold mb-2">
                              ANDA HARUS MENGISI EMAIL AKTIF DENGAN BENAR!
                            </p>
                            <ul className="text-gray-300 text-sm space-y-1">
                              <li>• Email anda dibutuhkan untuk MENGIRIM PRODUK.</li>
                              <li>• Akses produk akan dikirim ke email ini</li>
                              <li>• Pastikan Anda memasukkan email yang valid dan aktif</li>
                              <li>• Periksa folder spam jika Anda tidak melihat emailnya</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <form
                        onSubmit={handleSubmitPayment}
                        className="space-y-6"
                      >
                        {/* Email Field */}
                        <div className="p-4 rounded-lg bg-pink-500/10 border-2 border-pink-500/50">
                          <label className="block text-pink-400 font-bold text-lg mb-3 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Your Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full px-4 py-4 bg-black/50 border-2 border-pink-500/30 rounded-lg text-white text-lg placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                          />
                          <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <p className="text-yellow-400 text-sm font-semibold flex items-start gap-2">
                              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <span>Produk dan pembayaran Anda akan dikirim ke sini. Periksa dengan teliti!</span>
                            </p>
                          </div>
                        </div>

                        {/* Phone Number Field - Only show for QRIS */}
                        {selectedMethod === "qris" && (
                          <div>
                            <label className="block text-white font-semibold mb-2">
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              required
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              placeholder="08123456789"
                              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                            <p className="text-gray-500 text-sm mt-2">
                              For payment confirmation
                            </p>
                          </div>
                        )}

                        {/* Payment Method Specific Fields */}
                        {selectedMethod === "qris" && (
                          <div className="p-6 rounded-xl bg-white/5 border border-white/10">
                            {/* Loading State */}
                            {isGeneratingQRIS && (
                              <div className="text-center py-8">
                                <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
                                <p className="text-white font-semibold">
                                  Generating QRIS Code...
                                </p>
                                <p className="text-gray-400 text-sm">
                                  Please wait a moment
                                </p>
                              </div>
                            )}

                            {/* Error State */}
                            {paymentError && !isGeneratingQRIS && (
                              <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-red-400 font-semibold">
                                    Payment Error
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    {paymentError}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* QRIS Display */}
                            {qrisData && !isGeneratingQRIS && (
                              <div className="text-center">
                                {/* Payment Status Badge */}
                                <div className="mb-4">
                                  {paymentStatus?.status === "PAID" ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-500/30">
                                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                                      <span className="text-green-400 font-semibold">
                                        Payment Confirmed
                                      </span>
                                    </div>
                                  ) : paymentStatus?.status === "EXPIRED" ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500/30">
                                      <XCircle className="w-5 h-5 text-red-400" />
                                      <span className="text-red-400 font-semibold">
                                        Payment Expired
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                                      <Clock className="w-5 h-5 text-yellow-400" />
                                      <span className="text-yellow-400 font-semibold">
                                        Waiting for Payment
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Refresh Status Button */}
                                {paymentStatus?.status !== "PAID" && (
                                  <button
                                    type="button"
                                    onClick={handleManualRefresh}
                                    disabled={isManualRefreshing}
                                    className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <svg
                                      className={`w-4 h-4 ${isManualRefreshing ? "animate-spin" : ""}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                      />
                                    </svg>
                                    <span className="text-sm font-medium">
                                      {isManualRefreshing ? "Checking..." : "Refresh Status"}
                                    </span>
                                  </button>
                                )}

                                {/* QR Code */}
                                <motion.div
                                  onClick={() => setIsQRModalOpen(true)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="w-64 h-64 mx-auto mb-4 relative rounded-lg overflow-hidden bg-white p-4 cursor-pointer group"
                                >
                                  {qrisData.qr_url ? (
                                    <Image
                                      src={qrisData.qr_url}
                                      alt="QRIS Payment QR Code"
                                      fill
                                      className="object-contain p-2"
                                      unoptimized
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                                    </div>
                                  )}

                                  {/* Overlay hint */}
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="text-white text-sm font-semibold">
                                      Click to enlarge
                                    </div>
                                  </div>
                                </motion.div>

                                {/* Payment Instructions */}
                                <div className="space-y-2 mb-4">
                                  <p className="text-white font-semibold">
                                    Scan with any payment app
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    GoPay, OVO, Dana, ShopeePay, LinkAja, etc.
                                  </p>
                                  <p className="text-pink-400 font-semibold text-lg">
                                    Amount: Rp{" "}
                                    {qrisData.amount.toLocaleString("id-ID")}
                                  </p>
                                  <p className="text-gray-500 text-xs">
                                    Reference: {qrisData.reference}
                                  </p>
                                </div>

                                {/* Enlarge Button */}
                                <button
                                  type="button"
                                  onClick={() => setIsQRModalOpen(true)}
                                  className="text-pink-400 text-sm hover:underline flex items-center justify-center gap-1 mx-auto"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                                    />
                                  </svg>
                                  Click to view full size
                                </button>

                                {/* Warning */}
                                {paymentStatus?.status !== "PAID" && (
                                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                    <p className="text-yellow-400 text-sm">
                                      ⚠️ Harap bayar jumlah yang tepat.
                                      Jumlah yang salah akan ditolak secara otomatis.
                                    </p>
                                  </div>
                                )}

                                {/* Retry Button if expired */}
                                {paymentStatus?.status === "EXPIRED" && (
                                  <button
                                    type="button"
                                    onClick={generateQRIS}
                                    className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                                  >
                                    Generate New QR Code
                                  </button>
                                )}

                                {/* Completed Payment Button */}
                                {paymentStatus?.status === "PAID" && !paymentCompleted && (
                                  <div className="mt-6 space-y-3">
                                    <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                                      <p className="text-green-400 text-sm text-center">
                                        ✅ Payment detected! Click below to continue.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={handleCompletePayment}
                                      disabled={isCompletingPayment}
                                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                      {isCompletingPayment ? (
                                        <>
                                          <Loader2 className="w-5 h-5 animate-spin" />
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle2 className="w-5 h-5" />
                                          I've Completed Payment
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Initial Generate Button (if somehow QRIS not generated) */}
                            {!qrisData && !isGeneratingQRIS && (
                              <button
                                type="button"
                                onClick={generateQRIS}
                                className="w-full py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-semibold"
                              >
                                Generate QRIS Code
                              </button>
                            )}
                          </div>
                        )}

                        {/* Manual QRIS 1 */}
                        {selectedMethod === "manual_qris_1" && manualQRISSettings?.qris1 && (
                          <div className="p-6 rounded-xl bg-purple-500/10 border border-purple-500/30">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                              <Wallet className="w-6 h-6 text-purple-400" />
                              {manualQRISSettings.qris1.label}
                            </h3>

                            {/* QR Code Display */}
                            <div className="mb-6 text-center">
                              <div className="inline-block p-4 bg-white rounded-xl">
                                <Image
                                  src={manualQRISSettings.qris1.imageUrl}
                                  alt="QRIS Code"
                                  width={300}
                                  height={300}
                                  className="rounded-lg"
                                  unoptimized
                                />
                              </div>
                              <p className="text-gray-400 text-sm mt-4">
                                Scan the QR code above with your mobile banking app
                              </p>
                            </div>

                            {/* Upload Proof Section */}
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <p className="text-yellow-400 text-sm font-semibold">
                                  ⚠️ After payment, please upload your payment proof below
                                </p>
                              </div>

                              {/* File Upload */}
                              <div>
                                <label className="block text-white font-semibold mb-2">
                                  Upload Payment Proof *
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleProofFileSelect}
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600 cursor-pointer"
                                />
                              </div>

                              {/* Preview */}
                              {proofPreview && (
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-white/10">
                                  <Image
                                    src={proofPreview}
                                    alt="Payment Proof Preview"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              )}

                              {/* Upload Status Indicator */}
                              {uploadingProof && (
                                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
                                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                  <p className="text-blue-400 text-sm font-semibold">Uploading payment proof...</p>
                                </div>
                              )}

                              {proofUploaded && (
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                                  <p className="text-green-400 text-sm font-semibold">✅ Payment proof uploaded successfully!</p>
                                </div>
                              )}

                              {paymentError && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-red-400 text-sm">{paymentError}</p>
                                </div>
                              )}

                              {/* Completed Payment Button - Manual QRIS 1 */}
                              {proofUploaded && !paymentCompleted && (
                                <button
                                  type="button"
                                  onClick={handleCompletePayment}
                                  disabled={isCompletingPayment}
                                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                >
                                  {isCompletingPayment ? (
                                    <>
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-5 h-5" />
                                      I've Completed Payment
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Manual QRIS 2 */}
                        {selectedMethod === "manual_qris_2" && manualQRISSettings?.qris2 && (
                          <div className="p-6 rounded-xl bg-pink-500/10 border border-pink-500/30">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                              <Wallet className="w-6 h-6 text-pink-400" />
                              {manualQRISSettings.qris2.label}
                            </h3>

                            {/* QR Code Display */}
                            <div className="mb-6 text-center">
                              <div className="inline-block p-4 bg-white rounded-xl">
                                <Image
                                  src={manualQRISSettings.qris2.imageUrl}
                                  alt="QRIS Code"
                                  width={300}
                                  height={300}
                                  className="rounded-lg"
                                  unoptimized
                                />
                              </div>
                              <p className="text-gray-400 text-sm mt-4">
                                Scan the QR code above with your mobile banking app
                              </p>
                            </div>

                            {/* Upload Proof Section */}
                            <div className="space-y-4">
                              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                                <p className="text-yellow-400 text-sm font-semibold">
                                  ⚠️ After payment, please upload your payment proof below
                                </p>
                              </div>

                              {/* File Upload */}
                              <div>
                                <label className="block text-white font-semibold mb-2">
                                  Upload Payment Proof *
                                </label>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleProofFileSelect}
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600 cursor-pointer"
                                />
                              </div>

                              {/* Preview */}
                              {proofPreview && (
                                <div className="relative w-full h-48 rounded-lg overflow-hidden border border-white/10">
                                  <Image
                                    src={proofPreview}
                                    alt="Payment Proof Preview"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                  />
                                </div>
                              )}

                              {/* Upload Status Indicator */}
                              {uploadingProof && (
                                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center gap-3">
                                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                  <p className="text-blue-400 text-sm font-semibold">Uploading payment proof...</p>
                                </div>
                              )}

                              {proofUploaded && (
                                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                                  <p className="text-green-400 text-sm font-semibold">✅ Payment proof uploaded successfully!</p>
                                </div>
                              )}

                              {paymentError && (
                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-red-400 text-sm">{paymentError}</p>
                                </div>
                              )}

                              {/* Completed Payment Button - Manual QRIS 2 */}
                              {proofUploaded && !paymentCompleted && (
                                <button
                                  type="button"
                                  onClick={handleCompletePayment}
                                  disabled={isCompletingPayment}
                                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                                >
                                  {isCompletingPayment ? (
                                    <>
                                      <Loader2 className="w-5 h-5 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-5 h-5" />
                                      I've Completed Payment
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedMethod === "paypal" && (
                          <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                              <p className="text-blue-400 text-sm">
                                You will be redirected to PayPal to complete
                                your payment securely
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMethod === "crypto" && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-white font-semibold mb-2">
                                Select Cryptocurrency
                              </label>
                              <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-pink-500 transition-colors">
                                <option value="btc">Bitcoin (BTC)</option>
                                <option value="eth">Ethereum (ETH)</option>
                                <option value="usdt">Tether (USDT)</option>
                                <option value="usdc">USD Coin (USDC)</option>
                              </select>
                            </div>
                            <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <p className="text-orange-400 text-sm">
                                Wallet address will be displayed after
                                confirmation
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMethod === "card" && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-white font-semibold mb-2">
                                Card Number *
                              </label>
                              <input
                                type="text"
                                required
                                placeholder="1234 5678 9012 3456"
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-white font-semibold mb-2">
                                  Expiry Date *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="MM/YY"
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-white font-semibold mb-2">
                                  CVV *
                                </label>
                                <input
                                  type="text"
                                  required
                                  placeholder="123"
                                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Terms & Conditions */}
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-white/5">
                          <input
                            type="checkbox"
                            required
                            className="mt-1"
                            id="terms"
                          />
                          <label
                            htmlFor="terms"
                            className="text-gray-400 text-sm"
                          >
                            I agree to the{" "}
                            <a
                              href="#"
                              className="text-pink-400 hover:underline"
                            >
                              Terms of Service
                            </a>{" "}
                            and{" "}
                            <a
                              href="#"
                              className="text-pink-400 hover:underline"
                            >
                              Privacy Policy
                            </a>
                          </label>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={
                            isProcessing ||
                            (selectedMethod === "qris" &&
                              (!paymentStatus ||
                                paymentStatus.status !== "PAID")) ||
                            ((selectedMethod === "manual_qris_1" || selectedMethod === "manual_qris_2") &&
                              !proofUploaded)
                          }
                          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-all text-lg shadow-lg shadow-pink-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : selectedMethod === "qris" &&
                            (!paymentStatus ||
                              paymentStatus.status !== "PAID") ? (
                            <>
                              <AlertCircle className="w-5 h-5" />
                              <span>Waiting for Payment Confirmation</span>
                            </>
                          ) : (selectedMethod === "manual_qris_1" || selectedMethod === "manual_qris_2") &&
                            !proofUploaded ? (
                            <>
                              <AlertCircle className="w-5 h-5" />
                              <span>Please Upload Payment Proof First</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-5 h-5" />
                              <span>Complete Payment {formatPrice(getTotalAmount())}</span>
                            </>
                          )}
                        </button>

                        {/* QRIS Payment Helper Text */}
                        {selectedMethod === "qris" &&
                          (!paymentStatus ||
                            paymentStatus.status !== "PAID") && (
                            <div className="text-center">
                              <p className="text-gray-400 text-sm">
                                The button will be enabled automatically after
                                payment is confirmed
                              </p>
                            </div>
                          )}

                        {/* Manual Payment Helper Text */}
                        {(selectedMethod === "manual_qris_1" || selectedMethod === "manual_qris_2") &&
                          !proofUploaded && (
                            <div className="text-center">
                              <p className="text-orange-400 text-sm font-semibold">
                                ⚠️ You must upload your payment proof before completing the order
                              </p>
                            </div>
                          )}

                        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                          <Shield className="w-4 h-4" />
                          <span>Secured by SSL encryption</span>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 md:p-8 text-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.2,
                          type: "spring",
                          stiffness: 200,
                        }}
                        className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
                      >
                        <Check className="w-10 h-10 text-green-400" />
                      </motion.div>

                      <h2 className="text-3xl font-bold text-white mb-2">
                        Payment Successful!
                      </h2>
                      <p className="text-gray-400 mb-8">
                        Thank you for your purchase. Check your email for
                        details.
                      </p>

                      <div className="max-w-md mx-auto mb-8 p-6 rounded-xl bg-white/5 border border-white/10 text-left">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Order ID</span>
                            <span className="text-white font-mono">
                              {orderId || 'Processing...'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Product</span>
                            <span className="text-white">{product.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Plan</span>
                            <span className="text-white">{plan.period}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Amount</span>
                            <span className="text-white font-bold">
                              {formatPrice(getTotalAmount())}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                          href="/products"
                          className="px-8 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                        >
                          Browse Products
                        </Link>
                        <Link
                          href={`/track?order=${orderId}`}
                          className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all"
                        >
                          Track Your Order
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </section>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQRModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsQRModalOpen(false)}
            className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsQRModalOpen(false)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    Press ESC or click outside to close
                  </span>
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </button>

              {/* QR Code Container */}
              <div className="bg-white rounded-2xl p-8 shadow-2xl">
                <h3 className="text-2xl font-bold text-black text-center mb-4">
                  Scan QR Code to Pay
                </h3>
                <div className="relative w-full aspect-square max-w-lg mx-auto bg-white rounded-xl overflow-hidden flex items-center justify-center">
                  {qrisData?.qr_url ? (
                    <Image
                      src={qrisData.qr_url}
                      alt="QRIS Payment QR Code - Full Size"
                      fill
                      className="object-contain p-4"
                      unoptimized
                      priority
                    />
                  ) : (
                    <div className="text-gray-400">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                      <p>Loading QR Code...</p>
                    </div>
                  )}
                </div>
                <div className="mt-6 text-center space-y-2">
                  <p className="text-gray-700 font-semibold">
                    Scan with any e-wallet app
                  </p>
                  <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
                    <span>GoPay</span>
                    <span>•</span>
                    <span>OVO</span>
                    <span>•</span>
                    <span>Dana</span>
                    <span>•</span>
                    <span>ShopeePay</span>
                    <span>•</span>
                    <span>LinkAja</span>
                  </div>
                  {qrisData && (
                    <>
                      <p className="text-lg font-bold text-gray-800 mt-4">
                        Rp {qrisData.amount.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-gray-500">
                        Ref: {qrisData.reference}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal - Shows after payment completion */}
      <AnimatePresence>
        {paymentCompleted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0a0a0a] rounded-2xl border border-white/10 p-8 max-w-md w-full text-center"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </motion.div>

              {/* Success Message */}
              <h2 className="text-3xl font-bold text-white mb-2">
                Payment Submitted!
              </h2>
              <p className="text-gray-400 mb-8">
                Your order is being processed. You can track your order status below.
              </p>

              {/* Order Details */}
              <div className="mb-8 p-6 rounded-xl bg-white/5 border border-white/10 text-left space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order ID</span>
                  <span className="text-white font-mono text-sm">
                    {orderId || 'Processing...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Product</span>
                  <span className="text-white">{product?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan</span>
                  <span className="text-white">{plan?.period}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/track?order=${orderId}`)}
                  className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Track Your Order
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-all"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
    <Footer />
  </>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
