/**
 * Unit tests for unified pricing service
 * Tests wholesale pricing calculation accuracy across different scenarios
 */

import { 
  calculateUnifiedPricing, 
  getWholesalePricingInfo, 
  validateQuantity 
} from '../unified-pricing-service';
import { StockEntry } from '../cart-types';

console.log('=== Testing Unified Pricing Service ===');

// Test data
const mockStockEntry: StockEntry = {
  id: 'test-123',
  product_id: 'product-456',
  barcode: '1234567890',
  current_quantity: 100,
  initial_quantity: 100,
  expiration_date: '2025-12-31',
  created_at: '2024-01-01T00:00:00Z',
  purchase_price: 500,
  sale_price_unit: 1000,
  sale_price_box: 8000,
  sale_price_wholesale: 800
};

// Helper function to assert test results
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ ${message}`);
  } else {
    console.error(`❌ ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
}

// Test calculateUnifiedPricing function
function testCalculateUnifiedPricing() {
  console.log('\n--- Testing calculateUnifiedPricing ---');
  
  // Test unit pricing for quantities below wholesale threshold
  const unitResult = calculateUnifiedPricing(mockStockEntry, 2, 'unitario');
  assert(unitResult.appliedPrice === 1000, 'Unit pricing - applied price should be 1000');
  assert(unitResult.priceType === 'unit', 'Unit pricing - price type should be unit');
  assert(unitResult.totalPrice === 2000, 'Unit pricing - total price should be 2000');
  assert(unitResult.savings === 0, 'Unit pricing - savings should be 0');

  // Test wholesale pricing for quantities at threshold
  const wholesaleResult = calculateUnifiedPricing(mockStockEntry, 3, 'unitario');
  assert(wholesaleResult.appliedPrice === 800, 'Wholesale pricing - applied price should be 800');
  assert(wholesaleResult.priceType === 'wholesale', 'Wholesale pricing - price type should be wholesale');
  assert(wholesaleResult.totalPrice === 2400, 'Wholesale pricing - total price should be 2400');
  assert(wholesaleResult.savings === 600, 'Wholesale pricing - savings should be 600');

  // Test box pricing format
  const boxResult = calculateUnifiedPricing(mockStockEntry, 1, 'caja');
  assert(boxResult.appliedPrice === 8000, 'Box pricing - applied price should be 8000');
  assert(boxResult.priceType === 'unit', 'Box pricing - price type should be unit (box is treated as unit)');
  assert(boxResult.totalPrice === 8000, 'Box pricing - total price should be 8000');

  // Test stock entry without wholesale pricing
  const stockEntryNoWholesale = { ...mockStockEntry, sale_price_wholesale: null };
  const noWholesaleResult = calculateUnifiedPricing(stockEntryNoWholesale, 5, 'unitario');
  assert(noWholesaleResult.appliedPrice === 1000, 'No wholesale - applied price should be unit price');
  assert(noWholesaleResult.priceType === 'unit', 'No wholesale - price type should be unit');
  assert(noWholesaleResult.savings === 0, 'No wholesale - savings should be 0');

  console.log('✅ calculateUnifiedPricing tests completed');
}

// Test getWholesalePricingInfo function
function testGetWholesalePricingInfo() {
  console.log('\n--- Testing getWholesalePricingInfo ---');
  
  // Test with wholesale pricing available
  const wholesaleInfo = getWholesalePricingInfo(mockStockEntry);
  assert(wholesaleInfo.hasWholesalePrice === true, 'Should detect wholesale price availability');
  assert(wholesaleInfo.wholesalePrice === 800, 'Should return correct wholesale price');
  assert(wholesaleInfo.threshold === 3, 'Should return correct threshold');
  assert(wholesaleInfo.potentialSavings === 200, 'Should calculate potential savings correctly');

  // Test without wholesale pricing
  const stockEntryNoWholesale = { ...mockStockEntry, sale_price_wholesale: null };
  const noWholesaleInfo = getWholesalePricingInfo(stockEntryNoWholesale);
  assert(noWholesaleInfo.hasWholesalePrice === false, 'Should detect no wholesale price');
  assert(noWholesaleInfo.wholesalePrice === undefined, 'Should return undefined wholesale price');
  assert(noWholesaleInfo.potentialSavings === undefined, 'Should return undefined potential savings');

  console.log('✅ getWholesalePricingInfo tests completed');
}

// Test validateQuantity function
function testValidateQuantity() {
  console.log('\n--- Testing validateQuantity ---');
  
  // Test valid quantity within stock limits
  const validResult = validateQuantity(mockStockEntry, 50);
  assert(validResult.isValid === true, 'Should validate quantity within stock limits');
  assert(validResult.maxQuantity === 100, 'Should return correct max quantity');
  assert(validResult.errors.length === 0, 'Should have no errors for valid quantity');

  // Test quantity exceeding stock
  const excessResult = validateQuantity(mockStockEntry, 150);
  assert(excessResult.isValid === false, 'Should reject quantity exceeding stock');
  assert(excessResult.errors.length > 0, 'Should have errors for excess quantity');

  // Test zero quantity
  const zeroResult = validateQuantity(mockStockEntry, 0);
  assert(zeroResult.isValid === false, 'Should reject zero quantity');
  assert(zeroResult.errors.some(e => e.includes('mayor a 0')), 'Should have error for zero quantity');

  // Test expiring product warning
  const expiringStockEntry = {
    ...mockStockEntry,
    expiration_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
  };
  const expiringResult = validateQuantity(expiringStockEntry, 10);
  assert(expiringResult.isValid === true, 'Should validate expiring product');
  assert(expiringResult.warnings.length > 0, 'Should have warnings for expiring product');

  // Test expired product
  const expiredStockEntry = {
    ...mockStockEntry,
    expiration_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  };
  const expiredResult = validateQuantity(expiredStockEntry, 10);
  assert(expiredResult.isValid === false, 'Should reject expired product');
  assert(expiredResult.errors.some(e => e.includes('vencido')), 'Should have error for expired product');

  console.log('✅ validateQuantity tests completed');
}

// Test edge cases
function testEdgeCases() {
  console.log('\n--- Testing Edge Cases ---');
  
  // Test very large quantities
  const largeResult = calculateUnifiedPricing(mockStockEntry, 1000000, 'unitario');
  assert(largeResult.priceType === 'wholesale', 'Should apply wholesale pricing for large quantities');
  assert(typeof largeResult.totalPrice === 'number', 'Should handle large calculations');
  assert(largeResult.totalPrice === 800000000, 'Should calculate large totals correctly');

  // Test pricing consistency
  const quantity = 5;
  const consistencyResult = calculateUnifiedPricing(mockStockEntry, quantity, 'unitario');
  const expectedSavings = (mockStockEntry.sale_price_unit - mockStockEntry.sale_price_wholesale!) * quantity;
  assert(consistencyResult.savings === expectedSavings, 'Savings should be calculated correctly');
  assert(consistencyResult.totalPrice === consistencyResult.appliedPrice * quantity, 'Total should equal applied price times quantity');

  console.log('✅ Edge cases tests completed');
}

// Run all tests
try {
  testCalculateUnifiedPricing();
  testGetWholesalePricingInfo();
  testValidateQuantity();
  testEdgeCases();
  
  console.log('\n🎉 All Unified Pricing Service tests passed!');
} catch (error) {
  console.error('\n❌ Test suite failed:', error);
  throw error;
}

export {};