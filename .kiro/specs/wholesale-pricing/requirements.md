# Requirements Document

## Introduction

This feature enables the system to support wholesale pricing for products in the MiniMarket Pro inventory management system. When entering stock, administrators will be able to set a wholesale price (precio mayorista) that applies when customers purchase 3 or more units of a product. This wholesale price must be manually entered alongside the regular unit price and box price, providing flexible pricing strategies for bulk purchases.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to set wholesale prices when entering stock, so that I can offer discounted pricing for customers who buy 3 or more units of the same product.

#### Acceptance Criteria

1. WHEN an administrator accesses the stock entry form THEN the system SHALL display a wholesale price field alongside the unit price and box price fields
2. WHEN an administrator enters a wholesale price THEN the system SHALL validate that it is a positive number
3. WHEN an administrator saves stock entry with wholesale price THEN the system SHALL store the wholesale price in the database associated with that stock entry
4. WHEN a wholesale price is not provided THEN the system SHALL allow the stock entry to be saved without wholesale pricing
5. WHEN displaying stock entries THEN the system SHALL show the wholesale price alongside other pricing information

### Requirement 2

**User Story:** As a seller, I want the system to automatically apply wholesale pricing during sales, so that customers receive the correct discount when purchasing 3 or more units.

#### Acceptance Criteria

1. WHEN a seller adds 3 or more units of a product to a sale THEN the system SHALL automatically apply the wholesale price per unit
2. WHEN a seller adds fewer than 3 units of a product THEN the system SHALL use the regular unit price
3. WHEN calculating sale totals THEN the system SHALL use wholesale pricing for qualifying quantities and regular pricing for non-qualifying quantities
4. WHEN a product has no wholesale price set THEN the system SHALL use regular unit pricing regardless of quantity
5. WHEN displaying sale line items THEN the system SHALL clearly indicate when wholesale pricing is applied

### Requirement 3

**User Story:** As a seller, I want to see wholesale pricing information during product selection, so that I can inform customers about bulk pricing discounts.

#### Acceptance Criteria

1. WHEN viewing product details in the sales interface THEN the system SHALL display both regular and wholesale prices when available
2. WHEN searching for products THEN the system SHALL show wholesale price information in product results
3. WHEN a wholesale price exists THEN the system SHALL display the minimum quantity required (3 units) for wholesale pricing
4. WHEN no wholesale price is set THEN the system SHALL only display regular pricing information
5. WHEN wholesale pricing is available THEN the system SHALL clearly indicate the savings compared to regular pricing

### Requirement 4

**User Story:** As an administrator, I want to edit wholesale prices for existing stock entries, so that I can adjust pricing strategies based on market conditions.

#### Acceptance Criteria

1. WHEN an administrator views existing stock entries THEN the system SHALL display current wholesale prices
2. WHEN an administrator edits a stock entry THEN the system SHALL allow modification of the wholesale price
3. WHEN an administrator updates a wholesale price THEN the system SHALL validate the new price is positive
4. WHEN a wholesale price is updated THEN the system SHALL apply the new price to future sales immediately
5. WHEN removing a wholesale price THEN the system SHALL allow setting the field to empty/null

### Requirement 5

**User Story:** As an administrator, I want to view wholesale pricing reports, so that I can analyze the effectiveness of bulk pricing strategies.

#### Acceptance Criteria

1. WHEN an administrator accesses pricing reports THEN the system SHALL show products with wholesale pricing configured
2. WHEN viewing wholesale pricing reports THEN the system SHALL display regular vs wholesale price comparisons
3. WHEN analyzing sales data THEN the system SHALL show how often wholesale pricing is applied
4. WHEN reviewing product performance THEN the system SHALL indicate revenue from wholesale vs regular sales
5. WHEN generating reports THEN the system SHALL allow filtering by products with or without wholesale pricing

### Requirement 6

**User Story:** As a system user, I want wholesale pricing to integrate with the existing FIFO inventory system, so that pricing follows proper inventory rotation principles.

#### Acceptance Criteria

1. WHEN applying wholesale pricing THEN the system SHALL use FIFO methodology to determine which stock entries to consume
2. WHEN stock entries have different wholesale prices THEN the system SHALL apply the price from the specific stock entry being consumed
3. WHEN a sale spans multiple stock entries THEN the system SHALL apply the appropriate wholesale price for each consumed stock entry
4. WHEN stock entries expire or are rotated THEN the system SHALL maintain wholesale pricing integrity
5. WHEN calculating inventory value THEN the system SHALL consider wholesale pricing in valuation reports