// Payment Gateway Settings Type
export type PaymentGateway = 'pakasir' | 'ipaymu' | 'tokopay';

export interface PaymentGatewaySettings {
  activeGateway: PaymentGateway;
  updatedAt: string;
  updatedBy: string; // admin email who made the change
}

export interface PaymentGatewayInfo {
  id: PaymentGateway;
  name: string;
  description: string;
  enabled: boolean;
}

export const PAYMENT_GATEWAYS: PaymentGatewayInfo[] = [
  {
    id: 'pakasir',
    name: 'Pakasir',
    description: 'Pakasir QRIS Payment Gateway',
    enabled: true,
  },
  {
    id: 'ipaymu',
    name: 'iPaymu',
    description: 'iPaymu Direct Payment Gateway',
    enabled: true,
  },
  {
    id: 'tokopay',
    name: 'Tokopay',
    description: 'Tokopay QRIS Payment Gateway',
    enabled: true,
  },
];

// Manual QRIS Settings
export interface ManualQRISSettings {
  qris1: {
    enabled: boolean;
    label: string;
    imageUrl: string; // Firebase Storage URL
    description?: string;
  };
  qris2: {
    enabled: boolean;
    label: string;
    imageUrl: string;
    description?: string;
  };
  discordWebhookUrl?: string; // Discord webhook for order notifications
  discordNotificationChannelId?: string; // Channel ID for bot notifications
}

// Email Template Settings
export interface EmailTemplateSettings {
  brevoApiKey?: string;
  senderEmail: string;
  senderName: string;
  headerImageUrl?: string; // Store logo/banner for email header
  footerText?: string; // Footer content (terms, support info)
  primaryColor?: string; // Brand color for email styling
}

