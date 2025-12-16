-- Índices de optimización para endpoints de ventas
-- Ejecutar estos comandos en PostgreSQL para mejorar el rendimiento

-- Índice compuesto para consultas FIFO de stock entries
-- Optimiza la consulta principal de handleFIFOStock
CREATE INDEX IF NOT EXISTS idx_stock_entries_product_remaining 
ON stock_entries (product_id, remaining_quantity) 
WHERE remaining_quantity > 0;

-- Índice para ordenamiento por fecha de expiración (FIFO)
CREATE INDEX IF NOT EXISTS idx_stock_entries_expiration 
ON stock_entries (expiration_date ASC NULLS LAST, entry_date ASC) 
WHERE remaining_quantity > 0;

-- Índice para consultas de ventas por vendedor y fecha
-- Optimiza el endpoint vendor-sales
CREATE INDEX IF NOT EXISTS idx_sales_user_date 
ON sales (user_id, sale_date DESC);

-- Índice para consultas de sale_items por sale_id
-- Optimiza las consultas de detalles de venta
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id 
ON sale_items (sale_id);

-- Índice para consultas de productos por ID
-- Ya debería existir como primary key, pero verificamos
CREATE INDEX IF NOT EXISTS idx_products_id 
ON products (id);

-- Índice para mejorar consultas de stock por producto
CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id 
ON stock_entries (product_id);

-- Estadísticas actualizadas para el optimizador de consultas
ANALYZE stock_entries;
ANALYZE sales;
ANALYZE sale_items;
ANALYZE products;

-- Verificar que los índices se crearon correctamente
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('stock_entries', 'sales', 'sale_items', 'products')
ORDER BY tablename, indexname;