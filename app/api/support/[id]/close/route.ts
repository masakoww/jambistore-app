import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs,
  orderBy,
  query,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  Timestamp
} from 'firebase/firestore';

interface TranscriptMessage {
  content: string;
  sender: string;
  senderName: string;
  timestamp: Date;
}

function generateTranscriptHTML(messages: TranscriptMessage[], ticketId: string, userEmail: string): string {
  const messageRows = messages
    .map((msg) => {
      const time = msg.timestamp.toLocaleString();
      const senderClass = msg.sender === 'user' ? 'user-message' : 'admin-message';
      const senderLabel = msg.sender === 'user' ? 'You' : msg.senderName || 'Support Team';
      
      return `
        <div class="message ${senderClass}">
          <div class="message-header">
            <span class="sender">${senderLabel}</span>
            <span class="timestamp">${time}</span>
          </div>
          <div class="message-content">${msg.content}</div>
        </div>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Support Ticket Transcript - ${ticketId}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #3B82F6;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #1F2937;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .header .meta {
      color: #6B7280;
      font-size: 14px;
    }
    .messages {
      margin-top: 30px;
    }
    .message {
      margin-bottom: 20px;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid #E5E7EB;
    }
    .user-message {
      background-color: #EFF6FF;
      border-left-color: #3B82F6;
    }
    .admin-message {
      background-color: #F9FAFB;
      border-left-color: #10B981;
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .sender {
      font-weight: 600;
      color: #374151;
    }
    .timestamp {
      color: #9CA3AF;
    }
    .message-content {
      color: #1F2937;
      white-space: pre-wrap;
      line-height: 1.5;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎧 Support Ticket Transcript</h1>
      <div class="meta">
        <strong>Ticket ID:</strong> ${ticketId}<br>
        <strong>Customer:</strong> ${userEmail}<br>
        <strong>Generated:</strong> ${new Date().toLocaleString()}
      </div>
    </div>
    
    <div class="messages">
      ${messageRows}
    </div>
    
    <div class="footer">
      <p>This is an automated transcript of your support conversation.</p>
      <p>Thank you for contacting our support team!</p>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id;
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
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

    // Get all messages
    const messagesRef = collection(db, 'support', ticketId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
    const messagesSnapshot = await getDocs(messagesQuery);

    const messages: TranscriptMessage[] = [];
    messagesSnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        content: data.content || '',
        sender: data.sender || 'system',
        senderName: data.senderName || 'Unknown',
        timestamp: data.timestamp?.toDate?.() || new Date(),
      });
    });

    // Generate HTML transcript
    const transcriptHTML = generateTranscriptHTML(messages, ticketId, ticketData.userEmail);

    // Store transcript in Firestore
    await setDoc(doc(db, 'support', ticketId, 'metadata', 'transcript'), {
      html: transcriptHTML,
      messageCount: messages.length,
      generatedAt: Timestamp.now(),
    });

    // Update ticket status to closed
    await updateDoc(ticketRef, {
      status: 'closed',
      closedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });


    // For now, we'll just return the transcript
    // In production, integrate with SendGrid, Resend, or similar

    try {
      // Call Discord bot to log ticket closure
      await fetch('http://localhost:3001/webhook/support-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          userEmail: ticketData.userEmail,
          messageCount: messages.length,
        }),
      });
    } catch (discordError) {
      console.error('Error calling Discord webhook:', discordError);
    }

    return NextResponse.json({
      success: true,
      transcript: transcriptHTML,
      messageCount: messages.length,
      message: 'Ticket closed and transcript generated',
    });
  } catch (error) {
    console.error('Error closing support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to close ticket' },
      { status: 500 }
    );
  }
}
