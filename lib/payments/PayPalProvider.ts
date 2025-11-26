import { IPaymentProvider, PaymentConfig, PaymentRequest, PaymentResponse } from './IPaymentProvider';
import { adminDb } from '@/lib/firebaseAdmin';

/**
 * PayPal Payment Gateway Provider
 * Supports PayPal Checkout for USD transactions
 * 
 * Required Environment Variables:
 * - PAYPAL_CLIENT_ID
 * - PAYPAL_SECRET
 * - PAYPAL_MODE (sandbox | live)
 * - NEXT_PUBLIC_BASE_URL
 */
export class PayPalProvider implements IPaymentProvider {
  name = 'paypal';

  /**
   * Get PayPal configuration from Firestore or environment variables
   */
  async getConfig(): Promise<PaymentConfig> {
    try {
      // Try loading from Firestore first
      const doc = await adminDb.collection('settings').doc('paypal').get();
      
      if (doc.exists) {
        const data = doc.data();
        return {
          apiKey: data?.clientId || process.env.PAYPAL_CLIENT_ID || '',
          apiSecret: data?.secret || process.env.PAYPAL_SECRET || '',
          mode: data?.mode || process.env.PAYPAL_MODE || 'sandbox',
          apiUrl: this.getApiUrl(data?.mode || process.env.PAYPAL_MODE || 'sandbox'),
        };
      }
    } catch (error) {
      console.warn('⚠️  Failed to load PayPal config from Firestore, using env vars');
    }

    // Fallback to environment variables
    const mode = process.env.PAYPAL_MODE || 'sandbox';
    return {
      apiKey: process.env.PAYPAL_CLIENT_ID || '',
      apiSecret: process.env.PAYPAL_SECRET || '',
      mode,
      apiUrl: this.getApiUrl(mode),
    };
  }

  /**
   * Get PayPal API URL based on mode
   */
  private getApiUrl(mode: string): string {
    return mode === 'live' 
      ? 'https://api-m.paypal.com' 
      : 'https://api-m.sandbox.paypal.com';
  }

