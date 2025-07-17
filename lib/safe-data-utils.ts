/**
 * Safe Data Access Utilities
 * Provides safe methods for accessing potentially undefined or null data
 */

/**
 * Safely returns a string value with fallback
 * @param value - The potentially undefined/null string value
 * @param fallback - The fallback value to use if value is null/undefined
 * @returns Safe string value
 */
export const safeString = (value: string | null | undefined, fallback: string = ''): string => {
  return value ?? fallback;
};

/**
 * Safely extracts the first character of an email for avatar display
 * @param email - The potentially undefined/null email string
 * @returns First character of email in uppercase, or '?' if email is invalid
 */
export const safeEmailInitial = (email: string | null | undefined): string => {
  const safeEmail = safeString(email, '');
  if (safeEmail.length === 0) {
    return '?';
  }
  return safeEmail.charAt(0).toUpperCase();
};

/**
 * Safely formats an email for display with fallback
 * @param email - The potentially undefined/null email string
 * @returns Formatted email or fallback text
 */
export const formatSafeEmail = (email: string | null | undefined): string => {
  return safeString(email, 'Usuario desconocido');
};

/**
 * Safely formats a user's display name from email
 * @param email - The potentially undefined/null email string
 * @returns User display name or fallback
 */
export const getSafeDisplayName = (email: string | null | undefined): string => {
  const safeEmail = safeString(email, '');
  if (safeEmail.length === 0) {
    return 'Usuario desconocido';
  }
  
  // Extract username part before @ symbol
  const username = safeEmail.split('@')[0];
  return username || 'Usuario desconocido';
};

/**
 * Type guard to check if a value is a valid string
 * @param value - The value to check
 * @returns True if value is a non-empty string
 */
export const isValidString = (value: any): value is string => {
  return typeof value === 'string' && value.length > 0;
};

/**
 * Enhanced sale data interface with safe defaults
 */
export interface SafeRecentSale {
  id: string;
  total_amount: number;
  created_at: string;
  seller_email: string | null;
  seller_display_name?: string;
}

/**
 * Validates and sanitizes sale data to prevent runtime errors
 * @param sale - Raw sale data from API
 * @returns Validated and safe sale data
 */
export const validateSaleData = (sale: any): SafeRecentSale => {
  return {
    id: safeString(sale?.id, `sale-${Date.now()}`),
    total_amount: typeof sale?.total_amount === 'number' ? sale.total_amount : 0,
    created_at: safeString(sale?.created_at, new Date().toISOString()),
    seller_email: sale?.seller_email || null,
    seller_display_name: sale?.seller_display_name
  };
};