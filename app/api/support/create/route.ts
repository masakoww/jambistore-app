import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp,
  doc,
  setDoc
} from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, userEmail, subject } = body;

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create support ticket
    const supportRef = collection(db, 'support');
    const ticketDoc = await addDoc(supportRef, {
      userId,
      userEmail,
      subject: subject || 'General Support',
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      discordChannelId: null, // Will be set by Discord bot
    });

    const ticketId = ticketDoc.id;

    // Add welcome message
    const messagesRef = collection(db, 'support', ticketId, 'messages');
    await addDoc(messagesRef, {
      content: `Hi! Thank you for contacting support. Our team will respond shortly. In the meantime, please describe your issue in detail.`,
      sender: 'system',
      senderName: 'Support Bot',
      timestamp: Timestamp.now(),
      read: false,
    });


    try {
      const discordResponse = await fetch('http://localhost:3001/webhook/support-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          userId,
          userEmail,
          subject: subject || 'General Support',
        }),
      });

      if (discordResponse.ok) {
        const discordData = await discordResponse.json();
        // Update ticket with Discord channel ID
        if (discordData.channelId) {
          await setDoc(
            doc(db, 'support', ticketId),
            { discordChannelId: discordData.channelId },
            { merge: true }
          );
        }
      }
    } catch (discordError) {
      console.error('Error calling Discord webhook:', discordError);
      // Don't fail the request if Discord integration fails
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Support ticket created successfully',
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}
