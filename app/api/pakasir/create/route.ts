import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import QRCode from 'qrcode';
import { adminDb } from '@/lib/firebaseAdmin';

// Get Pakasir configuration from environment variables or Firestore
async function getPakasirConfig() {
  try {
    // Try to get config from Firestore admin settings first
    const settingsDoc = await adminDb.collection('settings').doc('pakasir').get();
    
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      if (data?.apiKey && data?.project) {
        console.log('🔧 Using Pakasir config from Firestore');
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
  console.log('🔧 Using Pakasir config from environment variables');
  return {
    apiKey: process.env.PAKASIR_API_KEY || '',
    project: process.env.PAKASIR_PROJECT || 'jambitopup-website',
    apiUrl: process.env.PAKASIR_API_URL || 'https://app.pakasir.com/api',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      merchant_ref,
      amount,
      customer_name,
      customer_email,
    } = body;

    console.log('🚀 Creating QRIS payment for order:', merchant_ref);
    console.log('💰 Amount:', amount);

    // Get configuration
    const config = await getPakasirConfig();

    if (!config.apiKey) {
      console.error('❌ Pakasir API key not configured');
      return NextResponse.json(
        {
          success: false,
          message: 'Payment gateway not configured. Please contact administrator.',
        },
        { status: 500 }
      );
    }

    // Pakasir API payload
    const payload = {
      project: config.project,
      order_id: merchant_ref,
      amount: amount,
      api_key: config.apiKey
    };

    console.log('📤 Calling Pakasir API...');
    console.log('🔑 Project:', config.project);

    const response = await fetch(`${config.apiUrl}/transactioncreate/qris`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log('📥 Pakasir API Response:', JSON.stringify(data, null, 2));

    if (data.payment) {
      // Generate QR Code from QRIS string using qrcode library
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

      console.log('✅ QR Code generated successfully');

      return NextResponse.json({
        success: true,
        data: {
          reference: data.payment.order_id,
          qr_url: qrCodeDataUrl,
          qr_string: qrString,
          amount: data.payment.amount,
          fee: data.payment.fee,
          total_payment: data.payment.total_payment,
          expired_time: new Date(data.payment.expired_at).getTime() / 1000,
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Failed to create payment',
          error: data
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error creating payment:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
