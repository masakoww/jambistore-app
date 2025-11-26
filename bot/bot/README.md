# Order Management Bot

Clean, simple Discord bot for handling orders with tickets.

## Features

✅ Auto-create ticket channels when orders are created
✅ Display payment proof in ticket
✅ Admin action buttons (Send Account, Send Code, Reject)
✅ Modal forms for delivering products
✅ Automatic email delivery to customers
✅ Two-way chat sync with dashboard
✅ All messages saved to Firestore

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the bot:
```bash
start.bat
```

Or on Mac/Linux:
```bash
node index.js
```

## Webhooks

The bot exposes two webhook endpoints:

### POST /create-order-ticket
Creates a Discord ticket when an order is created.

**Request body:**
```json
{
  "orderId": "ABC123",
  "userId": "discord_user_id",
  "username": "Customer Name",
  "email": "customer@email.com",
  "productName": "Product Name",
  "plan": "1 Month",
  "amount": 10,
  "paymentProofUrl": "https://..."
}
```

### POST /send-ticket-message
Sends a message from dashboard to Discord ticket.

**Request body:**
```json
{
  "channelId": "ticket_channel_id",
  "message": "Hello from dashboard",
  "username": "Customer Name"
}
```

## Order Flow

1. Customer creates order → uploads payment proof
2. API calls `/create-order-ticket` webhook
3. Bot creates ticket channel with payment proof
4. Admin clicks action button
5. Admin fills modal form
6. Email sent to customer
7. Order marked as completed in Firestore
8. Chat messages synced both ways

## Environment Variables

- `DISCORD_TOKEN` - Your Discord bot token
- `PORT` - Webhook server port (default: 3001)
- `NEXT_PUBLIC_URL` - Your Next.js app URL
