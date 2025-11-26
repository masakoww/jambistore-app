import { IPaymentProvider, PaymentRequest, PaymentResponse } from './payments/IPaymentProvider';
import { PakasirProvider } from './payments/PakasirProvider';
import { IpaymuProvider } from './payments/IpaymuProvider';
import { TokopayProvider } from './payments/TokopayProvider';
import { PayPalProvider } from './payments/PayPalProvider';

type GatewayType = 'pakasir' | 'ipaymu' | 'tokopay' | 'paypal';

/**
 * Payment Factory
 * Creates payment provider instances based on gateway type
 */
export class PaymentFactory {
  private static providers: Map<GatewayType, IPaymentProvider> = new Map([
    ['pakasir', new PakasirProvider()],
    ['ipaymu', new IpaymuProvider()],
    ['tokopay', new TokopayProvider()],
    ['paypal', new PayPalProvider()],
  ]);

  /**
   * Create a payment provider instance
   * @param gateway The payment gateway type
   * @returns Payment provider instance
   * @throws Error if gateway type is not supported
   */
  static create(gateway: string): IPaymentProvider {
    const normalizedGateway = gateway.toLowerCase() as GatewayType;
    
    const provider = this.providers.get(normalizedGateway);
    
    if (!provider) {
      throw new Error(`Unsupported payment gateway: ${gateway}. Supported gateways: ${Array.from(this.providers.keys()).join(', ')}`);
    }


    return provider;
  }

  /**
   * Get list of supported gateways
   */
  static getSupportedGateways(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a gateway is supported
   */
  static isSupported(gateway: string): boolean {
    return this.providers.has(gateway.toLowerCase() as GatewayType);
  }
}

/**
 * Create payment with automatic fallback to backup gateway
 * @param primary Primary gateway to try first
 * @param backup Backup gateway to try if primary fails (optional)
 * @param payload Payment request payload
 * @returns Payment response from successful gateway
 * @throws Error if both gateways fail or no backup provided
 */
export async function createWithFallback(
  primary: string,
  backup: string | undefined,
  payload: PaymentRequest
): Promise<PaymentResponse> {
  try {
    const main = PaymentFactory.create(primary);
    const result = await main.createPayment(payload);
    if (!result.success) {
      throw new Error(result.message || 'Payment creation failed');
    }
    return result;
  } catch (err: any) {
    console.warn(`⚠️ Primary gateway (${primary}) failed: ${err.message}`);
    if (!backup) throw err;
    
    console.log(`🔄 Retrying with backup gateway: ${backup}`);
    const secondary = PaymentFactory.create(backup);
    const result = await secondary.createPayment(payload);
    if (!result.success) {
      throw new Error(`Both ${primary} and ${backup} failed`);
    }
    return result;
  }
}
