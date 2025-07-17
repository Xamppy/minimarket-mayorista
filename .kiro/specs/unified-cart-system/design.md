# Design Document

## Overview

This design addresses the inconsistencies in cart management, wholesale pricing application, and stock entry selection across different product addition methods. The solution implements a unified cart system with consistent wholesale pricing logic, intelligent stock entry selection, and clear user feedback about pricing and stock information.

## Architecture

### Unified Cart Management System
- **Single Source of Truth**: All cart operations go through the same pricing and validation logic
- **Stock Entry Awareness**: Every cart item is tied to a specific stock entry with full details
- **Dynamic Pricing**: Real-time wholesale pricing calculation based on quantity changes
- **FIFO Logic**: Automatic selection of optimal stock entries based on expiration dates

### Wholesale Pricing Engine
- **Consistent Application**: Same pricing logic regardless of product addition method
- **Real-time Calculation**: Dynamic recalculation when quantities change
- **Visual Feedback**: Clear indication of savings and pricing tiers
- **Validation**: Ensure wholesale pricing rules are properly applied

## Components and Interfaces

### Enhanced Cart Item Interface

```typescript
interface EnhancedCartItem {
  product: Product;
  stockEntry: {
    id: string;
    barcode: string;
    current_quantity: number;
    expiration_date: string | null;
    sale_price_unit: number;
    sale_price_box: number;
    sale_price_wholesale: number | null;
    entry_date: string;
  };
  quantity: number;
  saleFormat: 'unitario' | 'caja';
  pricing: {
    unitPrice: number;
    appliedPrice: number;
    priceType: 'unit' | 'wholesale';
    totalPrice: number;
    savings: number;
    wholesaleAvailable: boolean;
    wholesaleThreshold: number;
  };
  validation: {
    maxQuantity: number;
    isValid: boolean;
    warnings: string[];
  };
}
```

### Stock Entry Selection Modal

```typescript
interface StockEntrySelectionModal {
  product: Product;
  availableStockEntries: StockEntry[];
  recommendedEntry: StockEntry; // FIFO selection
  onStockEntrySelected: (stockEntry: StockEntry, quantity: number) => void;
  showPricingComparison: boolean;
  defaultQuantity: number;
}
```

### Unified Add to Cart Service

```typescript
class UnifiedCartService {
  // Main entry point for all cart additions
  addToCart(product: Product, options: AddToCartOptions): Promise<CartResult>;
  
  // Stock entry selection logic
  selectOptimalStockEntry(product: Product, quantity: number): StockEntry;
  
  // Wholesale pricing calculation
  calculatePricing(stockEntry: StockEntry, quantity: number): PricingResult;
  
  // Cart validation and updates
  updateCartItem(itemId: string, newQuantity: number): Promise<CartResult>;
  
  // FIFO logic implementation
  getFIFOStockEntries(productId: string): StockEntry[];
}
```

## Data Models

### Enhanced Product with Stock Information

```typescript
interface ProductWithStockDetails {
  id: string;
  name: string;
  brand_name: string;
  type_name: string;
  image_url: string | null;
  stockEntries: StockEntry[];
  totalStock: number;
  hasWholesalePrice: boolean;
  wholesaleThreshold: number;
  pricing: {
    minUnitPrice: number;
    maxUnitPrice: number;
    minWholesalePrice: number | null;
    maxWholesalePrice: number | null;
  };
}
```

### Stock Entry with Enhanced Information

```typescript
interface EnhancedStockEntry {
  id: string;
  product_id: string;
  barcode: string;
  current_quantity: number;
  initial_quantity: number;
  expiration_date: string | null;
  entry_date: string;
  purchase_price: number;
  sale_price_unit: number;
  sale_price_box: number;
  sale_price_wholesale: number | null;
  
  // Calculated fields
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  fifoRank: number;
  wholesaleAvailable: boolean;
  
  // Display helpers
  displayName: string;
  statusColor: 'green' | 'yellow' | 'red';
  priorityScore: number;
}
```

