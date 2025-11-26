import { IPaymentProvider, PaymentConfig, PaymentRequest, PaymentResponse } from './IPaymentProvider';
import { adminDb } from '@/lib/firebaseAdmin';
// @ts-ignore
import QRCode from 'qrcode';

export class PakasirProvider implements IPaymentProvider {
  name = 'pakasir';

  async getConfig(): Promise<PaymentConfig> {
    try {
      // Try Firestore first
      const settingsDoc = await adminDb.collection('settings').doc('pakasir').get();
      
      if (settingsDoc.exists) {
        const data = settingsDoc.data();
        if (data?.apiKey && data?.project) {

          return {
            apiKey: data.apiKey,
            project: data.project,
            apiUrl: data.apiUrl || 'https://app.pakasir.com/api',
          };
        }
      }
    } catch (error) {
      console.error('⚠️ Error fetching Pakasir config from Firestore:', error);
    }

    // Fallback to environment variables

    return {
      apiKey: process.env.PAKASIR_API_KEY || '',
      project: process.env.PAKASIR_PROJECT || 'jambitopup-website',
      apiUrl: process.env.PAKASIR_API_URL || 'https://app.pakasir.com/api',
    };
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {


      const config = await this.getConfig();

      if (!config.apiKey) {
        throw new Error('Pakasir API key not configured');
      }

      const payload = {
        project: config.project,
        order_id: request.orderId,
        amount: request.amount,
        api_key: config.apiKey,
      };



      const response = await fetch(`${config.apiUrl}/transactioncreate/qris`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();



      if (data.payment) {
        const qrString = data.payment.payment_number;
        
        // Generate QR code as base64 data URL
        const qrCodeDataUrl = await QRCode.toDataURL(qrString, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });



        return {
          success: true,
          provider: 'pakasir',
          reference: data.payment.order_id,
          qrUrl: qrCodeDataUrl,
          qrString: qrString,
          amount: data.payment.amount,
          fee: data.payment.fee,
          totalPayment: data.payment.total_payment,
          expiryTime: new Date(data.payment.expired_at).getTime() / 1000,
        };
      } else {
        throw new Error(data.message || 'Failed to create Pakasir payment');
      }
    } catch (error: any) {
      console.error('❌ [Pakasir] Error:', error);
      return {
        success: false,
        provider: 'pakasir',
        reference: request.orderId,
        amount: request.amount,
        message: error.message,
        error: error,
      };
    }
  }

  async checkStatus(reference: string): Promise<any> {
    const config = await this.getConfig();
    
    const response = await fetch(`${config.apiUrl}/transactionstatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        project: config.project,
        order_id: reference,
        api_key: config.apiKey,
      }),
    });

    return response.json();
  }
}
