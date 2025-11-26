/**
 * Order Schema Definition
 * Represents the structure of order documents in Firestore
 */

export interface OrderItem {
  productId: string;
  variantId?: string;
  price: number;
  name?: string;
  quantity?: number;
}

export interface OrderCustomer {
  name: string;
  phone?: string;
  email?: string;
}

export interface OrderPayment {
  provider: 'ipaymu' | 'pakasir' | 'tokopay' | 'paypal' | 'stripe' | 'manual_qris_1' | 'manual_qris_2';
  providerRef?: string;
  checkoutUrl?: string;
  qrString?: string;
  qrUrl?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'PROCESSING';
  currency?: 'IDR' | 'USD'; // NEW: Currency used for payment
  amount?: number;
  fee?: number;
  totalPayment?: number;
  expiryTime?: number;
  sessionId?: string;
  transactionId?: string;
  reference?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Manual payment fields
  proofUrl?: string; // Discord attachment URL for payment proof
  proofUploadedAt?: Date;
  processedBy?: string; // Admin ID who processed the order
  processedAt?: Date;
  // Legacy fields (keep for backward compatibility)
  provider_id?: string;
  provider_response?: any;
  merchantRef?: string;
  paymentUrl?: string;
  webhookData?: any;
}

export type OrderStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';

export interface OrderData {
  id: string;
  userId?: string; // Optional now (supports guest orders)
  productSlug: string; // Added: product slug identifier
  productId?: string; // Legacy field for backward compatibility
  productName?: string;
  planId?: string;
  planName?: string;
  items?: OrderItem[]; // Legacy field, now optional
  item?: OrderItem; // Legacy single item field
  total: number;
  amount?: number; // Alias for total
  customer: OrderCustomer;
  status: OrderStatus;
  payment?: OrderPayment;
  productGateway?: 'ipaymu' | 'pakasir' | 'tokopay'; // Product-specific gateway
  productBackupGateway?: 'ipaymu' | 'pakasir' | 'tokopay'; // Product-specific backup
  delivery?: {
    status: 'PENDING' | 'DELIVERED' | 'FAILED';
    method: 'auto' | 'manual';
    productKey?: string; // For auto-delivered products
    deliveredAt?: Date;
    instructions?: string;
  };
  createdAt: Date;
  updatedAt?: Date;
  error?: string;
}

/**
 * Type for creating a new order (without id, createdAt)
 */
export type CreateOrderData = Omit<OrderData, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Type for updating an existing order (all fields optional except id)
 */
export type UpdateOrderData = Partial<Omit<OrderData, 'id'>> & { id: string };
