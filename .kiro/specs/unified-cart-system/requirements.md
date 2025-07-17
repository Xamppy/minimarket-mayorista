# Requirements Document

## Introduction

This feature addresses critical inconsistencies in the cart and pricing system between different product addition methods (barcode scanner vs product catalog). Currently, the wholesale pricing logic is not working correctly when adding products via barcode scanner, and users cannot see which specific stock entry they are adding from the catalog. The system needs a unified approach to cart management, stock selection, and wholesale pricing application.

## Requirements

### Requirement 1

**User Story:** As a vendor, I want wholesale pricing to be applied consistently regardless of how I add products to the cart (scanner or catalog), so that customers always get the correct discounted price when buying 3+ units.

#### Acceptance Criteria

1. WHEN I add 3 or more units of a product via barcode scanner THEN the system SHALL apply wholesale pricing if available
2. WHEN I add 3 or more units of a product via catalog THEN the system SHALL apply the same wholesale pricing logic
3. WHEN wholesale pricing is applied THEN the system SHALL show the discount amount and savings clearly
4. WHEN the quantity changes in the cart THEN the system SHALL recalculate wholesale pricing dynamically

### Requirement 2

**User Story:** As a vendor, I want to see which specific stock entry I'm adding to the cart from the catalog, so that I can make informed decisions about product selection based on expiration dates and pricing.

#### Acceptance Criteria

1. WHEN I click "Add to Cart" from the catalog THEN the system SHALL show me available stock entries with details
2. WHEN viewing stock entries THEN the system SHALL display expiration date, quantity available, and pricing information
3. WHEN multiple stock entries exist THEN the system SHALL allow me to choose which one to add
4. WHEN only one stock entry exists THEN the system SHALL use it automatically but show the details

### Requirement 3

**User Story:** As a vendor, I want a unified cart experience where all products show consistent information regardless of how they were added, so that I can manage my cart efficiently.

#### Acceptance Criteria

1. WHEN products are in the cart THEN the system SHALL show stock entry details for each item
2. WHEN I modify quantities THEN the system SHALL validate against the specific stock entry limits
3. WHEN wholesale pricing applies THEN the system SHALL show consistent pricing information across all cart items
4. WHEN I view the cart THEN the system SHALL display expiration dates and stock entry information

### Requirement 4

**User Story:** As a vendor, I want the system to automatically select the best stock entry using FIFO logic when adding products via scanner, so that products with earlier expiration dates are sold first.

#### Acceptance Criteria

1. WHEN I scan a product barcode THEN the system SHALL automatically select the stock entry with the earliest expiration date
2. WHEN the earliest stock entry has insufficient quantity THEN the system SHALL show available options
3. WHEN adding to cart via scanner THEN the system SHALL display which stock entry was selected
4. WHEN multiple stock entries exist THEN the system SHALL provide option to choose different stock entry

### Requirement 5

**User Story:** As a vendor, I want clear visual indicators for wholesale pricing opportunities, so that I can inform customers about potential savings.

#### Acceptance Criteria

1. WHEN a product has wholesale pricing available THEN the system SHALL show wholesale price information
2. WHEN quantity reaches wholesale threshold THEN the system SHALL highlight the savings prominently
3. WHEN wholesale pricing is applied THEN the system SHALL show before/after pricing comparison
4. WHEN wholesale pricing is not available THEN the system SHALL clearly indicate this to avoid confusion