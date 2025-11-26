/**
 * Plan interface for product pricing tiers
 */
export interface Plan {
  /** Unique identifier for the plan */
  id: string;
  /** Display name of the plan */
  name: string;
  /** Formatted price string (e.g., "Rp 50.000") - DEPRECATED: Use price object */
  priceString: string;
  /** Numeric price value for calculations - DEPRECATED: Use price object */
  priceNumber: number;
  /** Currency-specific pricing */
  price?: {
    IDR: number;
    USD: number;
  };
  /** Currency code (e.g., "IDR", "USD") */
  currency?: string;
  /** Billing period (e.g., "monthly", "lifetime", "1 day") */
  period?: string;
  /** Whether this plan is marked as popular/recommended */
  popular?: boolean;
}

/**
 * Feature interface for product features and benefits
 */
export interface Feature {
  /** Unique identifier for the feature */
  id: string;
  /** Feature title/heading */
  title: string;
  /** Optional feature description */
  description?: string;
  /** List of feature items/benefits */
  items: string[];
}

/**
 * System requirement interface for product compatibility info
 */
export interface SystemRequirement {
  /** Icon identifier or emoji */
  icon: string;
  /** Requirement label (e.g., "OS", "RAM", "GPU") */
  label: string;
  /** Optional detailed description */
  description?: string;
}

/**
 * Product interface for game cheats/tools
 */
export interface Product {
  /** Optional Firestore document ID */
  id?: string;
  /** URL-friendly slug, pattern: ^[a-z0-9-]+$ */
  slug: string;
  /** Product title/name */
  title: string;
  /** Short subtitle or tagline */
  subtitle?: string;
  /** Full product description (markdown or HTML) - DEPRECATED: Use descriptionLocalized object */
  description?: string;
  /** Multi-language description */
  descriptionLocalized?: {
    id: string; // Indonesian
    en: string; // English
  };
  /** Currency-specific pricing (overrides plan prices) */
  price?: {
    IDR: number;
    USD: number;
  };
  /** 
   * Payment gateway configuration
   * - Legacy format: 'ipaymu' | 'pakasir' | 'tokopay' (applies to IDR only)
   * - New format: { IDR?: '...', USD?: '...' } (currency-specific gateways)
   */
  gateway?: 
    | 'ipaymu' 
    | 'pakasir' 
    | 'tokopay' 
    | {
        IDR?: 'ipaymu' | 'pakasir' | 'tokopay';
        USD?: 'paypal' | 'stripe';
      };
  /** Hero section image URL */
  heroImageUrl?: string;
  /** Hero section animated GIF URL */
  heroGifUrl?: string;
  /** System requirements list */
  systemRequirements?: SystemRequirement[];
  /** Available pricing plans (required, at least one) */
  plans: Plan[];
  /** Product features and benefits */
  features?: Feature[];
  /** Product flags */
  flags?: {
    /** Whether product is currently being updated */
    isUpdating?: boolean;
    /** Whether product is publicly visible */
    isPublic?: boolean;
  };
  /** Metadata timestamps and versioning */
  meta?: {
    /** Creation timestamp */
    createdAt?: any;
    /** Last update timestamp */
    updatedAt?: any;
    /** Version number for tracking changes */
    version?: number;
  };
  /** Product status */
  status?: 'ACTIVE' | 'INACTIVE';
  /** Product category (e.g., "fivem", "freefire", "fortnite") */
  category?: string;
  /** Optional category document ID and display name for admin filtering */
  categoryId?: string;
  categoryName?: string;
  /** Available stock quantity */
  stock?: number;
  /** Capital cost (for admin profit calculation only) */
  capitalCost?: number;
  /** Delivery configuration */
  delivery?: {
    /** Delivery type: 'preloaded', 'api', or 'manual' */
    type: 'preloaded' | 'api' | 'manual';
    /** For preloaded delivery: Array of stock items (codes/keys) - DEPRECATED: Use /stock/{slug}/items collection */
    stockItems?: string[];
    /** Instructions for customer (shown after purchase) */
    instructions?: string;
    /** API delivery configuration */
    apiConfig?: {
      endpoint: string;
      method?: string;
      apiKey?: string;
      headers?: Record<string, string>;
      payloadTemplate?: Record<string, any>;
      retryAttempts?: number;
      retryDelay?: number;
    };
  };
  /** Backup payment gateway if primary fails (legacy IDR only) */
  backupGateway?: 'ipaymu' | 'pakasir' | 'tokopay';
  /** Estimated delivery time (e.g., "10 Minutes") */
  estimation?: string;
}
