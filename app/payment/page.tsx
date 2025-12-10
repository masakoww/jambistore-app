"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Wallet,
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Upload,
  Maximize2,
  XCircle,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/lib/firebase";
import { useWebsite } from "@/lib/websiteContext";

function PaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language, currency } = useWebsite();

  // State
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [step, setStep] = useState(1);
  const [enlargedQRIS, setEnlargedQRIS] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [orderData, setOrderData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>({ methods: { manualQRIS: true, autoQRIS: false, paypal: false } });
  const [manualQRISSettings, setManualQRISSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploaded, setProofUploaded] = useState(false);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [isCompletingPayment, setIsCompletingPayment] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Get orderId from URL
  const orderId = searchParams.get("orderId");

  // Prevent back navigation after payment started
  useEffect(() => {
    if (orderId && step > 1) {
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
  }, [orderId, step]);

  // Set email from user if logged in
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoadingOrder(false);
        return;
      }

      try {
        setLoadingOrder(true);
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        
        if (data.ok && data.order) {
          setOrderData(data.order);
          
          // Pre-fill email if order has it
          if (data.order.customer?.email) {
            setEmail(data.order.customer.email);
          }
        } else {
          console.error('❌ Order not found:', orderId, data.message);
          setPaymentError('Order not found');
        }
      } catch (error) {
        console.error('❌ Error fetching order:', error);
        setPaymentError('Failed to load order');
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Fetch product data using productSlug from order
  useEffect(() => {
    const fetchProduct = async () => {
      if (!orderData?.productSlug) return;

      try {
        setLoadingProduct(true);
        const response = await fetch(`/api/products/slug/${orderData.productSlug}`);
        const data = await response.json();
        
        if ((data.ok && data.data) || (data.success && data.product)) {
          const product = data.data || data.product;
          setProductData(product);
          console.log('✅ Product loaded:', product.slug, 'supportedQris:', product.supportedQris);
        } else {
          console.error('❌ Product not found:', orderData.productSlug);
        }
      } catch (error) {
        console.error('❌ Error fetching product:', error);
      } finally {
        setLoadingProduct(false);
      }
    };

    fetchProduct();
  }, [orderData?.productSlug]);

  // Redirect if order is already completed or locked
  useEffect(() => {
    if (!orderId || !orderData || hasRedirected) return;

    // If order has payment proof already, redirect to tracking
    if (orderData.payment?.proofUrl || orderData.paymentProofURL) {
      setHasRedirected(true);
      router.replace(`/track?orderId=${orderId}`);
      return;
    }

    // If order is locked or completed, redirect to tracking
    if (orderData.locked === true || (orderData.status && orderData.status !== 'PENDING')) {
      if (orderData.status === 'COMPLETED' || orderData.status === 'DELIVERED') {
        setHasRedirected(true);
        router.replace(`/track?orderId=${orderId}`);
      }
    }
  }, [orderId, orderData, hasRedirected, router]);

  // Load payment settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [gatewayRes, manualRes] = await Promise.all([
          fetch('/api/settings/payment'),
          fetch('/api/settings/manual-qris')
        ]);
        
        const gatewayData = await gatewayRes.json();
        const manualData = await manualRes.json();
        
        if (gatewayData.ok) {
          setPaymentSettings(gatewayData);
        }
        
        if (manualData.ok) {
          setManualQRISSettings(manualData.settings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  // Get supported QRIS types from product metadata
  // supportedQris can be: string[], string, or undefined
  // Examples: ['qris1'], ['qris1', 'qris2'], 'qris1', undefined
  const getSupportedQris = (): string[] => {
    const supported = productData?.supportedQris || productData?.paymentMethods?.qris;
    
    if (!supported) {
      // No supportedQris defined - return empty (no QRIS available for this product)
      return [];
    }
    
    if (Array.isArray(supported)) {
      return supported;
    }
    
    if (typeof supported === 'string') {
      return [supported];
    }
    
    return [];
  };

  const supportedQris = getSupportedQris();

  // Build payment methods array - ONLY show methods supported by the product
  const paymentMethods = [
    // Manual QRIS 1 - only if product supports 'qris1' or 'manual_qris_1'
    ...(paymentSettings?.methods?.manualQRIS && 
        manualQRISSettings?.qris1?.enabled && 
        (supportedQris.includes('qris1') || supportedQris.includes('manual_qris_1')) ? [{
      id: "manual_qris_1",
      name: manualQRISSettings.qris1.label || "Manual QRIS 1",
      description: manualQRISSettings.qris1.description || "Upload payment proof after scanning",
      icon: Wallet,
      badge: "Manual",
      color: "from-purple-500 to-pink-500",
    }] : []),
    // Manual QRIS 2 - only if product supports 'qris2' or 'manual_qris_2'
    ...(paymentSettings?.methods?.manualQRIS && 
        manualQRISSettings?.qris2?.enabled && 
        (supportedQris.includes('qris2') || supportedQris.includes('manual_qris_2')) ? [{
      id: "manual_qris_2",
      name: manualQRISSettings.qris2.label || "Manual QRIS 2",
      description: manualQRISSettings.qris2.description || "Upload payment proof after scanning",
      icon: Wallet,
      badge: "Manual",
      color: "from-pink-500 to-red-500",
    }] : []),
    // Auto QRIS - only if product supports 'auto_qris' or 'qris'
    ...(paymentSettings?.methods?.autoQRIS && 
        (supportedQris.includes('auto_qris') || supportedQris.includes('qris')) ? [{
      id: "qris",
      name: "Auto QRIS",
      description: "Automatic verification via QRIS",
      icon: Wallet,
      badge: "Instant",
      color: "from-blue-500 to-cyan-500",
    }] : []),
    // PayPal - only if product supports 'paypal'
    ...(paymentSettings?.methods?.paypal && 
        (supportedQris.includes('paypal') || productData?.paymentMethods?.paypal) ? [{
      id: "paypal",
      name: "PayPal",
      description: "Fast and secure with PayPal",
      icon: CreditCard,
      badge: null,
      color: "from-blue-600 to-blue-700",
    }] : [])
  ];

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setPaymentError(null);
    setTimeout(() => setStep(2), 300);
  };

  const handleProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPaymentError(language === 'id' 
        ? 'Silakan unggah file gambar (JPG, PNG, dll.)' 
        : 'Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPaymentError(language === 'id' 
        ? 'Ukuran file maksimal 5MB' 
        : 'File size must be less than 5MB');
      return;
    }

    if (!email || !email.trim()) {
      setPaymentError(language === 'id' 
        ? 'Silakan masukkan alamat email terlebih dahulu' 
        : 'Please enter your email address first');
      return;
    }

    setProofFile(file);
    setPaymentError(null);
    setUploadingProof(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Payment Proof for Order ${orderId}`);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      const possibleUrl = data.url || data.data?.url || data.fileUrl || data.secure_url || data.path || null;
      const okFlag = data.ok === true || data.success === true || Boolean(possibleUrl);

      if (okFlag && possibleUrl) {
        setProofUploaded(true);
        setProofUrl(possibleUrl);
        console.log('✅ Payment proof uploaded successfully!', { possibleUrl });
      } else {
        setPaymentError(data.message || (language === 'id' 
          ? 'Gagal mengunggah bukti pembayaran' 
          : 'Failed to upload payment proof'));
        setProofFile(null);
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      setPaymentError(language === 'id' 
        ? 'Gagal mengunggah bukti pembayaran. Silakan coba lagi.' 
        : 'Failed to upload payment proof. Please try again.');
      setProofFile(null);
    } finally {
      setUploadingProof(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!email || !email.includes('@')) {
      setPaymentError(language === 'id' 
        ? 'Silakan masukkan alamat email yang valid' 
        : 'Please enter a valid email address');
      return;
    }

    if (!selectedMethod) {
      setPaymentError(language === 'id' 
        ? 'Silakan pilih metode pembayaran' 
        : 'Please select a payment method');
      return;
    }

    if (!proofUrl) {
      setPaymentError(language === 'id' 
        ? 'Silakan unggah bukti pembayaran terlebih dahulu' 
        : 'Please upload payment proof first');
      return;
    }

    setIsCompletingPayment(true);
    setPaymentError(null);

    try {
      // Complete payment via API
      const response = await fetch(`/api/orders/${orderId}/complete-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: selectedMethod,
          customerEmail: email,
          proofUrl: proofUrl,
          userId: user?.uid,
          discordUserId: null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete payment');
      }

      // Redirect to tracking page
      router.replace(`/track?orderId=${orderId}`);
    } catch (error: any) {
      console.error('Error completing payment:', error);
      setPaymentError(error.message || (language === 'id' 
        ? 'Gagal menyelesaikan pembayaran' 
        : 'Failed to complete payment'));
      setIsCompletingPayment(false);
    }
  };

  const formatPrice = (amount: number) => {
    const orderCurrency = orderData?.currency || currency;
    if (orderCurrency === 'IDR') {
      return 'Rp ' + (amount || 0).toLocaleString('id-ID');
    } else {
      return '$' + ((amount || 0) / 100).toFixed(2);
    }
  };

  // Loading state - wait for order, product, and settings
  if (loadingOrder || loadingSettings || loadingProduct) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  // No orderId provided
  if (!orderId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">
          {language === 'id' ? 'Order ID diperlukan' : 'Order ID Required'}
        </h1>
        <p className="text-gray-400 mb-8">
          {language === 'id' 
            ? 'Silakan pilih produk dan buat pesanan terlebih dahulu.' 
            : 'Please select a product and create an order first.'}
        </p>
        <Link href="/products" className="text-pink-400 hover:text-pink-300">
          {language === 'id' ? 'Lihat Produk' : 'View Products'}
        </Link>
      </div>
    );
  }

  // Order not found
  if (!orderData && !loadingOrder) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">
          {language === 'id' ? 'Pesanan Tidak Ditemukan' : 'Order Not Found'}
        </h1>
        <p className="text-gray-400 mb-8">
          {language === 'id' 
            ? 'Pesanan dengan ID tersebut tidak ditemukan.' 
            : 'Order with that ID was not found.'}
        </p>
        <Link href="/products" className="text-pink-400 hover:text-pink-300">
          {language === 'id' ? 'Kembali ke Produk' : 'Return to Products'}
        </Link>
      </div>
    );
  }

  // Product not found or no payment methods configured
  if (!productData && !loadingProduct && orderData) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">
          {language === 'id' ? 'Produk Tidak Ditemukan' : 'Product Not Found'}
        </h1>
        <p className="text-gray-400 mb-8">
          {language === 'id' 
            ? 'Tidak dapat memuat data produk. Silakan hubungi support.' 
            : 'Could not load product data. Please contact support.'}
        </p>
        <Link href="/products" className="text-pink-400 hover:text-pink-300">
          {language === 'id' ? 'Kembali ke Produk' : 'Return to Products'}
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/products" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              {language === 'id' ? 'Kembali' : 'Back'}
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">
              {language === 'id' ? 'Checkout' : 'Checkout'}
            </h1>
            <div className="flex items-center gap-2 text-gray-400">
              <span>{orderData?.productName}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600" />
              <span className="text-pink-400">{orderData?.planName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Steps Indicator */}
              <div className="flex items-center gap-4 mb-8">
                <div className={`flex items-center gap-2 ${step >= 1 ? 'text-white' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= 1 ? 'bg-pink-500 border-pink-500' : 'border-gray-600'}`}>1</div>
                  <span className="font-medium">{language === 'id' ? 'Metode' : 'Method'}</span>
                </div>
                <div className="w-12 h-px bg-gray-800" />
                <div className={`flex items-center gap-2 ${step >= 2 ? 'text-white' : 'text-gray-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${step >= 2 ? 'bg-pink-500 border-pink-500' : 'border-gray-600'}`}>2</div>
                  <span className="font-medium">{language === 'id' ? 'Pembayaran' : 'Payment'}</span>
                </div>
              </div>

              {step === 1 ? (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-white">
                    {language === 'id' ? 'Pilih Metode Pembayaran' : 'Select Payment Method'}
                  </h2>
                  <div className="grid gap-4">
                    {paymentMethods.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400">
                        <p className="mb-2">
                          {language === 'id' 
                            ? 'Tidak ada metode pembayaran tersedia untuk produk ini.' 
                            : 'No payment methods available for this product.'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {language === 'id' 
                            ? 'Silakan hubungi support untuk bantuan.' 
                            : 'Please contact support for assistance.'}
                        </p>
                      </div>
                    ) : (
                      paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          onClick={() => handlePaymentMethodSelect(method.id)}
                          className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center`}>
                              <method.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                              <h3 className="font-bold text-white">{method.name}</h3>
                              <p className="text-sm text-gray-400">{method.description}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      {language === 'id' ? 'Alamat Email' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={language === 'id' ? 'Masukkan email Anda...' : 'Enter your email...'}
                      className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>

                  {/* Show QRIS QR Code Image for selected manual methods */}
                  {selectedMethod === 'manual_qris_1' && manualQRISSettings?.qris1?.imageUrl && (
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-3">
                        {language === 'id' ? 'Scan QR Code:' : 'Scan QR Code:'}
                      </label>
                      <div className="bg-white p-4 rounded-xl inline-block relative">
                        <img 
                          src={manualQRISSettings.qris1.imageUrl} 
                          alt="QRIS 1 QR Code"
                          className="w-64 h-64 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setEnlargedQRIS(manualQRISSettings.qris1.imageUrl)}
                          className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
                          aria-label="Enlarge QR"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        {language === 'id' 
                          ? 'Scan QR code ini dengan aplikasi e-wallet Anda' 
                          : 'Scan this QR code with your e-wallet app'}
                      </p>
                    </div>
                  )}
                  {selectedMethod === 'manual_qris_2' && manualQRISSettings?.qris2?.imageUrl && (
                    <div className="mb-6">
                      <label className="block text-white font-medium mb-3">
                        {language === 'id' ? 'Scan QR Code:' : 'Scan QR Code:'}
                      </label>
                      <div className="bg-white p-4 rounded-xl inline-block relative">
                        <img 
                          src={manualQRISSettings.qris2.imageUrl} 
                          alt="QRIS 2 QR Code"
                          className="w-64 h-64 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setEnlargedQRIS(manualQRISSettings.qris2.imageUrl)}
                          className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full transition-colors"
                          aria-label="Enlarge QR"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        {language === 'id' 
                          ? 'Scan QR code ini dengan aplikasi e-wallet Anda' 
                          : 'Scan this QR code with your e-wallet app'}
                      </p>
                    </div>
                  )}

                  {/* Proof Upload */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      {language === 'id' ? 'Unggah Bukti Pembayaran' : 'Upload Payment Proof'}
                    </label>
                    <div className="relative border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:bg-white/5 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProofFileSelect}
                        disabled={uploadingProof || isCompletingPayment}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      {uploadingProof ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
                          <span className="text-gray-400">
                            {language === 'id' ? 'Mengunggah...' : 'Uploading...'}
                          </span>
                        </div>
                      ) : proofUploaded ? (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                          <span className="text-green-400 font-medium">
                            {language === 'id' ? 'Bukti Berhasil Diunggah' : 'Proof Uploaded Successfully'}
                          </span>
                          <span className="text-xs text-gray-500">{proofFile?.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <span className="text-gray-400">
                            {language === 'id' ? 'Klik untuk mengunggah gambar' : 'Click to upload image'}
                          </span>
                          <span className="text-xs text-gray-600">
                            {language === 'id' ? 'Maks 5MB (JPG, PNG)' : 'Max 5MB (JPG, PNG)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Error Message */}
                  {paymentError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{paymentError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setStep(1)}
                      disabled={isCompletingPayment}
                      className="px-6 py-4 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {language === 'id' ? 'Kembali' : 'Back'}
                    </button>
                    <button
                      onClick={handleCompletePayment}
                      disabled={!email || !proofUploaded || isCompletingPayment}
                      className={`flex-1 py-4 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2 ${
                        !email || !proofUploaded || isCompletingPayment
                          ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-pink-400 to-pink-300 hover:from-pink-500 hover:to-pink-400 shadow-lg shadow-pink-500/25'
                      }`}
                    >
                      {isCompletingPayment ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>{language === 'id' ? 'Memproses...' : 'Processing...'}</span>
                        </>
                      ) : (
                        language === 'id' ? 'Selesaikan Pembayaran' : 'Complete Payment'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10 sticky top-24">
                <h3 className="text-lg font-bold text-white mb-4">
                  {language === 'id' ? 'Ringkasan Pesanan' : 'Order Summary'}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{language === 'id' ? 'Produk' : 'Product'}</span>
                    <span className="text-white">{orderData?.productName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{language === 'id' ? 'Paket' : 'Plan'}</span>
                    <span className="text-white">{orderData?.planName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Order ID</span>
                    <span className="text-white font-mono text-xs">{orderId}</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between items-end">
                    <span className="text-gray-400">Total</span>
                    <span className="text-2xl font-bold text-pink-400">
                      {formatPrice(orderData?.amount || orderData?.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Enlargement Modal */}
      {enlargedQRIS && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 opacity-0 scale-90 animate-[fadeInScale_0.18s_ease-out_forwards]"
          onClick={() => setEnlargedQRIS(null)}
        >
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
          <div className="relative z-10 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl p-4">
              <button
                onClick={() => setEnlargedQRIS(null)}
                className="absolute right-4 top-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full"
                aria-label="Close enlarged QR"
              >
                <XCircle className="w-5 h-5" />
              </button>
              <div className="flex flex-col items-center">
                <img src={enlargedQRIS} alt="Enlarged QR" className="w-full max-w-2xl h-auto object-contain bg-white" loading="lazy" />
                <p className="text-sm text-gray-600 mt-3">
                  {language === 'id' ? 'Klik di luar untuk menutup' : 'Click outside to close'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
