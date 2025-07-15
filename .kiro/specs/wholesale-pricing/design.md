# Design Document

## Overview

This design document outlines the implementation of wholesale pricing functionality for the MiniMarket Pro inventory management system. The feature will extend the existing stock entry system to include wholesale pricing (precio mayorista) that automatically applies when customers purchase 3 or more units of a product. The design leverages the existing Next.js 15 App Router architecture, Supabase database, and established FIFO inventory management patterns.

## Architecture

### Database Layer
The system will extend the existing `stock_entries` table to include wholesale pricing information. The current schema includes:

**Current Stock Entries Table:**
- `id`: Primary key
- `product_id`: Foreign key to products
- `initial_quantity`: Original quantity entered
- `current_quantity`: Remaining quantity
- `barcode`: Product barcode
- `purchase_price`: Cost price
- `sale_price_unit`: Regular unit price
- `sale_price_box`: Box price
- `expiration_date`: Product expiration
- `created_at`: Entry timestamp

**Proposed Extension:**
- `sale_price_wholesale`: New field for wholesale unit price (nullable)

### Application Layer
The feature will extend existing components and server actions following established patterns:

- **Server Actions**: Extend existing stock entry actions in `app/dashboard/admin/actions.ts`
- **React Components**: Modify existing stock entry forms and sales components
- **Sales Logic**: Enhance sales processing to apply wholesale pricing automatically
- **FIFO Integration**: Maintain existing FIFO methodology with wholesale pricing

## Components and Interfaces

### 1. Database Schema Changes

**Migration Required:**
```sql
ALTER TABLE stock_entries 
ADD COLUMN sale_price_wholesale DECIMAL(10,2) NULL;
```

### 2. Enhanced Stock Entry Management

**Modified Components:**
- `StockEntryForm.tsx`: Add wholesale price input field
- `StockModal.tsx`: Display wholesale price in stock entry lists
- `AdminDashboard.tsx`: Show wholesale pricing in stock overview

**Enhanced Server Actions:**
- `addStockEntry()`: Include wholesale price validation and storage
- `updateStockEntry()`: Allow wholesale price modifications
- `getStockEntriesByProduct()`: Include wholesale price in responses

### 3. Sales System Integration

**Modified Components:**
- `SaleModal.tsx`: Display wholesale pricing information and apply automatic discounts
- `VendorPageClient.tsx`: Show wholesale pricing in product search results
- Sales processing components: Implement quantity-based pricing logic

**Enhanced API Endpoints:**
- `/api/products/by-barcode`: Include wholesale pricing in product responses
- `/api/sales`: Implement wholesale pricing calculation logic

### 4. Pricing Logic Components

**New Utility Functions:**
```typescript
// Pricing calculation utilities
function calculateItemPrice(stockEntry: StockEntry, quantity: number): number
function getApplicablePrice(stockEntry: StockEntry, quantity: number): number
function formatPricingDisplay(stockEntry: StockEntry): PricingDisplay
```

## Data Models

### TypeScript Interfaces

```typescript
interface StockEntry {
  id: string;
  product_id: string;
  initial_quantity: number;
  current_quantity: number;
  barcode: string;
  purchase_price: number;
  sale_price_unit: number;
  sale_price_box: number;
  sale_price_wholesale?: number; // New field
  expiration_date?: string;
  created_at: string;
}

interface PricingInfo {
  unitPrice: number;
  boxPrice: number;
  wholesalePrice?: number;
  wholesaleMinQuantity: number; // Always 3
}

interface SaleItem {
  stockEntryId: string;
  product: Product;
  quantity: number;
  unitPrice: number; // Price applied (regular or wholesale)
  totalPrice: number;
  isWholesaleApplied: boolean;
  saleFormat: 'unitario' | 'caja';
}

interface CartItem extends SaleItem {
  priceBreakdown: {
    regularPrice: number;
    appliedPrice: number;
    savings?: number;
  };
}
```

### Enhanced Server Action Signatures

```typescript
// Enhanced stock entry operations
async function addStockEntry(formData: FormData): Promise<void>
async function updateStockEntry(formData: FormData): Promise<void>

// New pricing utilities
async function getProductPricing(productId: string): Promise<PricingInfo[]>
async function calculateSaleTotal(items: SaleItem[]): Promise<SaleTotal>
```

## Pricing Logic Implementation

### Wholesale Price Application Rules

1. **Quantity Threshold**: Wholesale pricing applies when quantity >= 3 units
2. **Per Stock Entry**: Each stock entry can have its own wholesale price
3. **FIFO Compliance**: Wholesale pricing follows FIFO methodology
4. **Mixed Pricing**: Sales can combine regular and wholesale pricing

### Calculation Algorithm

