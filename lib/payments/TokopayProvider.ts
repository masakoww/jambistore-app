import { IPaymentProvider, PaymentConfig, PaymentRequest, PaymentResponse } from './IPaymentProvider';
import { adminDb } from '@/lib/firebaseAdmin';

export class TokopayProvider implements IPaymentProvider {
  name = 'tokopay';

  async getConfig(): Promise<PaymentConfig> {
    try {
      // Try Firestore first
      const settingsDoc = await adminDb.collection('settings').doc('tokopay').get();
      
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.merchantId && data?.secret) {

          return {
            apiKey: data.secret,
            merchantId: data.merchantId,
            apiUrl: data.apiUrl || 'https://api.tokopay.id/v1',
          };
        }
      }
    } catch (error) {
      console.error('⚠️ Error fetching Tokopay config from Firestore:', error);
    }

    // Fallback to environment variables

    return {
      apiKey: process.env.TOKOPAY_SECRET || '',
      merchantId: process.env.TOKOPAY_MERCHANT_ID || '',
      apiUrl: process.env.TOKOPAY_API_URL || 'https://api.tokopay.id/v1',
    };
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {


      const config = await this.getConfig();

      if (!config.apiKey || !config.merchantId) {
        throw new Error('Tokopay not configured. Missing merchant ID or secret.');
      }

      const payload = {
        merchant_id: config.merchantId,
        kode_channel: 'QRGOPAY', // QRIS channel
        reff_id: request.orderId,
        amount: request.amount,
        customer_name: request.customerName,
        customer_email: request.customerEmail || 'customer@example.com',
        customer_phone: request.customerPhone || '081234567890',
        expired_ts: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        signature: '', // Will be generated
      };

      // Generate signature (example - adjust based on Tokopay docs)
      const crypto = require('crypto');
      const signatureString = `${config.merchantId}:${request.orderId}:${request.amount}:${config.apiKey}`;
      payload.signature = crypto.createHash('md5').update(signatureString).digest('hex');



      const response = await fetch(`${config.apiUrl}/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();



      if (data.status === 'Success' && data.data) {


        return {
          success: true,
          provider: 'tokopay',
          reference: data.data.no_pembayaran || request.orderId,
          qrUrl: data.data.qr_link,
          qrString: data.data.qr_string,
          checkoutUrl: data.data.pay_url,
          amount: data.data.total_bayar,
          expiryTime: payload.expired_ts,
        };
      } else {
        throw new Error(data.message || 'Failed to create Tokopay payment');
      }
    } catch (error: any) {
      console.error('❌ [Tokopay] Error:', error);
      return {
        success: false,
        provider: 'tokopay',
        reference: request.orderId,
        amount: request.amount,
        message: error.message,
        error: error,
      };
    }
  }

  async checkStatus(reference: string): Promise<any> {
    const config = await this.getConfig();
    
    const crypto = require('crypto');
    const signatureString = `${config.merchantId}:${reference}:${config.apiKey}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const response = await fetch(`${config.apiUrl}/order?merchant_id=${config.merchantId}&reff_id=${reference}&signature=${signature}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.json();
  }
}
