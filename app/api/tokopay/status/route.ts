import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Tokopay Configuration
const TOKOPAY_MERCHANT_ID = process.env.TOKOPAY_MERCHANT_ID || '';
const TOKOPAY_SECRET_KEY = process.env.TOKOPAY_SECRET_KEY || '';
const TOKOPAY_API_URL = 'https://api.tokopay.id/v1';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const trxId = searchParams.get('trx_id');

    if (!reference && !trxId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Reference or trx_id parameter is required',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Checking Tokopay payment status for:', reference || trxId);

    const reffId = reference || trxId || '';

    // Generate signature: MD5(merchant_id + secret_key + reff_id)
    const signatureString = `${TOKOPAY_MERCHANT_ID}${TOKOPAY_SECRET_KEY}${reffId}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const params = new URLSearchParams({
      merchant_id: TOKOPAY_MERCHANT_ID,
      reff_id: reffId,
      signature: signature,
    });

    const response = await fetch(`${TOKOPAY_API_URL}/order?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('📥 Tokopay payment status:', JSON.stringify(data, null, 2));

    if (data.status === 'Success' && data.data) {
      // Tokopay status: "Paid", "Unpaid", "Expired"
      const isPaid = data.data.status === 'Paid';
      
      return NextResponse.json({
        success: true,
        data: {
          status: data.data.status === 'Paid' ? 'PAID' : data.data.status === 'Expired' ? 'EXPIRED' : 'UNPAID',
          reference: reffId,
          amount: parseFloat(data.data.total_bayar) || 0,
          amount_received: isPaid ? parseFloat(data.data.total_bayar) : 0,
          trx_id: data.data.trx_id,
        }
      });
    } else {
      // Transaction not found or still pending
      return NextResponse.json({
        success: true,
        data: {
          status: 'UNPAID',
          reference: reffId,
          amount: 0,
          amount_received: 0,
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Error checking Tokopay payment status:', error);
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
