---
inclusion: always
---

# MiniMarket Pro - Product & Business Rules

**MiniMarket Pro** is an inventory management system for small retail businesses with role-based access and FIFO stock management.

## Core Business Rules

### Inventory Management
- **FIFO Principle**: All stock operations must follow First-In-First-Out methodology
- **Unit Formats**: Support unit, box, display, pallet with proper conversion ratios
- **Stock Validation**: Prevent overselling through real-time stock calculations
- **Expiration Tracking**: Mandatory expiration dates for perishable items

### User Roles & Permissions
- **Admin Role**: Full CRUD access to products, stock entries, and system configuration
- **Seller Role**: Read-only product access, sales processing, limited dashboard features
- **Authentication**: JWT-based with role validation on all protected routes

### Product Data Model
- Products require: name, brand, type, pricing (unit/wholesale), stock quantities
- Stock entries must include: quantity, expiration date, purchase price, supplier info
- Sales must validate: available stock, FIFO rotation, pricing calculations

## Development Conventions

### API Design Patterns
- Use Server Actions for mutations (stock entries, sales processing)
- Implement RPC functions for complex business logic (FIFO calculations, stock updates)
- Return structured responses with success/error states and detailed messages

### Data Validation
- Validate all numeric inputs (quantities, prices) for positive values
- Enforce required fields at both client and server levels
- Use TypeScript strict mode for compile-time type safety

### Error Handling
- Provide user-friendly error messages for business rule violations
- Log detailed errors server-side for debugging
- Handle database constraint violations gracefully

### UI/UX Guidelines
- Show real-time stock levels in product displays
- Highlight low stock and expired items with visual indicators
- Provide clear feedback for successful operations and errors
- Use loading states for async operations

## Critical Business Logic

### Stock Entry Processing
1. Validate expiration date is future-dated
2. Calculate total cost and unit costs
3. Update product stock quantities
4. Maintain FIFO order in database

### Sales Processing
1. Validate sufficient stock availability
2. Apply FIFO rotation for stock deduction
3. Calculate pricing based on unit format
4. Update inventory levels atomically
5. Generate receipt/ticket data

### Pricing Logic
- Support both unit and wholesale pricing tiers
- Calculate box/display/pallet prices from unit conversions
- Apply role-based pricing visibility (sellers see retail, admins see both)