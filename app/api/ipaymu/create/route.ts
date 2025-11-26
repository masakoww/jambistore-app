import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebaseAdmin';

// Get iPaymu configuration from environment variables or Firestore
async function getIpaymuConfig() {
  try {
    // Try to get config from Firestore admin settings first
    const settingsDoc = await adminDb.collection('settings').doc('ipaymu').get();
    
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      if (data?.apiKey && data?.va) {
        console.log('🔧 Using iPaymu config from Firestore');
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
  console.log('🔧 Using iPaymu config from environment variables');
  return {
    apiKey: process.env.IPAYMU_API_KEY || '',
    va: process.env.IPAYMU_VA || '',
    apiUrl: process.env.IPAYMU_API_URL || 'https://my.ipaymu.com/api/v2',
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
      customer_phone,
    } = body;

    console.log('🚀 Creating iPaymu payment for order:', merchant_ref);
    console.log('💰 Amount:', amount);

    // Get configuration
    const config = await getIpaymuConfig();

    if (!config.apiKey || !config.va) {
      console.error('❌ iPaymu not configured:', { 
        hasApiKey: !!config.apiKey, 
        hasVa: !!config.va 
      });
      return NextResponse.json(
        {
          success: false,
          message: 'iPaymu payment gateway not configured. Please add IPAYMU_API_KEY and IPAYMU_VA to environment variables or Firestore settings/ipaymu.',
        },
        { status: 500 }
      );
    }

    // iPaymu requires amount in IDR
    const bodyData = {
      product: ['Digital Product'],
      qty: [1],
      price: [amount],
      returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment`,
      notifyUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/webhook/ipaymu`,
      referenceId: merchant_ref,
      buyerName: customer_name,
      buyerEmail: customer_email,
      buyerPhone: customer_phone || '081234567890',
      paymentMethod: 'qris',
      paymentChannel: 'qris',
    };

    const bodyJson = JSON.stringify(bodyData);

    // Generate signature
    const signature = crypto
      .createHmac('sha256', config.apiKey)
      .update(config.va + bodyJson)
      .digest('hex');

    console.log('📤 Calling iPaymu API...');

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

    console.log('📥 iPaymu API Response:', JSON.stringify(data, null, 2));

    if (data.Status === 200 && data.Data) {
      return NextResponse.json({
        success: true,
        data: {
          reference: merchant_ref,
          qr_url: data.Data.QrImage || data.Data.QRImage,
          qr_string: data.Data.QrString || data.Data.QRString,
          amount: amount,
          payment_url: data.Data.Url,
          session_id: data.Data.SessionID,
          transaction_id: data.Data.TransactionId,
          expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: data.Message || 'Failed to create payment',
          error: data
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error creating iPaymu payment:', error);
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
