/**
 * Translation utilities for multi-language support
 */

export type Language = 'id' | 'en';

// Translation dictionary
export const translations = {
  // Common
  common: {
    loading: { id: 'Memuat...', en: 'Loading...' },
    error: { id: 'Terjadi kesalahan', en: 'An error occurred' },
    success: { id: 'Berhasil', en: 'Success' },
    cancel: { id: 'Batal', en: 'Cancel' },
    confirm: { id: 'Konfirmasi', en: 'Confirm' },
    save: { id: 'Simpan', en: 'Save' },
    delete: { id: 'Hapus', en: 'Delete' },
    edit: { id: 'Edit', en: 'Edit' },
    back: { id: 'Kembali', en: 'Back' },
  },
  
  // Navigation
  nav: {
    products: { id: 'Produk', en: 'Products' },
    status: { id: 'Status', en: 'Status' },
    spoofer: { id: 'Spoofer', en: 'Spoofer' },
    jobs: { id: 'Pekerjaan', en: 'Jobs' },
    login: { id: 'Masuk', en: 'Login' },
    register: { id: 'Daftar', en: 'Register' },
    logout: { id: 'Keluar', en: 'Logout' },
    dashboard: { id: 'Dasbor', en: 'Dashboard' },
    admin: { id: 'Admin', en: 'Admin' },
  },
  
  // Products
  products: {
    title: { id: 'Produk Kami', en: 'Our Products' },
    description: { id: 'Pilih produk terbaik untuk kebutuhan Anda', en: 'Choose the best product for your needs' },
    buyNow: { id: 'Beli Sekarang', en: 'Buy Now' },
    learnMore: { id: 'Pelajari Lebih Lanjut', en: 'Learn More' },
    price: { id: 'Harga', en: 'Price' },
    features: { id: 'Fitur', en: 'Features' },
    stock: { id: 'Stok', en: 'Stock' },
    available: { id: 'Tersedia', en: 'Available' },
    outOfStock: { id: 'Stok Habis', en: 'Out of Stock' },
  },
  
  // Payment
  payment: {
    title: { id: 'Pembayaran', en: 'Payment' },
    selectMethod: { id: 'Pilih Metode Pembayaran', en: 'Select Payment Method' },
    amount: { id: 'Jumlah', en: 'Amount' },
    processing: { id: 'Memproses pembayaran...', en: 'Processing payment...' },
    success: { id: 'Pembayaran berhasil!', en: 'Payment successful!' },
    failed: { id: 'Pembayaran gagal', en: 'Payment failed' },
    pending: { id: 'Menunggu pembayaran', en: 'Awaiting payment' },
  },
  
  // Orders
  orders: {
    title: { id: 'Pesanan', en: 'Orders' },
    myOrders: { id: 'Pesanan Saya', en: 'My Orders' },
    orderNumber: { id: 'Nomor Pesanan', en: 'Order Number' },
    status: { id: 'Status', en: 'Status' },
    date: { id: 'Tanggal', en: 'Date' },
    total: { id: 'Total', en: 'Total' },
  },
} as const;

/**
 * Get translated text
 * @param key Translation key path (e.g., 'common.loading')
 * @param lang Language code
 * @returns Translated string
 */
export function t(key: string, lang: Language): string {
  const keys = key.split('.');
  let value: any = translations;
  
  for (const k of keys) {
    value = value[k];
    if (!value) return key; // Return key if translation not found
  }
  
  return value[lang] || value['en'] || key;
}

/**
 * Format currency based on currency type
 * @param amount Amount in smallest unit (e.g., cents for USD, rupiah for IDR)
 * @param currency Currency code
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: 'IDR' | 'USD'): string {
  if (currency === 'IDR') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } else {
    // Convert cents to dollars for USD
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  }
}

/**
 * Convert amount between currencies (simplified - in production use real exchange rates)
 * @param amount Amount in source currency
 * @param from Source currency
 * @param to Target currency
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  from: 'IDR' | 'USD',
  to: 'IDR' | 'USD'
): number {
  if (from === to) return amount;
  
  // Simplified exchange rate (1 USD = 15,000 IDR)
  // In production, fetch real-time rates from an API
  const USD_TO_IDR = 15000;
  
  if (from === 'USD' && to === 'IDR') {
    return Math.round(amount * USD_TO_IDR);
  } else {
    return Math.round(amount / USD_TO_IDR);
  }
}
