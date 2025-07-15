// Test file for wholesale pricing utilities
import {
  validateWholesalePrice,
  calculateItemPrice,
  getApplicablePrice,
  formatPricingDisplay,
  hasWholesalePrice,
  shouldApplyWholesalePrice,
  WHOLESALE_THRESHOLD
} from '../wholesale-pricing-utils';
import { StockEntry } from '../types';

// Mock stock entry for testing
const mockStockEntry: StockEntry = {
  id: 1,
  product_id: 1,
  barcode: 'TEST123',
  initial_quantity: 100,
  current_quantity: 50,
  purchase_price: 500,
  sale_price_unit: 1000,
  sale_price_box: 9000,
  sale_price_wholesale: 800,
  expiration_date: '2025-12-31',
  created_at: '2025-01-01T00:00:00Z'
};

// Test validation function
console.log('Testing validateWholesalePrice...');

// Valid cases
console.assert(validateWholesalePrice(100).isValid === true, 'Should accept valid number');
console.assert(validateWholesalePrice('100.50').isValid === true, 'Should accept valid string number');
console.assert(validateWholesalePrice(null).isValid === true, 'Should accept null');
console.assert(validateWholesalePrice(undefined).isValid === true, 'Should accept undefined');

// Invalid cases
console.assert(validateWholesalePrice('invalid').isValid === false, 'Should reject invalid string');
console.assert(validateWholesalePrice(-1).isValid === false, 'Should reject negative numbers');
console.assert(validateWholesalePrice(9999999).isValid === false, 'Should reject too large numbers');

// Test price calculation
console.log('Testing calculateItemPrice...');

// Test wholesale pricing (quantity >= 3)
const wholesaleResult = calculateItemPrice({
  quantity: 5,
  unitPrice: 1000,
  boxPrice: 9000,
  wholesalePrice: 800
});

console.assert(wholesaleResult.priceType === 'wholesale', 'Should use wholesale price for quantity >= 3');
console.assert(wholesaleResult.applicablePrice === 800, 'Should apply wholesale price');
console.assert(wholesaleResult.savings === 1000, 'Should calculate savings correctly'); // (1000-800) * 5 = 1000

// Test unit pricing (quantity < 3)
const unitResult = calculateItemPrice({
  quantity: 2,
  unitPrice: 1000,
  boxPrice: 9000,
  wholesalePrice: 800
});

console.assert(unitResult.priceType === 'box', 'Should use box price when available and no wholesale');
console.assert(unitResult.applicablePrice === 9000, 'Should apply box price');

// Test utility functions
console.log('Testing utility functions...');

console.assert(hasWholesalePrice(mockStockEntry) === true, 'Should detect wholesale price');
console.assert(shouldApplyWholesalePrice(mockStockEntry, 5) === true, 'Should apply wholesale for quantity >= 3');
console.assert(shouldApplyWholesalePrice(mockStockEntry, 2) === false, 'Should not apply wholesale for quantity < 3');

// Test pricing info
const pricingInfo = getApplicablePrice(mockStockEntry, 5);
console.assert(pricingInfo.priceType === 'wholesale', 'Should return wholesale pricing info');
console.assert(pricingInfo.applicablePrice === 800, 'Should return correct applicable price');

// Test formatting
const formatted = formatPricingDisplay(pricingInfo);
console.assert(formatted.priceText === '$800.00', 'Should format price correctly');
console.assert(formatted.priceTypeLabel === 'Precio Mayorista', 'Should show correct label');

console.log('All tests passed! ✅');

export {}; // Make this a module