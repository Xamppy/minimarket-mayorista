# Design Document

## Overview

This design document outlines the implementation of brand and product type management functionality for the MiniMarket Pro system. The feature will allow administrators to create, read, update, and delete brands (marcas) and product types (tipos) that serve as categorization options for products. The design leverages the existing Next.js 15 App Router architecture, Supabase database, and established UI patterns.

## Architecture

### Database Layer
The system already has `brands` and `product_types` tables in the Supabase database, as evidenced by the existing queries in the admin dashboard. The current schema includes:

**Brands Table:**
- `id`: Primary key (integer)
- `name`: Brand name (string, unique)
- `created_at`: Timestamp

**Product Types Table:**
- `id`: Primary key (integer) 
- `name`: Type name (string, unique)
- `created_at`: Timestamp

**Products Table (existing):**
- `brand_id`: Foreign key to brands table
- `type_id`: Foreign key to product_types table

### Application Layer
The feature will extend the existing admin dashboard with dedicated management interfaces for brands and types, following the established patterns:

- **Server Actions**: Handle CRUD operations using the existing pattern in `app/dashboard/admin/actions.ts`
- **React Components**: Create reusable components following the existing component structure
- **UI Integration**: Extend the current AdminDashboard with new management sections

## Components and Interfaces

### 1. Brand Management Components

**BrandManagement.tsx**
- Main container component for brand operations
- Displays list of existing brands
- Provides create/edit/delete functionality
- Integrates with server actions for data operations

**BrandForm.tsx**
- Reusable form component for creating and editing brands
- Handles validation (required, unique name)
- Supports both create and update modes

**BrandList.tsx**
- Displays brands in a table format
- Provides edit and delete actions for each brand
- Shows creation date and usage count (if applicable)

### 2. Product Type Management Components

**ProductTypeManagement.tsx**
- Main container component for product type operations
- Displays list of existing product types
- Provides create/edit/delete functionality
- Mirrors brand management structure

**ProductTypeForm.tsx**
- Reusable form component for creating and editing product types
- Handles validation (required, unique name)
- Supports both create and update modes

**ProductTypeList.tsx**
- Displays product types in a table format
- Provides edit and delete actions for each type
- Shows creation date and usage count

### 3. Integration Components

**CategoryManagementTabs.tsx**
- Tab-based interface to switch between brand and type management
- Provides unified navigation for category management
- Integrates into existing admin dashboard

## Data Models

### TypeScript Interfaces

```typescript
interface Brand {
  id: string;
  name: string;
  created_at: string;
}

interface ProductType {
  id: string;
  name: string;
  created_at: string;
}

interface CategoryFormData {
  id?: string;
  name: string;
}

interface CategoryWithUsage extends Brand | ProductType {
  product_count: number;
}
```

### Server Action Signatures

```typescript
// Brand operations
async function createBrand(formData: FormData): Promise<void>
async function updateBrand(formData: FormData): Promise<void>
async function deleteBrand(brandId: string): Promise<void>
async function getBrandsWithUsage(): Promise<CategoryWithUsage[]>

// Product type operations
async function createProductType(formData: FormData): Promise<void>
async function updateProductType(formData: FormData): Promise<void>
async function deleteProductType(typeId: string): Promise<void>
async function getProductTypesWithUsage(): Promise<CategoryWithUsage[]>
```

## Error Handling

### Validation Rules
- **Name Required**: Both brand and type names must be non-empty strings
- **Uniqueness**: Names must be unique within their respective tables
- **Length Limits**: Names should be between 1-100 characters
- **Sanitization**: Trim whitespace and prevent XSS

### Error Scenarios
1. **Duplicate Names**: Display user-friendly error when attempting to create duplicates
2. **Database Errors**: Handle connection issues and constraint violations
3. **Permission Errors**: Ensure only administrators can perform operations
4. **Deletion Constraints**: Prevent deletion of categories with associated products

### Error Display
- Use existing error handling patterns from the current admin actions
- Display errors using toast notifications or inline form errors
- Provide clear, actionable error messages in Spanish

## Testing Strategy

### Unit Tests
- **Form Validation**: Test client-side validation logic
- **Server Actions**: Test CRUD operations with mock data
- **Component Rendering**: Test component states and user interactions
- **Error Handling**: Test error scenarios and edge cases

### Integration Tests
- **Database Operations**: Test actual database CRUD operations
- **Form Submissions**: Test end-to-end form submission flows
- **Permission Checks**: Verify administrator-only access
- **Data Consistency**: Test referential integrity with products

### User Acceptance Testing
- **Create Categories**: Verify administrators can create brands and types
- **Edit Categories**: Test editing existing categories
- **Delete Prevention**: Confirm deletion is blocked for categories in use
- **Product Association**: Verify new categories appear in product forms
- **UI Responsiveness**: Test on different screen sizes

## Implementation Approach

### Phase 1: Server Actions and Database Operations
- Implement CRUD server actions for brands and product types
- Add validation and error handling
- Test database operations

### Phase 2: Core Components
- Create form components for brand and type management
- Implement list components with edit/delete functionality
- Add client-side validation

### Phase 3: UI Integration
- Create tab-based management interface
- Integrate into existing admin dashboard
- Add navigation and routing

### Phase 4: Enhanced Features
- Add usage count display (number of products per category)
- Implement search and filtering
- Add bulk operations if needed

## Security Considerations

### Authentication and Authorization
- Leverage existing middleware for session management
- Verify administrator role using existing `get_user_role` RPC function
- Protect all server actions with authentication checks

### Data Validation
- Server-side validation for all inputs
- SQL injection prevention through Supabase client
- XSS prevention through proper data sanitization

### Database Constraints
- Maintain existing foreign key relationships
- Use database-level unique constraints
- Implement proper cascade rules for data integrity

## Performance Considerations

### Database Optimization
- Use existing indexes on name columns for uniqueness
- Implement efficient queries for category listing
- Consider caching for frequently accessed data

### UI Performance
- Use React's built-in optimization patterns
- Implement proper loading states
- Minimize re-renders through proper state management

### Data Loading
- Follow existing patterns for server-side data fetching
- Use revalidatePath for cache invalidation
- Implement optimistic updates where appropriate