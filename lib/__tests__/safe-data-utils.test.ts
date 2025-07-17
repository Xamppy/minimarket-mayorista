import { 
  safeString, 
  safeEmailInitial, 
  formatSafeEmail, 
  getSafeDisplayName,
  isValidString,
  validateSaleData 
} from '../safe-data-utils';

describe('Safe Data Utils', () => {
  describe('safeString', () => {
    it('should return the value when it is a valid string', () => {
      expect(safeString('hello')).toBe('hello');
      expect(safeString('test@example.com')).toBe('test@example.com');
    });

    it('should return fallback when value is null or undefined', () => {
      expect(safeString(null)).toBe('');
      expect(safeString(undefined)).toBe('');
      expect(safeString(null, 'fallback')).toBe('fallback');
      expect(safeString(undefined, 'default')).toBe('default');
    });

    it('should return empty string as default fallback', () => {
      expect(safeString(null)).toBe('');
      expect(safeString(undefined)).toBe('');
    });
  });

  describe('safeEmailInitial', () => {
    it('should return first character uppercase for valid emails', () => {
      expect(safeEmailInitial('john@example.com')).toBe('J');
      expect(safeEmailInitial('admin@test.com')).toBe('A');
      expect(safeEmailInitial('f.orellanalvarez@gmail.com')).toBe('F');
    });

    it('should return "?" for null, undefined, or empty strings', () => {
      expect(safeEmailInitial(null)).toBe('?');
      expect(safeEmailInitial(undefined)).toBe('?');
      expect(safeEmailInitial('')).toBe('?');
    });

    it('should handle single character strings', () => {
      expect(safeEmailInitial('a')).toBe('A');
      expect(safeEmailInitial('Z')).toBe('Z');
    });
  });

  describe('formatSafeEmail', () => {
    it('should return the email when it is valid', () => {
      expect(formatSafeEmail('user@example.com')).toBe('user@example.com');
      expect(formatSafeEmail('test@domain.org')).toBe('test@domain.org');
    });

    it('should return fallback text for null or undefined', () => {
      expect(formatSafeEmail(null)).toBe('Usuario desconocido');
      expect(formatSafeEmail(undefined)).toBe('Usuario desconocido');
      expect(formatSafeEmail('')).toBe('Usuario desconocido');
    });
  });

  describe('getSafeDisplayName', () => {
    it('should extract username from valid emails', () => {
      expect(getSafeDisplayName('john@example.com')).toBe('john');
      expect(getSafeDisplayName('admin@test.com')).toBe('admin');
      expect(getSafeDisplayName('f.orellanalvarez@gmail.com')).toBe('f.orellanalvarez');
    });

    it('should return fallback for invalid emails', () => {
      expect(getSafeDisplayName(null)).toBe('Usuario desconocido');
      expect(getSafeDisplayName(undefined)).toBe('Usuario desconocido');
      expect(getSafeDisplayName('')).toBe('Usuario desconocido');
    });

    it('should handle emails without @ symbol', () => {
      expect(getSafeDisplayName('invalidEmail')).toBe('Usuario desconocido');
    });
  });

  describe('isValidString', () => {
    it('should return true for valid non-empty strings', () => {
      expect(isValidString('hello')).toBe(true);
      expect(isValidString('test@example.com')).toBe(true);
      expect(isValidString('123')).toBe(true);
    });

    it('should return false for null, undefined, or empty strings', () => {
      expect(isValidString(null)).toBe(false);
      expect(isValidString(undefined)).toBe(false);
      expect(isValidString('')).toBe(false);
    });

    it('should return false for non-string types', () => {
      expect(isValidString(123)).toBe(false);
      expect(isValidString({})).toBe(false);
      expect(isValidString([])).toBe(false);
      expect(isValidString(true)).toBe(false);
    });
  });

  describe('validateSaleData', () => {
    it('should validate and sanitize complete sale data', () => {
      const mockSale = {
        id: 'sale-123',
        total_amount: 1500,
        created_at: '2024-01-15T10:30:00Z',
        seller_email: 'seller@example.com',
        seller_display_name: 'John Seller'
      };

      const result = validateSaleData(mockSale);

      expect(result).toEqual({
        id: 'sale-123',
        total_amount: 1500,
        created_at: '2024-01-15T10:30:00Z',
        seller_email: 'seller@example.com',
        seller_display_name: 'John Seller'
      });
    });

    it('should handle missing or invalid data with safe defaults', () => {
      const mockSale = {
        // Missing id
        total_amount: 'invalid', // Invalid type
        // Missing created_at
        seller_email: null,
        // Missing seller_display_name
      };

      const result = validateSaleData(mockSale);

      expect(result.id).toMatch(/^sale-\d+$/); // Should generate timestamp-based ID
      expect(result.total_amount).toBe(0); // Should default to 0
      expect(result.created_at).toBeDefined(); // Should have current timestamp
      expect(result.seller_email).toBe(null);
      expect(result.seller_display_name).toBeUndefined();
    });

    it('should handle completely empty/null input', () => {
      const result = validateSaleData(null);

      expect(result.id).toMatch(/^sale-\d+$/);
      expect(result.total_amount).toBe(0);
      expect(result.created_at).toBeDefined();
      expect(result.seller_email).toBe(null);
      expect(result.seller_display_name).toBeUndefined();
    });

    it('should preserve valid total_amount as number', () => {
      const mockSale = {
        id: 'test-sale',
        total_amount: 2500.50,
        created_at: '2024-01-15T10:30:00Z',
        seller_email: 'test@example.com'
      };

      const result = validateSaleData(mockSale);
      expect(result.total_amount).toBe(2500.50);
      expect(typeof result.total_amount).toBe('number');
    });
  });
});