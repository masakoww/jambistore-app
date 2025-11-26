const { db } = require('./firebase');
const fetch = require('node-fetch');

/**
 * Create an order via the Next.js API
 */
async function createOrderViaApi(orderData) {
  const apiUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${apiUrl}/api/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add secret if needed for internal API, but this is public endpoint usually
      },
      body: JSON.stringify(orderData)
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.message || 'Failed to create order via API');
    }

    return result;
  } catch (error) {
    console.error('API Order Creation Error:', error);
    throw error;
  }
}

/**
 * Validate order for claiming
 * Rules: Order exists, Status is PENDING, Discord ID matches
 */
async function validateOrderForClaim(orderId, discordId) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return { valid: false, message: 'Order ID not found.' };

  const data = doc.data();
  
  if (data.status !== 'PENDING') {
    return { valid: false, message: `Order status is ${data.status}. Only PENDING orders can be claimed.` };
  }

  // If order already has a discordId, it must match
  if (data.discordId && data.discordId !== discordId) {
    return { valid: false, message: 'This order belongs to another user.' };
  }

  // If order has no discordId, we can allow claiming (linking)
  // But usually claim is for existing orders. 
  // Let's assume strict check: user must have created it or it's a guest order being claimed?
  // Requirement says: "order.discordId must match the current user"
  // This implies the order MUST have a discordId already? 
  // Or does it mean "IF it has one"? 
  // Let's stick to: If it has one, it must match. If not, maybe allow?
  // Re-reading requirement: "order.discordId must match the current user" -> implies strict match.
  // So if discordId is missing, they can't claim it via this flow? 
  // Actually, "Claim Order" usually means "I bought this as guest/website, now I want to open a ticket".
  // If they bought on website as guest, they might not have discordId on order.
  // BUT, the requirement says "order.discordId must match". 
  // We will enforce strict match if discordId exists. If null, we might fail or allow.
  // Let's fail if null to be safe, or ask user? 
  // "order.discordId must match the current user" -> Strict.
  
  if (!data.discordId) {
      return { valid: false, message: 'This order is not linked to a Discord account.' };
  }

  if (data.discordId !== discordId) {
      return { valid: false, message: 'This order belongs to another Discord account.' };
  }

  return { valid: true, order: data };
}

/**
 * Validate order for support
 * Rules: Order exists, Status COMPLETED/REJECTED, Discord ID matches
 */
async function validateOrderForSupport(orderId, discordId) {
  const doc = await db.collection('orders').doc(orderId).get();
  if (!doc.exists) return { valid: false, message: 'Order ID not found.' };

  const data = doc.data();

  if (!['COMPLETED', 'REJECTED'].includes(data.status)) {
    return { valid: false, message: `Order status is ${data.status}. Support is only for COMPLETED or REJECTED orders.` };
  }

  if (data.discordId !== discordId) {
    return { valid: false, message: 'This order does not belong to you.' };
  }

  return { valid: true, order: data };
}

module.exports = { createOrderViaApi, validateOrderForClaim, validateOrderForSupport };
