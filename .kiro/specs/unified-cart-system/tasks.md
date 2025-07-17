
# Implementation Plan

- [x] 1. Fix immediate wholesale pricing bug in scanner flow


  - Debug why wholesale pricing is not applying when adding 3+ units via barcode scanner
  - Ensure calculateItemPrice function is called correctly in SaleModal component
  - Verify that wholesale price data is being passed properly from stock entry
  - _Requirements: 1.1, 1.2, 1.4_



- [x] 2. Create enhanced cart item interface and types

  - Define EnhancedCartItem interface with complete stock entry information
  - Add pricing breakdown structure with wholesale pricing details
  - Create validation structure for cart item limits and warnings
  - Update existing cart state to use enhanced interface
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Implement unified wholesale pricing calculation service


  - Create centralized pricing calculation function that works for all scenarios
  - Ensure consistent wholesale pricing logic across scanner and catalog flows
  - Add real-time recalculation when quantities change in cart
  - Include savings calculation and pricing tier detection
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. Create stock entry selection modal for catalog products




  - Build modal component to show available stock entries when adding from catalog
  - Display expiration dates, quantities, and pricing for each stock entry
  - Implement FIFO recommendation logic to suggest best stock entry
  - Add user selection capability with clear stock entry comparison


  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 5. Enhance barcode scanner flow with stock entry details
  - Modify scanner flow to show which stock entry was automatically selected
  - Display stock entry information (expiration date, quantity) in add-to-cart modal


  - Add option to choose different stock entry if multiple available
  - Implement FIFO logic for automatic stock entry selection
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Update cart display with enhanced stock entry information


  - Show stock entry details for each cart item (expiration date, barcode)
  - Display wholesale pricing information and savings clearly
  - Add expiration date warnings for items nearing expiration
  - Ensure consistent pricing display across all cart items
  - _Requirements: 3.1, 3.2, 3.3_



- [ ] 7. Implement dynamic wholesale pricing in cart quantity controls
  - Update cart quantity controls to recalculate wholesale pricing in real-time
  - Show pricing changes immediately when quantity crosses wholesale threshold
  - Display savings and pricing tier changes dynamically


  - Validate quantity changes against specific stock entry limits
  - _Requirements: 1.4, 3.2, 5.2, 5.3_

- [ ] 8. Add visual indicators for wholesale pricing opportunities
  - Create visual components to highlight wholesale pricing availability


  - Show wholesale price information in product displays
  - Add savings indicators and pricing tier notifications
  - Implement before/after pricing comparison displays
  - _Requirements: 5.1, 5.2, 5.3, 5.4_



- [ ] 9. Create FIFO stock entry selection logic
  - Implement algorithm to select optimal stock entry based on expiration dates
  - Add fallback logic when preferred stock entry has insufficient quantity
  - Create stock entry ranking system considering expiration and quantity
  - Ensure consistent FIFO application across all product addition methods


  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Update product catalog to show stock entry information
  - Modify catalog display to show available stock entries count
  - Add indicators for products with multiple stock entries
  - Show wholesale pricing availability in catalog view
  - Integrate stock entry selection into catalog add-to-cart flow
  - _Requirements: 2.1, 2.2, 5.1_

- [ ] 11. Implement comprehensive cart validation system
  - Add validation for quantity limits based on specific stock entries
  - Create warning system for expiring products in cart
  - Implement stock availability checks before checkout
  - Add error handling for stock entry conflicts and updates
  - _Requirements: 3.2, 3.3_

- [x] 12. Add unit tests for unified pricing and cart logic


  - Test wholesale pricing calculation accuracy across different scenarios
  - Verify FIFO stock entry selection logic with various data sets
  - Test cart validation and quantity update logic
  - Ensure pricing consistency between scanner and catalog flows
  - _Requirements: 1.1, 1.2, 1.3, 1.4_