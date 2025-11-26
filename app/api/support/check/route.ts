import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has an open support ticket
    const supportRef = collection(db, 'support');
    const openTicketsQuery = query(
      supportRef,
      where('userId', '==', userId),
      where('status', '==', 'open'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(openTicketsQuery);

    if (!snapshot.empty) {
      const ticketDoc = snapshot.docs[0];
      return NextResponse.json({
        existingTicket: true,
        ticketId: ticketDoc.id,
        ticket: {
          id: ticketDoc.id,
          ...ticketDoc.data(),
        },
      });
    }

    return NextResponse.json({
      existingTicket: false,
      message: 'No open ticket found',
    });
  } catch (error) {
    console.error('Error checking support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to check support ticket' },
      { status: 500 }
    );
  }
}
