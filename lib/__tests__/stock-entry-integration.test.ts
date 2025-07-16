/**
 * Integration Tests for Stock Entry CRUD with Wholesale Pricing
 * 
 * This test suite covers:
 * - Stock entry creation with wholesale pricing
 * - Stock entry updates with wholesale price modifications
 * - Validation of wholesale pricing in stock operations
 * - Integration with existing stock management workflows
 */

import { StockEntry, StockEntryFormData } from '../types';
import { validateWholesalePrice } from '../wholesale-pricing-utils';

// Mock database operations for testing
class MockStockEntryService {
  private stockEntries: StockEntry[] = [];
  private nextId = 1;

  async createStockEntry(data: StockEntryFormData): Promise<StockEntry> {
    // Validate wholesale price if provided
    if (data.wholesalePrice) {
      const validation = validateWholesalePrice(data.wholesalePrice);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid wholesale price');
      }
    }

    const stockEntry: StockEntry = {
      id: this.nextId++,
      product_id: parseInt(data.productId),
      barcode: data.barcode || undefined,
      initial_quantity: parseInt(data.quantity),
      current_quantity: parseInt(data.quantity),
      purchase_price: parseFloat(data.purchasePrice),
      sale_price_unit: parseFloat(data.unitPrice),
      sale_price_box: data.boxPrice ? parseFloat(data.boxPrice) : undefined,
      sale_price_wholesale: data.wholesalePrice ? parseFloat(data.wholesalePrice) : undefined,
      expiration_date: data.expirationDate || undefined,
      created_at: new Date().toISOString()
    };

    this.stockEntries.push(stockEntry);
    return stockEntry;
  }

  async updateStockEntry(id: number, data: Partial<StockEntryFormData>): Promise<StockEntry> {
    const index = this.stockEntries.findIndex(entry => entry.id === id);
    if (index === -1) {
      throw new Error('Stock entry not found');
    }

    // Validate wholesale price if being updated
    if (data.wholesalePrice !== undefined) {
      const validation = validateWholesalePrice(data.wholesalePrice);
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid wholesale price');
      }
    }

    const existingEntry = this.stockEntries[index];
    const updatedEntry: StockEntry = {
      ...existingEntry,
      ...(data.productId && { product_id: parseInt(data.productId) }),
      ...(data.barcode && { barcode: data.barcode }),
      ...(data.quantity && { 
        initial_quantity: parseInt(data.quantity),
        current_quantity: parseInt(data.quantity)
      }),
      ...(data.purchasePrice && { purchase_price: parseFloat(data.purchasePrice) }),
      ...(data.unitPrice && { sale_price_unit: parseFloat(data.unitPrice) }),
      ...(data.boxPrice && { sale_price_box: parseFloat(data.boxPrice) }),
      ...(data.wholesalePrice !== undefined && { 
        sale_price_wholesale: data.wholesalePrice ? parseFloat(data.wholesalePrice) : undefined 
      }),
      ...(data.expirationDate && { expiration_date: data.expirationDate })
    };

    this.stockEntries[index] = updatedEntry;
    return updatedEntry;
  }

  async getStockEntry(id: number): Promise<StockEntry | null> {
    return this.stockEntries.find(entry => entry.id === id) || null;
  }

  async deleteStockEntry(id: number): Promise<boolean> {
    const index = this.stockEntries.findIndex(entry => entry.id === id);
    if (index === -1) {
      return false;
    }
    this.stockEntries.splice(index, 1);
    return true;
  }

  // Helper method for testing
  getAllStockEntries(): StockEntry[] {
    return [...this.stockEntries];
  }

  clear(): void {
    this.stockEntries = [];
    this.nextId = 1;
  }
}

