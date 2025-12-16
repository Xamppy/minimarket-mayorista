-- Fix wholesale pricing functions to match actual database schema
-- The functions were referencing columns that don't exist in the current schema

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_wholesale_pricing_stats();
DROP FUNCTION IF EXISTS get_wholesale_vs_regular_sales(timestamp without time zone, timestamp without time zone);

-- Recreate get_wholesale_pricing_stats with correct column references
CREATE OR REPLACE FUNCTION get_wholesale_pricing_stats()
RETURNS TABLE(
  total_products_with_wholesale integer,
  total_products_without_wholesale integer,
  avg_wholesale_discount numeric,
  total_wholesale_sales integer,
  total_regular_sales integer
)
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Since the current schema doesn't have wholesale_price columns,
  -- we'll return default values for now
  RETURN QUERY
  SELECT 
    0::integer as total_products_with_wholesale,
    COUNT(*)::integer as total_products_without_wholesale,
    0::numeric as avg_wholesale_discount,
    0::integer as total_wholesale_sales,
    COUNT(si.*)::integer as total_regular_sales
  FROM products p
  LEFT JOIN sale_items si ON p.id = si.product_id;
END;
$$;

-- Recreate get_wholesale_vs_regular_sales with correct column references
CREATE OR REPLACE FUNCTION get_wholesale_vs_regular_sales(
  start_date timestamp without time zone,
  end_date timestamp without time zone
)
RETURNS TABLE(
  sale_type text,
  total_sales integer,
  total_amount numeric,
  avg_sale_amount numeric,
  total_items_sold integer
)
SECURITY INVOKER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Since we don't have sale_type column in the current schema,
  -- we'll return all sales as 'regular' type
  RETURN QUERY
  SELECT 
    'regular'::text as sale_type,
    COUNT(DISTINCT s.id)::integer as total_sales,
    SUM(si.unit_price * si.quantity) as total_amount,
    AVG(si.unit_price * si.quantity) as avg_sale_amount,
    SUM(si.quantity)::integer as total_items_sold
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.sale_date >= start_date AND s.sale_date <= end_date;
END;
$$;

-- Add a comment explaining the current limitation
COMMENT ON FUNCTION get_wholesale_pricing_stats() IS 'Returns wholesale pricing statistics. Currently returns default values as wholesale pricing columns are not yet implemented in the schema.';
COMMENT ON FUNCTION get_wholesale_vs_regular_sales(timestamp without time zone, timestamp without time zone) IS 'Returns sales comparison. Currently treats all sales as regular type as wholesale pricing is not yet implemented in the schema.';