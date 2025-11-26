/**
 * Unified Firestore Schema Types
 * Used by both website and Discord bot
 */

// Product Schema
export interface ProductSchema {
  title: string;
  slug: string;
  category?: string;
  
  description: {
    en: string;
    id: string;
  };
  
  features: string[];
  images: string[];
  
  capitalCost: {
    IDR: number;
    USD: number;
  };
  
  sellingPrice: {
    IDR: number;
    USD: number;
  };
  
  gateway: {
    IDR: string; // e.g., "pakasir", "manual_qris_1"
    USD: string; // e.g., "paypal", "stripe"
  };
  
  deliveryType: 'PRELOADED' | 'API' | 'MANUAL';
  
  apiDelivery?: {
    endpoint: string;
    apiKey: string;
    method: 'GET' | 'POST' | 'PUT';
    payloadTemplate?: Record<string, any>;
  };
  
  // Reviews
  averageRating?: number;
  totalReviews?: number;
  
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Stock Item Schema
export interface StockItemSchema {
  content: Record<string, any>; // Dynamic object containing credentials
  used: boolean;
  usedAt: Date | null;
  assignedToOrder: string | null;
  createdAt?: Date;
}

// Order Schema
export interface OrderSchema {
  // Customer info
  userId: string;
  customerEmail: string;
  customer?: {
    name?: string;
    email: string;
    phone?: string;
  };
  
  // Product info
  productSlug: string;
  productName?: string;
  productId?: string;
  planName?: string;
  
  // Pricing
  sellingPrice: number;
  capitalCost: number;
  currency: 'IDR' | 'USD';
  qty: number;
  totalAmount: number;
  
  // Payment
  payment: {
    proofUrl?: string;
    provider?: string; // "pakasir", "manual_qris_1", "paypal", etc.
    providerRef?: string; // External payment reference
    status: 'AWAITING_PROOF' | 'PROCESSING' | 'PAID' | 'FAILED';
    method?: string; // "manual", "auto"
    paidAt?: Date;
    proofUploadedAt?: Date;
  };
  
  // Delivery
  delivery: {
    method?: 'preloaded' | 'api' | 'admin' | 'manual';
    type?: 'account' | 'code' | 'file';
    status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED';
    
    // Delivery content (one of these based on type)
    content?: Record<string, any>;
    username?: string;
    password?: string;
    code?: string;
    productDetails?: string;
    instructions?: string;
    
    // Metadata
    deliveredAt?: Date;
    deliveredBy?: string;
    stockItemId?: string;
    notes?: string;
  };
  
  // Order status
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  
  // Financial tracking
  finalProfit?: number;
  margin?: number;
  
  // Closure
  closedAt?: Date;
  closedBy?: string;
  
  // Discord integration
  ticketChannelId?: string;
  transcriptUrl?: string;
  
  // Review (stored in subcollection)
  review?: {
    rating: number;
    comment: string;
    createdAt: Date;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Audit Log Schema
export interface AuditLogSchema {
  action: string;
  adminId: string;
  adminName?: string;
  payload?: Record<string, any>;
  timestamp: Date;
}

// Review Schema (stored in /productReviews collection)
export interface ReviewSchema {
  productSlug: string;
  orderId: string;
  userId: string;
  customerEmail: string;
  rating: number; // 1-5
  comment: string; // max 500 chars
  createdAt: Date;
}

// Collection paths
export const Collections = {
  PRODUCTS: 'products',
  STOCK: 'stock',
  ORDERS: 'orders',
  AUDIT_LOG: 'auditLog',
  SETTINGS: 'settings',
  ADMINS: 'admins',
  CATEGORIES: 'categories',
  PRODUCT_REVIEWS: 'productReviews'
} as const;

// Helper functions for collection paths
export const CollectionPaths = {
  product: (slug: string) => `${Collections.PRODUCTS}/${slug}`,
  stockItems: (slug: string) => `${Collections.STOCK}/${slug}/items`,
  stockItem: (slug: string, itemId: string) => `${Collections.STOCK}/${slug}/items/${itemId}`,
  order: (orderId: string) => `${Collections.ORDERS}/${orderId}`,
  orderReview: (orderId: string) => `${Collections.ORDERS}/${orderId}/review`,
  auditLog: (orderId: string) => `${Collections.ORDERS}/${orderId}/${Collections.AUDIT_LOG}`,
  auditLogEntry: (orderId: string, logId: string) => `${Collections.ORDERS}/${orderId}/${Collections.AUDIT_LOG}/${logId}`
} as const;

// Delivery type helpers
export const DeliveryTypes = {
  PRELOADED: 'PRELOADED' as const,
  API: 'API' as const,
  MANUAL: 'MANUAL' as const
};

// Order status helpers
export const OrderStatus = {
  PENDING: 'PENDING' as const,
  PROCESSING: 'PROCESSING' as const,
  COMPLETED: 'COMPLETED' as const,
  CANCELLED: 'CANCELLED' as const,
  REFUNDED: 'REFUNDED' as const
};

// Payment status helpers
export const PaymentStatus = {
  AWAITING_PROOF: 'AWAITING_PROOF' as const,
  PROCESSING: 'PROCESSING' as const,
  PAID: 'PAID' as const,
  FAILED: 'FAILED' as const
};

// Delivery status helpers
export const DeliveryStatus = {
  PENDING: 'PENDING' as const,
  PROCESSING: 'PROCESSING' as const,
  DELIVERED: 'DELIVERED' as const,
  FAILED: 'FAILED' as const
};
