/**
 * Email Utility Service
 * Enhanced wrapper for sending emails with support for multiple providers
 * 
 * Supported Providers:
 * - Resend (recommended for modern API)
 * - Brevo (formerly Sendinblue)
 * - SendGrid (reliable enterprise solution)
 * - Nodemailer (flexible SMTP solution)
 * 
 * Environment Variables:
 * - EMAIL_PROVIDER: 'resend' | 'brevo' | 'sendgrid' | 'nodemailer'
 * - EMAIL_API_KEY: Generic API key for any provider
 * - RESEND_API_KEY: Resend-specific API key
 * - BREVO_API_KEY: Brevo-specific API key
 * - SENDGRID_API_KEY: SendGrid-specific API key
 * - EMAIL_FROM: Default sender email address
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS: For Nodemailer
 */

import { adminDb } from '@/lib/firebaseAdmin';

export type EmailProvider = 'resend' | 'brevo' | 'sendgrid' | 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
  from?: string;
  replyTo?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: string; // Track which provider was used
}

interface EmailSettings {
  brevoApiKey?: string;
  senderEmail?: string;
  senderName?: string;
  provider?: EmailProvider;
}

/**
 * Fetch email settings from Firestore
 */
async function getStoredSettings(): Promise<EmailSettings> {
  try {
    const settingsDoc = await adminDb.collection('settings').doc('email_template').get();
    if (settingsDoc.exists) {
      return settingsDoc.data() as EmailSettings;
    }
  } catch (error) {
    console.error('Error fetching email settings from Firestore:', error);
  }
  return {};
}

/**
 * Detect available email provider based on environment variables or settings
 */
function detectProvider(settings?: EmailSettings): EmailProvider | null {
  // 1. Check settings first (if we want to allow switching via dashboard)
  // For now, we only support Brevo via dashboard settings as per the Admin UI
  if (settings?.brevoApiKey) return 'brevo';

  // 2. Check environment variables
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.BREVO_API_KEY) return 'brevo';
  if (process.env.SENDGRID_API_KEY) return 'sendgrid';
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return 'nodemailer';
  
  // Fallback to generic key if specific ones are missing
  if (process.env.EMAIL_API_KEY) return 'brevo'; // Default to Brevo
  
  return null;
}

/**
 * Main function to send email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  // Fetch settings from Firestore
  const settings = await getStoredSettings();
  
  const provider = process.env.EMAIL_PROVIDER as EmailProvider || detectProvider(settings);

  if (!provider) {
    console.error('❌ [Email] No email provider configured');
    return {
      success: false,
      error: 'No email provider configured. Please set EMAIL_PROVIDER or API keys.',
    };
  }

  console.log(`📧 [Email] Sending email via ${provider} to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);

  try {
    switch (provider) {
      case 'resend':
        return await sendViaResend(options, settings);
      case 'brevo':
        return await sendViaBrevo(options, settings);
      case 'sendgrid':
        return await sendViaSendGrid(options, settings);
      case 'nodemailer':
        return await sendViaNodemailer(options, settings);
      default:
        return {
          success: false,
          error: `Unsupported provider: ${provider}`,
        };
    }
  } catch (error: any) {
    console.error(`❌ [Email] Error sending via ${provider}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      provider,
    };
  }
}

/**
 * Send email via Resend
 */
async function sendViaResend(options: EmailOptions, settings: EmailSettings): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  if (!apiKey) return { success: false, error: 'Resend API key missing', provider: 'resend' };

  const from = options.from || settings.senderEmail || process.env.EMAIL_FROM || 'noreply@example.com';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.body,
        reply_to: options.replyTo,
        attachments: options.attachments?.map(att => ({
          filename: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        })),
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      return { success: false, error: JSON.stringify(error), provider: 'resend' };
    }

    const data = await res.json();
    return { success: true, messageId: data.id, provider: 'resend' };
  } catch (error: any) {
    return { success: false, error: error.message, provider: 'resend' };
  }
}

/**
 * Send email via Brevo (Sendinblue)
 */