## User Experience Flow

### Barcode Scanner Flow
1. **Scan Product**: User scans barcode
2. **Auto Stock Selection**: System selects optimal stock entry using FIFO
3. **Show Selection**: Display selected stock entry details in modal
4. **Quantity Input**: User enters quantity with real-time pricing updates
5. **Wholesale Detection**: System highlights wholesale pricing if applicable
6. **Add to Cart**: Item added with full stock entry and pricing information

### Catalog Flow
1. **Select Product**: User clicks "Add to Cart" from catalog
2. **Stock Entry Selection**: Modal shows available stock entries
3. **Entry Comparison**: Display expiration dates, quantities, and pricing
4. **User Choice**: User selects preferred stock entry or accepts recommendation
5. **Quantity Input**: Same pricing logic as scanner flow
6. **Add to Cart**: Consistent cart item structure

### Cart Management Flow
1. **Unified Display**: All items show stock entry details and pricing
2. **Quantity Updates**: Real-time wholesale pricing recalculation
3. **Validation**: Check against specific stock entry limits
4. **Visual Feedback**: Clear indication of wholesale pricing and savings
5. **Expiration Warnings**: Highlight items nearing expiration

## Wholesale Pricing Logic

### Calculation Engine
```typescript
function calculateUnifiedPricing(
  stockEntry: StockEntry, 
  quantity: number
): PricingResult {
  const basePrice = stockEntry.sale_price_unit;
  const wholesalePrice = stockEntry.sale_price_wholesale;
  const threshold = 3; // Configurable
  
  if (quantity >= threshold && wholesalePrice && wholesalePrice > 0) {
    return {
      appliedPrice: wholesalePrice,
      priceType: 'wholesale',
      totalPrice: wholesalePrice * quantity,
      savings: (basePrice - wholesalePrice) * quantity,
      wholesaleApplied: true
    };
  }
  
  return {
    appliedPrice: basePrice,
    priceType: 'unit',
    totalPrice: basePrice * quantity,
    savings: 0,
    wholesaleApplied: false
  };
}
```

### Visual Pricing Display
- **Before/After Comparison**: Show unit price vs wholesale price
- **Savings Highlight**: Prominent display of total savings
- **Threshold Indicator**: Show how many more units needed for wholesale
- **Price Breakdown**: Detailed calculation display

## Error Handling

### Stock Validation
- **Insufficient Stock**: Clear error messages with available quantity
- **Expired Products**: Warnings for products past expiration
- **Stock Entry Conflicts**: Handle concurrent stock modifications

### Pricing Validation
- **Invalid Wholesale Pricing**: Fallback to unit pricing with explanation
- **Price Calculation Errors**: Graceful degradation with user notification
- **Currency Formatting**: Consistent price display across all components

## Testing Strategy

### Unit Tests
- Wholesale pricing calculation accuracy
- FIFO stock entry selection logic
- Cart item validation and updates
- Price formatting and display

### Integration Tests
- End-to-end cart flow from scanner
- End-to-end cart flow from catalog
- Cross-component pricing consistency
- Stock entry selection and validation

### User Experience Tests
- Mobile usability for stock entry selection
- Pricing clarity and understanding
- Cart management efficiency
- Error handling and recovery

## Implementation Phases

### Phase 1: Core Infrastructure
- Unified cart service implementation
- Enhanced data models and interfaces
- Basic wholesale pricing engine

### Phase 2: Stock Entry Selection
- FIFO logic implementation
- Stock entry selection modal
- Enhanced product catalog integration

### Phase 3: User Experience
- Visual pricing improvements
- Mobile-optimized interfaces
- Comprehensive error handling

### Phase 4: Testing and Optimization
- Performance optimization
- Comprehensive testing suite
- User feedback integration