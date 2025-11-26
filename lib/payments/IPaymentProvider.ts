/**
 * Payment Provider Interface
 * Defines the contract that all payment gateway implementations must follow
 */

export interface PaymentConfig {
  apiKey: string;
  apiUrl: string;
  // Additional provider-specific config
  [key: string]: any;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
  notifyUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  provider: string;
  reference: string;
  qrUrl?: string;
  qrString?: string;
  checkoutUrl?: string;
  amount: number;
  fee?: number;
  totalPayment?: number;
  expiryTime?: number;
  sessionId?: string;
  transactionId?: string;
  message?: string;
  error?: any;
}

export interface IPaymentProvider {
  name: string;
  
  /**
   * Load configuration from Firestore or environment variables
   */
  getConfig(): Promise<PaymentConfig>;
  
  /**
   * Create a payment session
   */
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  
  /**
   * Check payment status
   */
  checkStatus(reference: string): Promise<any>;
  
  /**
   * Verify webhook callback signature (optional)
   */
  verifyCallback?(payload: any, headers: Record<string, string>): boolean;
  
  /**
   * Parse webhook callback data (optional)
   */
  parseCallback?(payload: any): {
    orderId: string;
    status: string;
    providerRef: string;
    amount?: number;
  };
}