  /**
   * Get OAuth2 access token from PayPal
   * Step 1️⃣: Authenticate using Client ID and Secret
   */
  private async getAccessToken(config: PaymentConfig): Promise<string> {
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
    
    console.log('🔐 [PayPal] Requesting access token...');
    
    const response = await fetch(`${config.apiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ [PayPal] Failed to get access token:', error);
      throw new Error(`PayPal authentication failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [PayPal] Access token obtained');
    
    return data.access_token;
  }

  /**
   * Create PayPal checkout order
   * Step 2️⃣: Create order and get approval URL
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      console.log('💳 [PayPal] Creating checkout order...');
      console.log('📦 Order ID:', request.orderId);
      console.log('💰 Amount:', request.amount);

      const config = await this.getConfig();

      // Validate configuration
      if (!config.apiKey || !config.apiSecret) {
        throw new Error('PayPal credentials not configured');
      }

      // Get access token
      const accessToken = await this.getAccessToken(config);

      // Convert amount (assuming cents) to dollars
      const amountInDollars = (request.amount / 100).toFixed(2);
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';


      const orderPayload = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: request.orderId,
            amount: {
              currency_code: 'USD',
              value: amountInDollars,
            },
            description: `Order ${request.orderId}`,
          },
        ],
        application_context: {
          brand_name: process.env.SITE_NAME || 'Anonymous Store',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: request.returnUrl || `${baseUrl}/payment/success?orderId=${request.orderId}`,
          cancel_url: request.cancelUrl || `${baseUrl}/payment/cancel?orderId=${request.orderId}`,
        },
      };

      console.log('📤 [PayPal] Sending order request...');

      const response = await fetch(`${config.apiUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ [PayPal] Order creation failed:', error);
        throw new Error(error.message || 'PayPal order creation failed');
      }

      const orderData = await response.json();


      const providerRef = orderData.id;
      const approveLink = orderData.links.find((link: any) => link.rel === 'approve');
      const checkoutUrl = approveLink?.href || '';

      console.log('✅ [PayPal] Order created successfully');
      console.log('🔗 Checkout URL:', checkoutUrl);
      console.log('🆔 PayPal Order ID:', providerRef);


      return {
        success: true,
        provider: 'paypal',
        reference: providerRef,
        checkoutUrl,
        amount: request.amount,
        transactionId: providerRef,
        message: 'PayPal checkout session created successfully',
      };

    } catch (error: any) {
      console.error('❌ [PayPal] Payment creation error:', error);
      
      return {
        success: false,
        provider: 'paypal',
        reference: '',
        amount: request.amount,
        message: error.message || 'Failed to create PayPal payment',
        error: error,
      };
    }
  }

  /**
   * Check payment status by PayPal order ID
   */
  async checkStatus(reference: string): Promise<any> {
    try {
      console.log('🔍 [PayPal] Checking order status:', reference);

      const config = await this.getConfig();
      const accessToken = await this.getAccessToken(config);

      const response = await fetch(`${config.apiUrl}/v2/checkout/orders/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`PayPal status check failed: ${response.status}`);
      }

      const orderData = await response.json();
      
      console.log('✅ [PayPal] Order status:', orderData.status);

      return {
        success: true,
        status: this.mapPayPalStatus(orderData.status),
        reference,
        data: orderData,
      };

    } catch (error: any) {
      console.error('❌ [PayPal] Status check error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Map PayPal status to internal status
   */
  private mapPayPalStatus(paypalStatus: string): string {
    const statusMap: Record<string, string> = {
      'CREATED': 'PENDING',
      'SAVED': 'PENDING',
      'APPROVED': 'PENDING',
      'VOIDED': 'FAILED',
      'COMPLETED': 'SUCCESS',
      'PAYER_ACTION_REQUIRED': 'PENDING',
    };

    return statusMap[paypalStatus] || 'PENDING';
  }

  /**
   * Step 5️⃣: Verify PayPal webhook callback
   * 
   * @param payload - Webhook payload from PayPal
   * @param headers - HTTP headers from webhook request
   * 
   * TODO: Implement signature verification using PayPal's verify-webhook-signature API
   * For production, you should:
   * 1. Get webhook ID from PayPal dashboard
   * 2. Extract PayPal-Transmission-Id, PayPal-Transmission-Time, PayPal-Transmission-Sig from headers
   * 3. POST to /v1/notifications/verify-webhook-signature with:
   *    - transmission_id, transmission_time, transmission_sig
   *    - webhook_id (from dashboard)
   *    - webhook_event (the payload)
   * 4. Check if response.verification_status === "SUCCESS"
   * 
   * Reference: https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
   */
  verifyCallback(payload: any, headers: Record<string, string>): boolean {

    
    // MVP: Skip signature verification
    // In production, implement proper signature verification here
    
    // Basic validation: check if payload has required fields
    if (!payload || !payload.event_type || !payload.resource) {
      console.warn('⚠️  [PayPal] Invalid webhook payload structure');
      return false;
    }

    console.log('✅ [PayPal] Webhook validation passed (MVP mode)');
    return true;
  }

  /**
   * Step 6️⃣: Parse PayPal webhook callback
   * 
   * @param payload - Webhook payload from PayPal
   * @returns Parsed callback data with order status
   */
  parseCallback(payload: any): {
    orderId: string;
    status: string;
    providerRef: string;
    amount?: number;
    raw?: any;
  } {
    console.log('📥 [PayPal] Parsing webhook callback');
    console.log('📋 Event Type:', payload.event_type);

    const eventType = payload.event_type;
    const resource = payload.resource;

    // Map PayPal event types to internal statuses
    let status = 'PENDING';
    
    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      status = 'PENDING';
    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      status = 'SUCCESS';
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'PAYMENT.CAPTURE.DECLINED') {
      status = 'FAILED';
    } else if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
      status = 'REFUNDED'; // Optional: Handle refund events
    }

    // Extract order ID from purchase units
    let orderId = '';
    if (resource.purchase_units && resource.purchase_units.length > 0) {
      orderId = resource.purchase_units[0].reference_id || '';
    }

    // Extract amount if available
    let amount: number | undefined;
    if (resource.purchase_units && resource.purchase_units.length > 0) {
      const amountData = resource.purchase_units[0].amount;
      if (amountData && amountData.value) {
        // Convert dollars to cents
        amount = Math.round(parseFloat(amountData.value) * 100);
      }
    }

    const result = {
      orderId,
      status,
      providerRef: resource.id || '',
      amount,
      raw: payload,
    };

    console.log('✅ [PayPal] Callback parsed:', result);

    return result;
  }
}
