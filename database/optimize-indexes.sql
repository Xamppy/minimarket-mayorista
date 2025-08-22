-- Script de optimización de índices para alto rendimiento
-- Minimarket Don Ale - Sistema Relacional (Versión Corregida)

-- =====================================================
-- ÍNDICES PARA TABLA SALES (Ventas)
-- =====================================================

-- Índice compuesto para consultas de ventas por fecha y usuario
CREATE INDEX IF NOT EXISTS idx_sales_date_user 
ON sales(sale_date, user_id);

-- Índice para total de ventas (ordenamiento por monto)
CREATE INDEX IF NOT EXISTS idx_sales_total 
ON sales(total_amount DESC);

-- Índice para consultas por fecha (reportes)
CREATE INDEX IF NOT EXISTS idx_sales_date_desc 
ON sales(sale_date DESC);

-- =====================================================
-- ÍNDICES PARA TABLA SALE_ITEMS (Detalles de venta)
-- =====================================================

-- Índice compuesto para consultas de productos más vendidos
CREATE INDEX IF NOT EXISTS idx_sale_items_product_quantity 
ON sale_items(product_id, quantity);

-- =====================================================
-- ÍNDICES PARA TABLA PRODUCTS (Productos)
-- =====================================================

-- Índice compuesto para filtros avanzados (tipo y marca)
CREATE INDEX IF NOT EXISTS idx_products_type_brand_filter 
ON products(product_type_id, brand_id) 
WHERE product_type_id IS NOT NULL AND brand_id IS NOT NULL;

-- Índice para productos con precio (productos activos)
CREATE INDEX IF NOT EXISTS idx_products_with_price 
ON products(id, name) 
WHERE unit_price > 0;

-- =====================================================
-- ÍNDICES PARA TABLAS RELACIONALES
-- =====================================================

-- Índice único para nombres de tipos de producto (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_types_name_lower 
ON product_types(LOWER(name));

-- Índice único para nombres de marcas (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_brands_name_lower 
ON brands(LOWER(name));

-- =====================================================
-- ÍNDICES PARA TABLA USERS (Usuarios)
-- =====================================================

-- Índice único para email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower 
ON users(LOWER(email));

-- Índice para usuarios por rol
CREATE INDEX IF NOT EXISTS idx_users_role 
ON users(role);

-- =====================================================
-- ESTADÍSTICAS Y ANÁLISIS
-- =====================================================

-- Actualizar estadísticas de todas las tablas para el optimizador
ANALYZE sales;
ANALYZE sale_items;
ANALYZE products;
ANALYZE product_types;
ANALYZE brands;
ANALYZE users;

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================

-- Mostrar todos los índices de las tablas principales
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('sales', 'sale_items', 'products', 'product_types', 'brands', 'users')
ORDER BY tablename, indexname;

-- Mostrar tamaño de índices para monitoreo
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Mensaje de finalización
SELECT 'Optimización de índices completada exitosamente.' as mensaje;
SELECT 'Sistema preparado para alto rendimiento con grandes volúmenes de datos.' as estado;