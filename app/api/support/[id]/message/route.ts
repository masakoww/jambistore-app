import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  Timestamp,
  doc,
  getDoc,
  updateDoc
} from 'firebase/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await req.json();
    const { content, userId, userEmail } = body;

    if (!content || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify ticket exists and belongs to user
    const ticketRef = doc(db, 'support', ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data();
    if (ticketData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Add message to Firestore
    const messagesRef = collection(db, 'support', ticketId, 'messages');
    const messageDoc = await addDoc(messagesRef, {
      content: content.trim(),
      sender: 'user',
      senderId: userId,
      senderName: userEmail,
      timestamp: Timestamp.now(),
      read: false,
    });

    // Update ticket's updatedAt timestamp
    await updateDoc(ticketRef, {
      updatedAt: Timestamp.now(),
    });


    try {
      const discordChannelId = ticketData.discordChannelId;
      if (discordChannelId) {
        await fetch('http://localhost:3001/webhook/support-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId,
            channelId: discordChannelId,
            message: content.trim(),
            userEmail,
          }),
        });
      }
    } catch (discordError) {
      console.error('Error calling Discord webhook:', discordError);
      // Don't fail the request if Discord integration fails
    }

    return NextResponse.json({
      success: true,
      messageId: messageDoc.id,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error sending support message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Verify ticket exists and belongs to user
    const ticketRef = doc(db, 'support', ticketId);
    const ticketDoc = await getDoc(ticketRef);

    if (!ticketDoc.exists()) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    const ticketData = ticketDoc.data();
    if (ticketData.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketDoc.id,
        ...ticketData,
      },
    });
  } catch (error) {
    console.error('Error fetching support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket' },
      { status: 500 }
    );
  }
}
