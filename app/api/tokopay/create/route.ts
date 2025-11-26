import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Tokopay Configuration
const TOKOPAY_MERCHANT_ID = process.env.TOKOPAY_MERCHANT_ID || '';
const TOKOPAY_SECRET_KEY = process.env.TOKOPAY_SECRET_KEY || '';
const TOKOPAY_API_URL = 'https://api.tokopay.id/v1';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, customer_name, customer_email, order_id } = body;

    if (!amount || !customer_name || !order_id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing required fields: amount, customer_name, order_id',
        },
        { status: 400 }
      );
    }

    console.log('💳 Creating Tokopay payment for order:', order_id);

    // Generate signature: MD5(merchant_id + secret_key + order_id)
    const signatureString = `${TOKOPAY_MERCHANT_ID}${TOKOPAY_SECRET_KEY}${order_id}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const paymentData = {
      merchant_id: TOKOPAY_MERCHANT_ID,
      kode_channel: 'QRGOPAY', // Tokopay QRIS code
      reff_id: order_id,
      amount: amount,
      customer_name: customer_name,
      customer_email: customer_email || '',
      expired_ts: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
      signature: signature,
    };

    console.log('📤 Sending to Tokopay API:', JSON.stringify(paymentData, null, 2));

    const response = await fetch(`${TOKOPAY_API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const data = await response.json();

    console.log('📥 Tokopay response:', JSON.stringify(data, null, 2));

    if (data.status === 'Success' && data.data) {
      return NextResponse.json({
        success: true,
        data: {
          qr_string: data.data.qr_string,
          qr_link: data.data.qr_link,
          pay_url: data.data.pay_url,
          checkout_url: data.data.checkout_url,
          trx_id: data.data.trx_id,
          total_bayar: data.data.total_bayar,
          nomor_va: data.data.nomor_va,
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: data.message || 'Failed to create payment',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error creating Tokopay payment:', error);
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
