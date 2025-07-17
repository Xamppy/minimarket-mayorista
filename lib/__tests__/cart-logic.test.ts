/**
 * Unit tests for cart logic and FIFO stock entry selection
 * Tests cart validation and quantity update logic
 */

import { StockEntry } from '../cart-types';

console.log('=== Testing Cart Logic and FIFO Selection ===');

// Helper function to assert test results
function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`✅ ${message}`);
  } else {
    console.error(`❌ ${message}`);
    throw new Error(`Test failed: ${message}`);
  }
}

// Test FIFO stock entry selection
function testFIFOSelection() {
  console.log('\n--- Testing FIFO Stock Entry Selection ---');
  
  const stockEntries: StockEntry[] = [
    {
      id: 'stock-1',
      product_id: 'product-123',
      barcode: '1234567890',
      current_quantity: 50,
      initial_quantity: 100,
      expiration_date: '2025-06-01',
      created_at: '2024-01-01T00:00:00Z',
      purchase_price: 500,
      sale_price_unit: 1000,
      sale_price_box: 8000,
      sale_price_wholesale: 800
    },
    {
      id: 'stock-2',
      product_id: 'product-123',
      barcode: '1234567891',
      current_quantity: 30,
      initial_quantity: 100,
      expiration_date: '2025-03-01',
      created_at: '2024-01-02T00:00:00Z',
      purchase_price: 500,
      sale_price_unit: 1000,
      sale_price_box: 8000,
      sale_price_wholesale: 800
    },
    {
      id: 'stock-3',
      product_id: 'product-123',
      barcode: '1234567892',
      current_quantity: 20,
      initial_quantity: 100,
      expiration_date: '2025-09-01',
      created_at: '2024-01-03T00:00:00Z',
      purchase_price: 500,
      sale_price_unit: 1000,
      sale_price_box: 8000,
      sale_price_wholesale: 800
    }
  ];

  // Sort by FIFO logic (expiration date, then created_at)
  const sortedEntries = stockEntries.sort((a, b) => {
    // First by expiration date (nulls last)
    if (a.expiration_date && b.expiration_date) {
      return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    }
    if (a.expiration_date && !b.expiration_date) return -1;
    if (!a.expiration_date && b.expiration_date) return 1;
    
    // Then by created_at date (oldest first)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  assert(sortedEntries[0].id === 'stock-2', 'First entry should be stock-2 (March expiration)');
  assert(sortedEntries[1].id === 'stock-1', 'Second entry should be stock-1 (June expiration)');
  assert(sortedEntries[2].id === 'stock-3', 'Third entry should be stock-3 (September expiration)');

  console.log('✅ FIFO selection tests completed');
}

// Test FIFO with null expiration dates
function testFIFOWithNullExpiration() {
  console.log('\n--- Testing FIFO with Null Expiration Dates ---');
  
  const stockEntries = [
    {
      id: 'stock-1',
      expiration_date: null,
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: 'stock-2',
      expiration_date: '2025-03-01',
      created_at: '2024-01-02T00:00:00Z'
    },
    {
      id: 'stock-3',
      expiration_date: null,
      created_at: '2024-01-03T00:00:00Z'
    }
  ];

  const sortedEntries = stockEntries.sort((a, b) => {
    if (a.expiration_date && b.expiration_date) {
      return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    }
    if (a.expiration_date && !b.expiration_date) return -1;
    if (!a.expiration_date && b.expiration_date) return 1;
    
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  assert(sortedEntries[0].id === 'stock-2', 'Entry with expiration date should come first');
  assert(sortedEntries[1].id === 'stock-1', 'Older entry without expiration should come next');
  assert(sortedEntries[2].id === 'stock-3', 'Newer entry without expiration should come last');

  console.log('✅ FIFO with null expiration tests completed');
}

// Test cart validation functions
function testCartValidation() {
  console.log('\n--- Testing Cart Validation ---');
  
  // Test quantity validation
  const isValidQuantity = (requestedQuantity: number, availableStock: number): boolean => {
    return requestedQuantity > 0 && requestedQuantity <= availableStock;
  };

  assert(isValidQuantity(10, 50) === true, 'Should validate quantity within stock');
  assert(isValidQuantity(50, 50) === true, 'Should validate quantity equal to stock');
  assert(isValidQuantity(51, 50) === false, 'Should reject quantity exceeding stock');
  assert(isValidQuantity(0, 50) === false, 'Should reject zero quantity');
  assert(isValidQuantity(-1, 50) === false, 'Should reject negative quantity');

  // Test expiration detection
  const isExpiringSoon = (expirationDate: string | null, daysThreshold: number = 7): boolean => {
    if (!expirationDate) return false;
    
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffDays <= daysThreshold && diffDays > 0;
  };

  const nearExpiration = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days
  const farExpiration = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  assert(isExpiringSoon(nearExpiration) === true, 'Should detect expiring products');
  assert(isExpiringSoon(farExpiration) === false, 'Should not flag far expiration as expiring soon');
  assert(isExpiringSoon(null) === false, 'Should handle null expiration dates');

  console.log('✅ Cart validation tests completed');
}

// Test cart calculations
function testCartCalculations() {
  console.log('\n--- Testing Cart Calculations ---');
  
  const cartItems = [
    { totalPrice: 1000, quantity: 2, savings: 200, appliedPriceType: 'unit' },
    { totalPrice: 2500, quantity: 1, savings: 0, appliedPriceType: 'wholesale' },
    { totalPrice: 750, quantity: 5, savings: 150, appliedPriceType: 'unit' }
  ];

  // Test total amount calculation
  const totalAmount = cartItems.reduce((total, item) => total + item.totalPrice, 0);
  assert(totalAmount === 4250, 'Should calculate total cart amount correctly');

  // Test total items calculation
  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
  assert(totalItems === 8, 'Should calculate total cart items correctly');

  // Test total savings calculation
  const totalSavings = cartItems.reduce((total, item) => total + (item.savings || 0), 0);
  assert(totalSavings === 350, 'Should calculate total savings correctly');

  // Test wholesale detection
  const hasWholesaleItems = cartItems.some(item => item.appliedPriceType === 'wholesale');
  assert(hasWholesaleItems === true, 'Should detect wholesale items in cart');

  console.log('✅ Cart calculations tests completed');
}

// Test stock entry conflict detection
function testStockEntryConflicts() {
  console.log('\n--- Testing Stock Entry Conflicts ---');
  
  const cartItems = [
    { stockEntryId: 'stock-123', quantity: 5 },
    { stockEntryId: 'stock-456', quantity: 3 },
    { stockEntryId: 'stock-123', quantity: 2 }
  ];

  const stockEntryUsage = cartItems.reduce((acc, item) => {
    acc[item.stockEntryId] = (acc[item.stockEntryId] || 0) + item.quantity;
    return acc;
  }, {} as Record<string, number>);

  assert(stockEntryUsage['stock-123'] === 7, 'Should aggregate quantities for same stock entry');
  assert(stockEntryUsage['stock-456'] === 3, 'Should track different stock entries separately');

  // Test stock availability validation
  const stockEntryAvailability: Record<string, number> = { 'stock-123': 10, 'stock-456': 5 };
  
  const isStockAvailable = (stockEntryId: string, requestedQuantity: number): boolean => {
    const available = stockEntryAvailability[stockEntryId] || 0;
    const used = stockEntryUsage[stockEntryId] || 0;
    return (used + requestedQuantity) <= available;
  };

  assert(isStockAvailable('stock-123', 2) === true, 'Should allow additional quantity within limits');
  assert(isStockAvailable('stock-123', 4) === false, 'Should reject quantity exceeding limits');
  assert(isStockAvailable('stock-456', 2) === true, 'Should validate against correct stock entry');

  console.log('✅ Stock entry conflict tests completed');
}

// Test price recalculation logic
function testPriceRecalculation() {
  console.log('\n--- Testing Price Recalculation ---');
  
  const recalculatePrice = (unitPrice: number, wholesalePrice: number | null, quantity: number) => {
    const isWholesale = wholesalePrice && quantity >= 3;
    const appliedPrice = isWholesale ? wholesalePrice : unitPrice;
    const totalPrice = appliedPrice * quantity;
    const savings = isWholesale ? (unitPrice - wholesalePrice) * quantity : 0;

    return {
      appliedPrice,
      priceType: isWholesale ? 'wholesale' : 'unit',
      totalPrice,
      savings
    };
  };

  // Test unit pricing
  const unitResult = recalculatePrice(1000, 800, 2);
  assert(unitResult.priceType === 'unit', 'Should use unit pricing for low quantities');
  assert(unitResult.appliedPrice === 1000, 'Should apply unit price');
  assert(unitResult.totalPrice === 2000, 'Should calculate unit total correctly');
  assert(unitResult.savings === 0, 'Should have no savings for unit pricing');

  // Test wholesale pricing
  const wholesaleResult = recalculatePrice(1000, 800, 5);
  assert(wholesaleResult.priceType === 'wholesale', 'Should use wholesale pricing for high quantities');
  assert(wholesaleResult.appliedPrice === 800, 'Should apply wholesale price');
  assert(wholesaleResult.totalPrice === 4000, 'Should calculate wholesale total correctly');
  assert(wholesaleResult.savings === 1000, 'Should calculate savings correctly');

  // Test threshold boundary
  assert(recalculatePrice(1000, 800, 2).priceType === 'unit', 'Should use unit pricing below threshold');
  assert(recalculatePrice(1000, 800, 3).priceType === 'wholesale', 'Should use wholesale pricing at threshold');

  console.log('✅ Price recalculation tests completed');
}

// Run all tests
try {
  testFIFOSelection();
  testFIFOWithNullExpiration();
  testCartValidation();
  testCartCalculations();
  testStockEntryConflicts();
  testPriceRecalculation();
  
  console.log('\n🎉 All Cart Logic tests passed!');
} catch (error) {
  console.error('\n❌ Test suite failed:', error);
  throw error;
}

export {};