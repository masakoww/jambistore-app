/**
 * Staff Logger Utility
 * Sends admin action logs to Discord STAFF_LOG_CHANNEL_ID
 */

const STAFF_LOG_CHANNEL_ID = process.env.STAFF_LOG_CHANNEL_ID || process.env.DISCORD_STAFF_LOG_CHANNEL_ID;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

interface StaffLogOptions {
  orderId?: string;
  adminId?: string;
  adminName?: string;
  action: string;
  details?: string;
  color?: 'success' | 'error' | 'warning' | 'info';
}

const colorMap = {
  success: 0x10B981, // Green
  error: 0xEF4444,   // Red
  warning: 0xF59E0B, // Orange
  info: 0x3B82F6     // Blue
};

/**
 * Send a log message to Discord staff log channel
 */
export async function sendStaffLog(message: string, options?: Partial<StaffLogOptions>): Promise<void> {
  if (!STAFF_LOG_CHANNEL_ID) {
    console.warn('⚠️ STAFF_LOG_CHANNEL_ID not configured, skipping staff log');
    return;
  }

  if (!DISCORD_BOT_TOKEN) {
    console.warn('⚠️ DISCORD_BOT_TOKEN not configured, skipping staff log');
    return;
  }

  try {
    // Validate channel ID format (Discord snowflake: 17-20 digits)
    if (STAFF_LOG_CHANNEL_ID && !/^\d{17,20}$/.test(STAFF_LOG_CHANNEL_ID)) {
      console.warn('⚠️ STAFF_LOG_CHANNEL_ID appears invalid (should be 17-20 digits)');
      return; // Skip sending to avoid API errors
    }

    const embed: any = {
      description: message,
      color: colorMap[options?.color || 'info'],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Admin Action Log'
      }
    };

    if (options?.orderId) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: '📋 Order ID',
        value: `\`${options.orderId}\``,
        inline: true
      });
    }

    if (options?.adminName || options?.adminId) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: '👤 Admin',
        value: options.adminName || options.adminId || 'System',
        inline: true
      });
    }

    if (options?.details) {
      embed.fields = embed.fields || [];
      embed.fields.push({
        name: '📝 Details',
        value: options.details,
        inline: false
      });
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${STAFF_LOG_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        console.error('❌ Failed to send staff log:', { message: errorData.message, code: errorData.code });
        
        // Don't throw - make Discord logging non-critical
        if (errorData.code === 10003) {
          console.warn('⚠️ Invalid STAFF_LOG_CHANNEL_ID - please configure via Discord /setting command');
        }
      } catch {
        console.error('❌ Failed to send staff log:', errorText);
      }
    } else {

    }
  } catch (error) {
    console.error('❌ Error sending staff log:', error);
  }
}

/**
 * Predefined log templates for common actions
 */
export const StaffLogTemplates = {
  orderDelivered: (orderId: string, productName: string, adminName: string) =>
    `✅ Admin **${adminName}** mengirim produk **${productName}** untuk order \`${orderId}\``,
  
  orderRejected: (orderId: string, adminName: string, reason?: string) =>
    `❌ Admin **${adminName}** menolak order \`${orderId}\`${reason ? ` - Alasan: ${reason}` : ''}`,
  
  orderClosed: (orderId: string, profit: string, adminName: string) =>
    `🔒 Admin **${adminName}** menutup order \`${orderId}\` dengan profit **${profit}**`,
  
  stockUsed: (productSlug: string, itemId: string, orderId: string) =>
    `📦 Stok terpakai untuk produk **${productSlug}** (item #${itemId}) - Order \`${orderId}\``,
  
  deliveryError: (orderId: string, errorMessage: string) =>
    `⚠️ Error: gagal mengirim produk ke pembeli - Order \`${orderId}\` - ${errorMessage}`,
  
  paymentProofUploaded: (orderId: string, customerEmail: string, amount: string) =>
    `💳 Bukti pembayaran diterima - Order \`${orderId}\` - Customer: ${customerEmail} - Amount: ${amount}`,
  
  orderPaid: (orderId: string, productName: string, customerEmail: string) =>
    `💰 Pembayaran selesai - Order \`${orderId}\` - Product: **${productName}** - Customer: ${customerEmail}`,
  
  manualOrderCreated: (orderId: string, productName: string, adminName: string) =>
    `➕ Admin **${adminName}** membuat order manual \`${orderId}\` - Product: **${productName}**`,
  
  stockAdded: (productSlug: string, count: number, adminName: string) =>
    `📥 Admin **${adminName}** menambahkan ${count} stok untuk produk **${productSlug}**`,
  
  productCreated: (productSlug: string, adminName: string) =>
    `✨ Admin **${adminName}** membuat produk baru: **${productSlug}**`,
  
  productUpdated: (productSlug: string, adminName: string) =>
    `✏️ Admin **${adminName}** mengupdate produk: **${productSlug}**`,
  
  productDeleted: (productSlug: string, adminName: string) =>
    `🗑️ Admin **${adminName}** menghapus produk: **${productSlug}**`
};

/**
 * Create audit log entry in Firestore
 */
export async function createAuditLog(
  orderId: string,
  action: string,
  adminId: string,
  payload?: any
): Promise<void> {
  try {
    const { adminDb } = await import('./firebaseAdmin');
    
    await adminDb
      .collection('orders')
      .doc(orderId)
      .collection('auditLog')
      .add({
        action,
        adminId,
        payload: payload || null,
        timestamp: new Date()
      });


  } catch (error) {
    console.error('❌ Error creating audit log:', error);
  }
}
