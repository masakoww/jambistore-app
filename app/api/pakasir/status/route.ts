import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reference = searchParams.get('reference');
    const amount = searchParams.get('amount');

    if (!reference || !amount) {
      return NextResponse.json(
        {
          success: false,
          message: 'Reference and amount parameters are required',
        },
        { status: 400 }
      );
    }

    console.log('🔍 Checking payment status for:', reference);

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

    const url = `${config.apiUrl}/transactiondetail?project=${config.project}&amount=${amount}&order_id=${reference}&api_key=${config.apiKey}`;

    const response = await fetch(url, {
      method: 'GET',
    });

    const data = await response.json();

    console.log('📥 Payment status:', JSON.stringify(data, null, 2));

    if (data.transaction) {
      // Map Pakasir status to expected format
      const isPaid = data.transaction.status === 'completed';
      
      return NextResponse.json({
        success: true,
        data: {
          status: isPaid ? 'PAID' : 'UNPAID',
          reference: data.transaction.order_id,
          amount: data.transaction.amount,
          amount_received: isPaid ? data.transaction.amount : 0,
        }
      });
    } else {
      // Transaction not found or still pending
      return NextResponse.json({
        success: true,
        data: {
          status: 'UNPAID',
          reference: reference,
          amount: parseInt(amount),
          amount_received: 0,
        }
      });
    }
  } catch (error: any) {
    console.error('❌ Error checking payment status:', error);
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