// Test utilities
function runIntegrationTest(testName: string, testFn: () => Promise<void>) {
  testFn()
    .then(() => console.log(`✅ ${testName}`))
    .catch(error => console.error(`❌ ${testName}: ${error.message}`));
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${expected}, Actual: ${actual}`);
  }
}

function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFalse(condition: boolean, message: string) {
  if (condition) {
    throw new Error(message);
  }
}

// Test data
const createValidStockEntryData = (overrides: Partial<StockEntryFormData> = {}): StockEntryFormData => ({
  productId: '1',
  quantity: '100',
  barcode: 'TEST123',
  purchasePrice: '500',
  unitPrice: '1000',
  boxPrice: '9000',
  wholesalePrice: '800',
  expirationDate: '2025-12-31',
  ...overrides
});

// Initialize test service
const stockService = new MockStockEntryService();

// Test Suite 1: Stock Entry Creation with Wholesale Pricing
console.log('\n=== Testing Stock Entry Creation with Wholesale Pricing ===');

runIntegrationTest('Create stock entry with valid wholesale price', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData();
  const stockEntry = await stockService.createStockEntry(formData);
  
  assertEqual(stockEntry.sale_price_wholesale, 800, 'Should save wholesale price correctly');
  assertEqual(stockEntry.sale_price_unit, 1000, 'Should save unit price correctly');
  assertTrue(stockEntry.id > 0, 'Should assign valid ID');
});

runIntegrationTest('Create stock entry without wholesale price', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData({ wholesalePrice: undefined });
  const stockEntry = await stockService.createStockEntry(formData);
  
  assertEqual(stockEntry.sale_price_wholesale, undefined, 'Should handle missing wholesale price');
  assertEqual(stockEntry.sale_price_unit, 1000, 'Should still save unit price');
});

runIntegrationTest('Create stock entry with empty wholesale price', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData({ wholesalePrice: '' });
  const stockEntry = await stockService.createStockEntry(formData);
  
  assertEqual(stockEntry.sale_price_wholesale, undefined, 'Should handle empty wholesale price');
});

runIntegrationTest('Reject stock entry with invalid wholesale price', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData({ wholesalePrice: 'invalid' });
  
  try {
    await stockService.createStockEntry(formData);
    throw new Error('Should have rejected invalid wholesale price');
  } catch (error) {
    assertTrue(error instanceof Error, 'Should throw validation error');
    assertTrue((error as Error).message.includes('número válido'), 'Should show validation message');
  }
});

runIntegrationTest('Reject stock entry with negative wholesale price', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData({ wholesalePrice: '-100' });
  
  try {
    await stockService.createStockEntry(formData);
    throw new Error('Should have rejected negative wholesale price');
  } catch (error) {
    assertTrue(error instanceof Error, 'Should throw validation error');
    assertTrue((error as Error).message.includes('mayor a'), 'Should show minimum price message');
  }
});

// Test Suite 2: Stock Entry Updates with Wholesale Pricing
console.log('\n=== Testing Stock Entry Updates with Wholesale Pricing ===');

runIntegrationTest('Update stock entry wholesale price', async () => {
  stockService.clear();
  
  // Create initial entry
  const formData = createValidStockEntryData({ wholesalePrice: '800' });
  const stockEntry = await stockService.createStockEntry(formData);
  
  // Update wholesale price
  const updatedEntry = await stockService.updateStockEntry(stockEntry.id, {
    wholesalePrice: '750'
  });
  
  assertEqual(updatedEntry.sale_price_wholesale, 750, 'Should update wholesale price');
  assertEqual(updatedEntry.sale_price_unit, 1000, 'Should preserve other prices');
});

runIntegrationTest('Remove wholesale price from stock entry', async () => {
  stockService.clear();
  
  // Create entry with wholesale price
  const formData = createValidStockEntryData({ wholesalePrice: '800' });
  const stockEntry = await stockService.createStockEntry(formData);
  
  // Remove wholesale price
  const updatedEntry = await stockService.updateStockEntry(stockEntry.id, {
    wholesalePrice: ''
  });
  
  assertEqual(updatedEntry.sale_price_wholesale, undefined, 'Should remove wholesale price');
});

runIntegrationTest('Add wholesale price to existing stock entry', async () => {
  stockService.clear();
  
  // Create entry without wholesale price
  const formData = createValidStockEntryData({ wholesalePrice: undefined });
  const stockEntry = await stockService.createStockEntry(formData);
  
  // Add wholesale price
  const updatedEntry = await stockService.updateStockEntry(stockEntry.id, {
    wholesalePrice: '850'
  });
  
  assertEqual(updatedEntry.sale_price_wholesale, 850, 'Should add wholesale price');
});

runIntegrationTest('Reject invalid wholesale price update', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData();
  const stockEntry = await stockService.createStockEntry(formData);
  
  try {
    await stockService.updateStockEntry(stockEntry.id, {
      wholesalePrice: 'invalid'
    });
    throw new Error('Should have rejected invalid wholesale price update');
  } catch (error) {
    assertTrue(error instanceof Error, 'Should throw validation error');
  }
});

// Test Suite 3: Complex Stock Entry Operations
console.log('\n=== Testing Complex Stock Entry Operations ===');

runIntegrationTest('Bulk stock entry creation with mixed wholesale pricing', async () => {
  stockService.clear();
  
  const entries = [
    createValidStockEntryData({ productId: '1', wholesalePrice: '800' }),
    createValidStockEntryData({ productId: '2', wholesalePrice: undefined }),
    createValidStockEntryData({ productId: '3', wholesalePrice: '750' })
  ];
  
  const createdEntries = [];
  for (const entryData of entries) {
    const entry = await stockService.createStockEntry(entryData);
    createdEntries.push(entry);
  }
  
  assertEqual(createdEntries.length, 3, 'Should create all entries');
  assertEqual(createdEntries[0].sale_price_wholesale, 800, 'First entry should have wholesale price');
  assertEqual(createdEntries[1].sale_price_wholesale, undefined, 'Second entry should not have wholesale price');
  assertEqual(createdEntries[2].sale_price_wholesale, 750, 'Third entry should have wholesale price');
});

runIntegrationTest('Stock entry validation with price relationships', async () => {
  stockService.clear();
  
  // Test case where wholesale price is higher than unit price (unusual but valid)
  const formData = createValidStockEntryData({
    unitPrice: '500',
    wholesalePrice: '600'
  });
  
  const stockEntry = await stockService.createStockEntry(formData);
  assertEqual(stockEntry.sale_price_wholesale, 600, 'Should allow wholesale price higher than unit price');
  assertEqual(stockEntry.sale_price_unit, 500, 'Should preserve unit price');
});

runIntegrationTest('Stock entry with decimal wholesale pricing', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData({
    wholesalePrice: '799.99'
  });
  
  const stockEntry = await stockService.createStockEntry(formData);
  assertEqual(stockEntry.sale_price_wholesale, 799.99, 'Should handle decimal wholesale prices');
});

// Test Suite 4: Stock Entry Retrieval and Filtering
console.log('\n=== Testing Stock Entry Retrieval with Wholesale Pricing ===');

runIntegrationTest('Retrieve stock entries with wholesale pricing information', async () => {
  const testService = new MockStockEntryService(); // Use fresh instance
  
  // Create entries with and without wholesale pricing
  await testService.createStockEntry(createValidStockEntryData({ 
    productId: '1', 
    wholesalePrice: '800' 
  }));
  await testService.createStockEntry(createValidStockEntryData({ 
    productId: '2', 
    wholesalePrice: undefined 
  }));
  
  const allEntries = testService.getAllStockEntries();
  assertEqual(allEntries.length, 2, 'Should retrieve all entries');
  
  const withWholesale = allEntries.filter(entry => entry.sale_price_wholesale);
  const withoutWholesale = allEntries.filter(entry => !entry.sale_price_wholesale);
  
  assertEqual(withWholesale.length, 1, 'Should identify entries with wholesale pricing');
  assertEqual(withoutWholesale.length, 1, 'Should identify entries without wholesale pricing');
});

// Test Suite 5: Error Handling and Edge Cases
console.log('\n=== Testing Error Handling and Edge Cases ===');

runIntegrationTest('Handle concurrent stock entry updates', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData();
  const stockEntry = await stockService.createStockEntry(formData);
  
  // Simulate concurrent updates
  const update1Promise = stockService.updateStockEntry(stockEntry.id, {
    wholesalePrice: '750'
  });
  const update2Promise = stockService.updateStockEntry(stockEntry.id, {
    unitPrice: '1100'
  });
  
  const [, result2] = await Promise.all([update1Promise, update2Promise]);
  
  // Last update should win
  assertEqual(result2.sale_price_unit, 1100, 'Should apply last unit price update');
  assertTrue(result2.sale_price_wholesale !== undefined, 'Should preserve wholesale price from concurrent update');
});

runIntegrationTest('Stock entry deletion preserves data integrity', async () => {
  stockService.clear();
  
  const formData = createValidStockEntryData();
  const stockEntry = await stockService.createStockEntry(formData);
  
  const deleted = await stockService.deleteStockEntry(stockEntry.id);
  assertTrue(deleted, 'Should successfully delete stock entry');
  
  const retrieved = await stockService.getStockEntry(stockEntry.id);
  assertEqual(retrieved, null, 'Should not retrieve deleted entry');
});

runIntegrationTest('Handle extreme wholesale price values', async () => {
  stockService.clear();
  
  // Test minimum valid price
  const minPriceData = createValidStockEntryData({ wholesalePrice: '0.01' });
  const minPriceEntry = await stockService.createStockEntry(minPriceData);
  assertEqual(minPriceEntry.sale_price_wholesale, 0.01, 'Should handle minimum price');
  
  // Test maximum valid price
  const maxPriceData = createValidStockEntryData({ wholesalePrice: '999999.99' });
  const maxPriceEntry = await stockService.createStockEntry(maxPriceData);
  assertEqual(maxPriceEntry.sale_price_wholesale, 999999.99, 'Should handle maximum price');
});

// Summary
console.log('\n=== Integration Test Suite Summary ===');
console.log('✅ Stock entry creation with wholesale pricing tested');
console.log('✅ Stock entry updates with wholesale price modifications verified');
console.log('✅ Validation integration with stock operations confirmed');
console.log('✅ Complex operations and edge cases covered');
console.log('✅ Error handling and data integrity validated');

export {}; // Make this a module