```typescript
function calculateItemPrice(stockEntry: StockEntry, quantity: number): number {
  const hasWholesalePrice = stockEntry.sale_price_wholesale !== null;
  const qualifiesForWholesale = quantity >= 3;
  
  if (hasWholesalePrice && qualifiesForWholesale) {
    return stockEntry.sale_price_wholesale * quantity;
  }
  
  return stockEntry.sale_price_unit * quantity;
}
```

### FIFO Integration

When a sale spans multiple stock entries with different wholesale prices:

1. Apply FIFO to determine stock entry consumption order
2. Calculate pricing for each stock entry individually
3. Apply wholesale pricing per stock entry based on quantity consumed
4. Aggregate total pricing across all consumed stock entries

## Error Handling

### Validation Rules
- **Wholesale Price**: Must be positive number or null
- **Price Logic**: Wholesale price should typically be less than unit price
- **Quantity Validation**: Ensure sufficient stock for wholesale quantities
- **FIFO Integrity**: Maintain proper inventory rotation with pricing

### Error Scenarios
1. **Invalid Wholesale Price**: Handle non-numeric or negative values
2. **Stock Insufficient**: Prevent wholesale sales when stock < 3 units
3. **Database Constraints**: Handle null wholesale price scenarios
4. **Calculation Errors**: Prevent pricing calculation failures

### Error Display
- Use existing error handling patterns from current admin actions
- Display pricing errors in sales interface
- Show clear messages when wholesale pricing is unavailable

## Testing Strategy

### Unit Tests
- **Pricing Calculations**: Test wholesale price application logic
- **FIFO Integration**: Test pricing with multiple stock entries
- **Validation Logic**: Test wholesale price validation
- **Edge Cases**: Test boundary conditions (exactly 3 units, mixed quantities)

### Integration Tests
- **Database Operations**: Test wholesale price storage and retrieval
- **Sales Processing**: Test end-to-end sales with wholesale pricing
- **Stock Entry Management**: Test CRUD operations with wholesale prices
- **FIFO Compliance**: Test inventory rotation with wholesale pricing

### User Acceptance Testing
- **Stock Entry**: Verify administrators can set wholesale prices
- **Sales Processing**: Confirm automatic wholesale price application
- **Price Display**: Test pricing information display in sales interface
- **Reporting**: Verify wholesale pricing appears in sales reports

## Implementation Approach

### Phase 1: Database Schema and Core Logic
- Add `sale_price_wholesale` column to `stock_entries` table
- Implement pricing calculation utilities
- Update TypeScript interfaces and types

### Phase 2: Stock Entry Management
- Modify stock entry forms to include wholesale price input
- Update server actions for wholesale price handling
- Enhance stock entry display components

### Phase 3: Sales System Integration
- Modify sales components to display wholesale pricing
- Implement automatic wholesale price application
- Update sales processing logic

### Phase 4: Enhanced Features and Reporting
- Add wholesale pricing to sales reports
- Implement pricing analytics
- Add bulk wholesale price management tools

## Security Considerations

### Authentication and Authorization
- Leverage existing middleware for session management
- Ensure only administrators can set wholesale prices
- Protect wholesale pricing data in sales operations

### Data Validation
- Server-side validation for wholesale price inputs
- Prevent manipulation of pricing calculations
- Validate quantity thresholds for wholesale pricing

### Business Logic Protection
- Prevent negative wholesale prices
- Ensure pricing calculations are server-side only
- Protect against pricing manipulation in sales

## Performance Considerations

### Database Optimization
- Index wholesale price column for efficient queries
- Optimize pricing calculation queries
- Consider caching for frequently accessed pricing data

### UI Performance
- Implement efficient pricing display updates
- Use React optimization patterns for pricing components
- Minimize re-calculations during sales processing

### Sales Processing
- Optimize FIFO calculations with wholesale pricing
- Implement efficient bulk pricing calculations
- Cache pricing information during sales sessions

## Integration with Existing Systems

### FIFO Inventory Management
- Maintain existing FIFO methodology
- Apply wholesale pricing per stock entry consumed
- Preserve inventory rotation integrity

### Sales Reporting
- Include wholesale pricing in existing sales reports
- Track wholesale vs regular sales metrics
- Maintain compatibility with current reporting structure

### Product Management
- Integrate with existing product categorization
- Support wholesale pricing across all product types
- Maintain relationship with brands and product types

## Migration Strategy

### Database Migration
1. Add new column with proper constraints
2. Set default values for existing stock entries
3. Update application code to handle new field
4. Test migration with production-like data

### Code Deployment
1. Deploy database changes first
2. Update application code with backward compatibility
3. Gradually enable wholesale pricing features
4. Monitor system performance and pricing accuracy

### User Training
1. Document wholesale pricing functionality
2. Train administrators on setting wholesale prices
3. Train sales staff on wholesale pricing display
4. Provide troubleshooting guides for pricing issues