async function sendViaBrevo(options: EmailOptions, settings: EmailSettings): Promise<EmailResult> {
  // Prioritize settings API key, then env vars
  const apiKey = settings.brevoApiKey || process.env.BREVO_API_KEY || process.env.EMAIL_API_KEY;
  
  if (!apiKey) return { success: false, error: 'Brevo API key missing', provider: 'brevo' };

  const fromEmail = options.from || settings.senderEmail || process.env.EMAIL_FROM || 'noreply@example.com';
  const fromName = settings.senderName || fromEmail.split('@')[0];
  
  const sender = { email: fromEmail, name: fromName };

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender,
        to: (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({ email })),
        subject: options.subject,
        htmlContent: options.html || options.body,
        textContent: options.body,
        replyTo: options.replyTo ? { email: options.replyTo } : undefined,
        attachment: options.attachments?.map(att => ({
          name: att.filename,
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
        })),
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      return { success: false, error: JSON.stringify(error), provider: 'brevo' };
    }

    const data = await res.json();
    return { success: true, messageId: data.messageId, provider: 'brevo' };
  } catch (error: any) {
    return { success: false, error: error.message, provider: 'brevo' };
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(options: EmailOptions, settings: EmailSettings): Promise<EmailResult> {
  const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
  if (!apiKey) return { success: false, error: 'SendGrid API key missing', provider: 'sendgrid' };

  const from = options.from || settings.senderEmail || process.env.EMAIL_FROM || 'noreply@example.com';

  const payload: any = {
    personalizations: [
      {
        to: (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({ email })),
      },
    ],
    from: { email: from },
    subject: options.subject,
    content: [
      {
        type: 'text/plain',
        value: options.body,
      },
    ],
  };

  if (options.html) {
    payload.content.push({
      type: 'text/html',
      value: options.html,
    });
  }

  if (options.replyTo) {
    payload.reply_to = { email: options.replyTo };
  }

  if (options.attachments && options.attachments.length > 0) {
    payload.attachments = options.attachments.map(att => ({
      filename: att.filename,
      content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
      type: att.contentType || 'application/octet-stream',
    }));
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Email/SendGrid] API error ${response.status}:`, errorText);
      return {
        success: false,
        error: `SendGrid API error ${response.status}: ${errorText}`,
        provider: 'sendgrid',
      };
    }

    const messageId = response.headers.get('X-Message-Id') || 'unknown';
    return {
      success: true,
      messageId: messageId,
      provider: 'sendgrid',
    };
  } catch (error: any) {
    return {
      success: false,
      error: `SendGrid send error: ${error.message}`,
      provider: 'sendgrid',
    };
  }
}

/**
 * Send email via Nodemailer (SMTP)
 */
async function sendViaNodemailer(options: EmailOptions, settings: EmailSettings): Promise<EmailResult> {
  try {
    // Dynamically require nodemailer to avoid build errors if not installed
    const nodemailer = require('nodemailer');

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return {
        success: false,
        error: 'SMTP configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS required)',
        provider: 'nodemailer',
      };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const from = options.from || settings.senderEmail || process.env.EMAIL_FROM || 'noreply@example.com';

    const mailOptions: any = {
      from: from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.body,
    };

    if (options.html) mailOptions.html = options.html;
    if (options.replyTo) mailOptions.replyTo = options.replyTo;

    if (options.attachments && options.attachments.length > 0) {
      mailOptions.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [Email/Nodemailer] Email sent successfully. ID: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      provider: 'nodemailer',
    };
  } catch (error: any) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return {
        success: false,
        error: 'Nodemailer not installed. Run: npm install nodemailer',
        provider: 'nodemailer',
      };
    }
    
    console.error('❌ [Email/Nodemailer] Send error:', error.message);
    return {
      success: false,
      error: `Nodemailer send error: ${error.message}`,
      provider: 'nodemailer',
    };
  }
}

/**
 * Queue an email for later processing
 */
export async function queueEmail(
  to: string | string[],
  template: 'order_created' | 'order_delivered' | 'review_request' | 'manual_pending',
  data: Record<string, any>,
  delayMinutes: number = 0
): Promise<void> {
  const scheduledAt = new Date();
  scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);

  await adminDb.collection('mail_queue').add({
    to,
    template,
    data,
    status: 'pending',
    scheduledAt: scheduledAt,
    createdAt: new Date(),
    attempts: 0
  });
}

/**
 * Send templated email (convenience function)
 */
export async function sendTemplatedEmail(
  to: string | string[],
  template: 'order_created' | 'order_delivered' | 'review_request' | 'manual_pending',
  data: Record<string, any>
): Promise<EmailResult> {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Jambi Store';
  const siteUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  let subject: string;
  let body: string;
  let html: string;

  switch (template) {
    case 'order_created':
      subject = `✅ Order Confirmed - ${data.productName}`;
      body = `
Hello ${data.customerName || 'Customer'},

Thank you for your order!

Order ID: ${data.orderId}
Product: ${data.productName}
Amount: Rp ${data.amount?.toLocaleString('id-ID') || '0'}
Payment Method: ${data.paymentMethod || 'QRIS'}

To complete your payment, please follow the steps on the payment page.

Best regards,
${siteName}
      `.trim();
      html = `
        <h2>Order Confirmed</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Thank you for your order!</p>
        <ul>
          <li><strong>Order ID:</strong> ${data.orderId}</li>
          <li><strong>Product:</strong> ${data.productName}</li>
          <li><strong>Amount:</strong> Rp ${data.amount?.toLocaleString('id-ID') || '0'}</li>
          <li><strong>Payment Method:</strong> ${data.paymentMethod || 'QRIS'}</li>
        </ul>
        <p>To complete your payment, please follow the steps on the payment page.</p>
        <p>Best regards,<br>${siteName}</p>
      `;
      break;

    case 'order_delivered':
      subject = `✅ Your Order is Ready - ${data.productName}`;
      body = `
Hello ${data.customerName || 'Customer'},

Your order for ${data.productName} has been delivered!

Order ID: ${data.orderId}
Product: ${data.productName}

${data.content || 'Your product content is attached or available in your dashboard.'}

Need help? Contact us: ${siteUrl}/support

Best regards,
${siteName}
      `.trim();
      html = `
        <h2>Your Order is Ready!</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>Your order for <strong>${data.productName}</strong> has been delivered.</p>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <pre style="white-space: pre-wrap;">${data.content || 'Your product content is attached or available in your dashboard.'}</pre>
        </div>
        <p>Need help? <a href="${siteUrl}/support">Contact Support</a></p>
        <p>Best regards,<br>${siteName}</p>
      `;
      break;

    case 'review_request':
      subject = `⭐ How was your experience with ${data.productName}?`;
      body = `
Hello ${data.customerName || 'Customer'},

We hope you are enjoying ${data.productName}.

Would you mind taking a moment to leave a review? It helps us improve!

Review here: ${siteUrl}/products/${data.productSlug}

Best regards,
${siteName}
      `.trim();
      html = `
        <h2>How was your experience?</h2>
        <p>Hello ${data.customerName || 'Customer'},</p>
        <p>We hope you are enjoying <strong>${data.productName}</strong>.</p>
        <p>Would you mind taking a moment to leave a review? It helps us improve!</p>
        <p>
          <a href="${siteUrl}/products/${data.productSlug}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Leave a Review</a>
        </p>
        <p>Best regards,<br>${siteName}</p>
      `;
      break;

    case 'manual_pending':
      subject = `✅ Pembayaran Terkonfirmasi - ${data.productName}`;
      body = `
Halo ${data.customerName || 'Customer'},

Pembayaran Anda telah terkonfirmasi dan pesanan sedang diproses!

Order ID: ${data.orderId}
Produk: ${data.productName}
Status: Menunggu Verifikasi Admin

Tim kami akan segera memproses pesanan Anda. Anda akan menerima email lain setelah produk dikirimkan.

Terima kasih atas pembelian Anda!

Salam,
${siteName}
      `.trim();
      html = `
        <h2>Pembayaran Terkonfirmasi</h2>
        <p>Halo ${data.customerName || 'Customer'},</p>
        <p>Pembayaran Anda telah terkonfirmasi dan pesanan sedang diproses!</p>
        <ul>
          <li><strong>Order ID:</strong> ${data.orderId}</li>
          <li><strong>Produk:</strong> ${data.productName}</li>
          <li><strong>Status:</strong> Menunggu Verifikasi Admin</li>
        </ul>
        <p>Tim kami akan segera memproses pesanan Anda. Anda akan menerima email lain setelah produk dikirimkan.</p>
        <p>Terima kasih atas pembelian Anda!</p>
        <p>Salam,<br>${siteName}</p>
      `;
      break;

    default:
      throw new Error(`Unknown template: ${template}`);
  }

  return sendEmail({
    to,
    subject,
    body,
    html
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{
  configured: boolean;
  providers: string[];
  primary: string | null;
}> {
  const settings = await getStoredSettings();
  const providers: string[] = [];
  
  if (settings.brevoApiKey || process.env.BREVO_API_KEY) providers.push('brevo');
  if (process.env.RESEND_API_KEY) providers.push('resend');
  if (process.env.SENDGRID_API_KEY) providers.push('sendgrid');
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    providers.push('nodemailer');
  }
  
  const primary = process.env.EMAIL_PROVIDER || detectProvider(settings);
  
  return {
    configured: providers.length > 0,
    providers,
    primary,
  };
}