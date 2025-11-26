/**
 * Order Helper Functions
 * Utilities for order management, ID generation, and validation
 */

/**
 * Generate custom order ID in format: JMBYYYYMMDD<10_RANDOM_ALPHANUMERICS>
 * Example: JMB202411245A3B7C9D1E
 * 
 * @returns {string} Generated order ID
 */
export function generateOrderId(): string {
  const now = new Date();
  
  // Format date as YYYYMMDD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate 10 random alphanumeric characters (uppercase letters and numbers)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let randomStr = '';
  for (let i = 0; i < 10; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `JMB${dateStr}${randomStr}`;
}

/**
 * Validate order ID format
 * 
 * @param {string} orderId - The order ID to validate
 * @returns {boolean} True if valid format, false otherwise
 */
export function isValidOrderId(orderId: string): boolean {
  // JMB + 8 digit date + 10 alphanumeric = 21 characters total
  const regex = /^JMB\d{8}[A-Z0-9]{10}$/;
  return regex.test(orderId);
}

/**
 * Extract date from order ID
 * 
 * @param {string} orderId - The order ID
 * @returns {Date | null} Date object if valid, null otherwise
 */
export function extractDateFromOrderId(orderId: string): Date | null {
  if (!isValidOrderId(orderId)) {
    return null;
  }
  
  // Extract YYYYMMDD (positions 3-10)
  const dateStr = orderId.substring(3, 11);
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-indexed
  const day = parseInt(dateStr.substring(6, 8));
  
  return new Date(year, month, day);
}
