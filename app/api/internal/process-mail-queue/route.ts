import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendTemplatedEmail } from '@/lib/emailUtil';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { queueId } = await request.json();
    const secret = request.headers.get('x-api-secret');

    // Basic security check (should ideally use a real secret from env)
    if (secret !== (process.env.CRON_SECRET || 'some-secret-key')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!queueId) {
      return NextResponse.json({ success: false, error: 'Missing queueId' }, { status: 400 });
    }

    const docRef = adminDb.collection('mail_queue').doc(queueId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Queue item not found' }, { status: 404 });
    }

    const data = doc.data();

    // Send the email using the shared utility
    const result = await sendTemplatedEmail(
      data?.to,
      data?.template,
      data?.data
    );

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false, error: result.error });
    }

  } catch (error: any) {
    console.error('Error processing queue item:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
