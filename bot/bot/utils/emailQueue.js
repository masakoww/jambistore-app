const { db, admin } = require('./firebase');
const fetch = require('node-fetch');

// Map templates to subject/body generation logic (simplified for bot)
// In a real scenario, this might share code with the main app or call an API.
// For now, we'll implement a simple sender that calls the main app's API or uses a basic sender.
// BETTER APPROACH: The bot should call the Next.js API to send the email, to reuse the templates in `lib/emailUtil.ts`.
// But `lib/emailUtil.ts` is server-side code. The bot is a separate process.
// We can't easily import `lib/emailUtil.ts` in the bot (JS vs TS, different environments).
// So the bot will act as a trigger. It will read the queue, and for each item, it will call an internal API endpoint on the Next.js app to "process queue item" or "send email".
// OR, we can just implement the sending logic here using `nodemailer` or `fetch` if we want to keep it simple.
// Given the requirement "Implement queue-based retry", the bot is the worker.
// Let's make the bot call the Next.js API `/api/email/send-raw` (which we need to create) OR just use `nodemailer` directly if configured.
// Actually, the plan said: "Bot will just use `nodemailer` or `fetch` to the existing `/api/email/send-product`".
// But `send-product` is specific to delivery.
// Let's create a new API route `/api/email/process-queue-item` in Next.js that takes a queue item ID, processes it (sends email), and returns success.
// This way, the logic for templates remains in Next.js `lib/emailUtil.ts`.
// The bot just picks up pending items and tells Next.js "Hey, process this item".

// Wait, if I create `/api/email/process-queue-item`, I need to secure it.
// For now, let's assume the bot can call it.
// OR, even simpler: The bot just calls `sendTemplatedEmail` logic if I replicate it? No, duplication is bad.

// REVISED PLAN:
// 1. Create `/api/internal/process-mail-queue` in Next.js.
//    - It accepts `queueId`.
//    - It reads the queue item from Firestore.
//    - It calls `sendTemplatedEmail` (which I just updated).
//    - It updates the queue item status.
// 2. The bot just polls `mail_queue`, finds pending items, and calls this API.

// However, the user wants "Implement `utils/emailQueue.js` in bot".
// So I will write the bot worker code here.

const PROCESS_URL = process.env.NEXT_PUBLIC_URL + '/api/internal/process-mail-queue';
const API_SECRET = process.env.CRON_SECRET || 'some-secret-key'; // We should probably have a secret

async function processQueue() {
  try {
    const now = admin.firestore.Timestamp.now();
    
    // Query for pending items scheduled for now or past
    const snapshot = await db.collection('mail_queue')
      .where('status', '==', 'pending')
      .where('scheduledAt', '<=', now)
      .limit(5) // Process 5 at a time
      .get();

    if (snapshot.empty) return;

    console.log(`📧 [Queue] Processing ${snapshot.size} email(s)...`);

    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const queueId = doc.id;

      // Mark as processing to prevent double processing
      await doc.ref.update({
        status: 'processing',
        processedAt: now,
        attempts: admin.firestore.FieldValue.increment(1)
      });

      try {
        // Call Next.js API to actually send the email (reusing lib/emailUtil.ts logic)
        // We need to create this API route.
        // For now, let's assume we will create it.
        const response = await fetch(`${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/internal/process-mail-queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-secret': API_SECRET
          },
          body: JSON.stringify({ queueId })
        });

        const result = await response.json();

        if (result.success) {
          await doc.ref.update({ status: 'completed', completedAt: admin.firestore.Timestamp.now() });
          console.log(`✅ [Queue] Email ${queueId} sent successfully`);
        } else {
          throw new Error(result.error || 'Unknown error');
        }

      } catch (error) {
        console.error(`❌ [Queue] Failed to process ${queueId}:`, error.message);
        

        if ((data.attempts || 0) + 1 >= 3) {
          await doc.ref.update({ 
            status: 'failed', 
            error: error.message,
            failedAt: admin.firestore.Timestamp.now()
          });
        } else {
          // Retry in 1 minute
          const nextAttempt = new Date();
          nextAttempt.setMinutes(nextAttempt.getMinutes() + 1);
          await doc.ref.update({ 
            status: 'pending', 
            scheduledAt: nextAttempt,
            lastError: error.message
          });
        }
      }
    }

  } catch (error) {
    console.error('❌ [Queue] Error processing queue:', error);
  }
}

module.exports = { processQueue };
