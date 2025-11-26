import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// iPaymu Configuration
const IPAYMU_API_KEY = process.env.IPAYMU_API_KEY || '';
const IPAYMU_VA = process.env.IPAYMU_VA || '';
const IPAYMU_API_URL = 'https://my.ipaymu.com/api/v2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const transactionId = searchParams.get('transactionId');

    if (!reference && !transactionId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Reference or transactionId parameter is required',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Checking iPaymu payment status for:', reference || transactionId);

    const bodyData = {
      transactionId: transactionId || reference,
    };

    const bodyJson = JSON.stringify(bodyData);

    // Generate signature
    const signature = crypto
      .createHmac('sha256', IPAYMU_API_KEY)
      .update(IPAYMU_VA + bodyJson)
      .digest('hex');

    const response = await fetch(`${IPAYMU_API_URL}/transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'va': IPAYMU_VA,
        'signature': signature,
      },
      body: bodyJson,
    });

    const data = await response.json();

    console.log('📥 iPaymu payment status:', JSON.stringify(data, null, 2));

    if (data.Status === 200 && data.Data) {
      // iPaymu status codes: 0=pending, 1=paid, -1=expired/cancelled
      const isPaid = data.Data.Status === 1;
      
      return NextResponse.json({
        success: true,
        data: {
          status: isPaid ? 'PAID' : data.Data.Status === -1 ? 'EXPIRED' : 'UNPAID',
          reference: reference || transactionId,
          amount: data.Data.Total || 0,
          amount_received: isPaid ? data.Data.Total : 0,
          transaction_id: data.Data.TransactionId,
        }
      });
    } else {
      // Transaction not found or still pending
      return NextResponse.json({
        success: true,
        data: {
          status: 'UNPAID',
          reference: reference || transactionId,
          amount: 0,
          amount_received: 0,
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Error checking iPaymu payment status:', error);
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
