-- Migration: Add min_stock column to products table
-- Purpose: Allow custom minimum stock threshold per product for alerts
-- Date: 2025-12-12

BEGIN;

-- Step 1: Add min_stock column with default value
ALTER TABLE products 
ADD COLUMN min_stock INTEGER DEFAULT 10 NOT NULL;

-- Step 2: Ensure all existing products have the default value
UPDATE products 
SET min_stock = 10 
WHERE min_stock IS NULL;

-- Step 3: Add constraint to validate min_stock is non-negative
ALTER TABLE products 
ADD CONSTRAINT min_stock_non_negative CHECK (min_stock >= 0);

COMMIT;

-- Verification query (run after migration)
-- SELECT id, name, min_stock FROM products LIMIT 10;
