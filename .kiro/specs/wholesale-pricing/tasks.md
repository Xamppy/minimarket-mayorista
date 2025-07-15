# Implementation Plan

- [x] 1. Add wholesale price column to stock_entries table






  - Create database migration to add `sale_price_wholesale` column as nullable DECIMAL(10,2)
  - Test migration on development database to ensure no data loss
  - Verify column constraints and indexing for optimal performance
  - _Requirements: 1.3, 4.2, 6.2_

- [-] 2. Update TypeScript interfaces for wholesale pricing
  - Modify StockEntry interface to include `sale_price_wholesale?: number`
  - Create PricingInfo interface for comprehensive pricing display
  - Update SaleItem interface to include wholesale pricing information
  - Add CartItem interface with price breakdown details
  - _Requirements: 1.1, 2.5, 3.1_

- [ ] 3. Implement wholesale pricing calculation utilities
  - Create `calculateItemPrice()` function to determine unit price based on quantity
  - Implement `getApplicablePrice()` function for price selection logic
  - Write `formatPricingDisplay()` function for UI pricing information
  - Add validation utilities for wholesale price input
  - _Requirements: 2.1, 2.2, 2.3, 6.1_

- [ ] 4. Enhance stock entry server actions with wholesale pricing
  - Modify `addStockEntry()` to accept and validate wholesale price input
  - Update `updateStockEntry()` to handle wholesale price modifications
  - Add wholesale price validation (positive number or null)
  - Ensure proper error handling for invalid wholesale prices
  - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.3_

- [ ] 5. Update stock entry form components for wholesale price input
  - Modify `StockEntryForm.tsx` to include wholesale price input field
  - Add client-side validation for wholesale price format
  - Implement form state management for wholesale price
  - Add helpful labels and tooltips explaining wholesale pricing (3+ units)
  - _Requirements: 1.1, 1.2, 4.1_

- [ ] 6. Enhance stock entry display components with wholesale pricing
  - Update `StockModal.tsx` to show wholesale price in stock entry tables
  - Modify stock entry list views to display wholesale pricing information
  - Add visual indicators when wholesale pricing is available
  - Implement responsive design for additional pricing column
  - _Requirements: 1.5, 4.1, 5.1_

- [ ] 7. Implement wholesale pricing logic in sales processing
  - Modify sales API endpoints to calculate wholesale pricing automatically
  - Update FIFO logic to apply correct pricing per stock entry consumed
  - Implement quantity-based pricing calculation in sales processing
  - Add wholesale pricing to sale item creation logic
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.3_

- [ ] 8. Update product search and display with wholesale pricing
  - Modify `/api/products/by-barcode` to include wholesale pricing in responses
  - Update product search results to show wholesale pricing information
  - Add wholesale price display in product selection interfaces
  - Implement pricing comparison display (regular vs wholesale)
  - _Requirements: 3.1, 3.2, 3.5_

- [ ] 9. Enhance sales modal with wholesale pricing display
  - Update `SaleModal.tsx` to show wholesale pricing when available
  - Add quantity threshold indicators (3+ units for wholesale)
  - Implement automatic price updates when quantity changes
  - Display savings calculation when wholesale pricing applies
  - _Requirements: 2.5, 3.1, 3.3, 3.5_

- [ ] 10. Implement wholesale pricing in cart and checkout
  - Modify cart item display to show applied pricing (regular/wholesale)
  - Add price breakdown showing savings from wholesale pricing
  - Update cart total calculations to include wholesale pricing
  - Implement clear indicators when wholesale pricing is applied
  - _Requirements: 2.1, 2.5, 3.4, 3.5_

- [ ] 11. Update sales processing to handle mixed pricing scenarios
  - Implement logic for sales spanning multiple stock entries with different wholesale prices
  - Add proper FIFO consumption with per-entry wholesale pricing
  - Create sale item records with correct pricing information
  - Ensure accurate total calculation across mixed pricing scenarios
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 12. Add wholesale pricing validation and error handling
  - Implement server-side validation for wholesale price inputs
  - Add error handling for insufficient stock for wholesale quantities
  - Create user-friendly error messages for pricing validation failures
  - Add fallback logic when wholesale pricing is unavailable
  - _Requirements: 1.2, 4.3, 2.4_

- [ ] 13. Create wholesale pricing reports and analytics
  - Implement server actions to retrieve wholesale pricing statistics
  - Add wholesale vs regular sales comparison reports
  - Create pricing effectiveness analytics for administrators
  - Add filtering options for products with/without wholesale pricing
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 14. Update existing sales reports to include wholesale pricing
  - Modify sales report queries to include wholesale pricing information
  - Add wholesale pricing columns to sales history displays
  - Update receipt/ticket generation to show wholesale pricing
  - Ensure backward compatibility with existing sales data
  - _Requirements: 5.2, 5.4, 6.5_

- [ ] 15. Implement comprehensive testing for wholesale pricing
  - Write unit tests for wholesale pricing calculation functions
  - Create integration tests for stock entry CRUD with wholesale pricing
  - Add end-to-end tests for sales processing with wholesale pricing
  - Test FIFO compliance with mixed wholesale pricing scenarios
  - _Requirements: 1.1, 2.1, 4.2, 6.1_