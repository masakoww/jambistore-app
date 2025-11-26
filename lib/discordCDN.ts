/**
 * Discord CDN Upload Utility
 * Uploads files to Discord using Bot Token instead of webhooks
 * Returns CDN URLs that are permanent and cost-free
 */

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_UPLOAD_CHANNEL_ID = process.env.DISCORD_UPLOAD_CHANNEL_ID || process.env.DISCORD_PROOF_CHANNEL_ID;

interface DiscordUploadResult {
  success: boolean;
  url?: string;
  messageId?: string;
  error?: string;
}

/**
 * Upload a file to Discord and get permanent CDN URL
 * @param file - File buffer or Blob
 * @param filename - Name of the file
 * @param description - Optional description for the file
 * @returns Discord CDN URL
 */
export async function uploadToDiscordCDN(
  file: Buffer | Blob,
  filename: string,
  description?: string
): Promise<DiscordUploadResult> {
  if (!DISCORD_BOT_TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN not configured');
    return { success: false, error: 'Discord bot token not configured' };
  }

  if (!DISCORD_UPLOAD_CHANNEL_ID) {
    console.error('❌ DISCORD_UPLOAD_CHANNEL_ID not configured');
    return { success: false, error: 'Discord upload channel not configured' };
  }

  try {
    // Create FormData for Discord API
    const formData = new FormData();
    
    // Add file - convert Buffer to proper format
    let blob: Blob;
    if (file instanceof Blob) {
      blob = file;
    } else if (Buffer.isBuffer(file)) {
      // Convert Buffer to Uint8Array then to Blob
      blob = new Blob([new Uint8Array(file)]);
    } else {
      blob = new Blob([file]);
    }
    formData.append('files[0]', blob, filename);

    // Add optional message payload
    if (description) {
      formData.append('payload_json', JSON.stringify({
        content: description
      }));
    }

    // Upload to Discord using Bot Token
    const response = await fetch(
      `https://discord.com/api/v10/channels/${DISCORD_UPLOAD_CHANNEL_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Discord upload failed:', errorText);
      return { 
        success: false, 
        error: `Discord API error: ${response.status} ${response.statusText}` 
      };
    }

    const data = await response.json();
    const attachmentUrl = data.attachments?.[0]?.url;
    const messageId = data.id;

    if (!attachmentUrl) {
      console.error('❌ No attachment URL in Discord response');
      return { success: false, error: 'No attachment URL in response' };
    }

    console.log('✅ File uploaded to Discord CDN:', attachmentUrl);

    return {
      success: true,
      url: attachmentUrl,
      messageId
    };
  } catch (error) {
    console.error('❌ Error uploading to Discord:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload payment proof to Discord CDN
 * Specialized function for payment proof uploads
 */
export async function uploadPaymentProof(
  file: Buffer | Blob,
  orderId: string,
  customerEmail: string
): Promise<DiscordUploadResult> {
  const filename = `payment_proof_${orderId}_${Date.now()}.jpg`;
  const description = `💳 Payment Proof\nOrder: ${orderId}\nCustomer: ${customerEmail}`;
  
  return uploadToDiscordCDN(file, filename, description);
}

/**
 * Upload any order-related file to Discord CDN
 */
export async function uploadOrderFile(
  file: Buffer | Blob,
  orderId: string,
  fileType: 'proof' | 'document' | 'screenshot',
  originalFilename?: string
): Promise<DiscordUploadResult> {
  const timestamp = Date.now();
  const extension = originalFilename?.split('.').pop() || 'jpg';
  const filename = `order_${orderId}_${fileType}_${timestamp}.${extension}`;
  const description = `📎 Order File\nType: ${fileType}\nOrder: ${orderId}`;
  
  return uploadToDiscordCDN(file, filename, description);
}
