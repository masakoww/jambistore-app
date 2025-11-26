import { IPaymentProvider, PaymentConfig, PaymentRequest, PaymentResponse } from './IPaymentProvider';
import { adminDb } from '@/lib/firebaseAdmin';
import crypto from 'crypto';

export class IpaymuProvider implements IPaymentProvider {
  name = 'ipaymu';

  async getConfig(): Promise<PaymentConfig> {
    try {
      // Try Firestore first
      const settingsDoc = await adminDb.collection('settings').doc('ipaymu').get();
      
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.apiKey && data?.va) {

          return {
            apiKey: data.apiKey,
            va: data.va,
            apiUrl: data.apiUrl || 'https://my.ipaymu.com/api/v2',
          };
        }
      }
    } catch (error) {
      console.error('⚠️ Error fetching iPaymu config from Firestore:', error);
    }

    // Fallback to environment variables

    return {
      apiKey: process.env.IPAYMU_API_KEY || '',
      va: process.env.IPAYMU_VA || '',
      apiUrl: process.env.IPAYMU_API_URL || 'https://my.ipaymu.com/api/v2',
    };
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {


      const config = await this.getConfig();

      if (!config.apiKey || !config.va) {
        throw new Error('iPaymu not configured. Missing API key or VA.');
      }

      const bodyData = {
        product: ['Digital Product'],
        qty: [1],
        price: [request.amount],
        returnUrl: request.returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
        cancelUrl: request.cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment`,
        notifyUrl: request.notifyUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook/ipaymu`,
        referenceId: request.orderId,
        buyerName: request.customerName,
        buyerEmail: request.customerEmail || 'customer@example.com',
        buyerPhone: request.customerPhone || '081234567890',
        paymentMethod: 'qris',
        paymentChannel: 'qris',
      };

      const bodyJson = JSON.stringify(bodyData);

      // Generate signature
      const signature = crypto
        .createHmac('sha256', config.apiKey)
        .update(config.va + bodyJson)
        .digest('hex');



      const response = await fetch(`${config.apiUrl}/payment/direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'va': config.va,
          'signature': signature,
        },
        body: bodyJson,
      });

      const data = await response.json();



      if (data.Status === 200 && data.Data) {


        return {
          success: true,
          provider: 'ipaymu',
          reference: request.orderId,
          qrUrl: data.Data.QrImage || data.Data.QRImage,
          qrString: data.Data.QrString || data.Data.QRString,
          checkoutUrl: data.Data.Url,
          amount: request.amount,
          sessionId: data.Data.SessionID,
          transactionId: data.Data.TransactionId,
          expiryTime: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        };
      } else {
        throw new Error(data.Message || 'Failed to create iPaymu payment');
      }
    } catch (error: any) {
      console.error('❌ [iPaymu] Error:', error);
      return {
        success: false,
        provider: 'ipaymu',
        reference: request.orderId,
        amount: request.amount,
        message: error.message,
        error: error,
      };
    }
  }

  async checkStatus(reference: string): Promise<any> {
    const config = await this.getConfig();
    
    const bodyData = {
      transactionId: reference,
    };

    const bodyJson = JSON.stringify(bodyData);

    const signature = crypto
      .createHmac('sha256', config.apiKey)
      .update(config.va + bodyJson)
      .digest('hex');

    const response = await fetch(`${config.apiUrl}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'va': config.va,
        'signature': signature,
      },
      body: bodyJson,
    });

    return response.json();
  }
}
