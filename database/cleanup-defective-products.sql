-- ============================================================================
-- SCRIPT DE LIMPIEZA: Eliminar Productos Defectuosos y Datos Asociados
-- Minimarket Don Ale - Etapa de Desarrollo
-- Fecha: 2025-12-09
-- ============================================================================

-- IMPORTANTE: Ejecutar este script en una transacción para poder revertir si algo sale mal
BEGIN;

-- ============================================================================
-- PASO 0: VISTA PREVIA - Ver qué se va a eliminar (NO ELIMINA NADA)
-- ============================================================================

-- Ver productos defectuosos (sin barcode o sin precio)
SELECT 
    p.id AS product_id, 
    p.name AS product_name, 
    p.barcode, 
    p.unit_price,
    p.created_at
FROM products p
WHERE p.barcode IS NULL 
   OR p.unit_price IS NULL 
   OR p.unit_price <= 0
ORDER BY p.created_at DESC;

-- Ver sale_items que serán eliminados
SELECT 
    si.id AS sale_item_id,
    si.sale_id,
    p.name AS product_name,
    si.quantity,
    si.unit_price AS sale_price
FROM sale_items si
JOIN products p ON si.product_id = p.id
WHERE p.barcode IS NULL 
   OR p.unit_price IS NULL 
   OR p.unit_price <= 0;

-- Ver ventas que quedarán vacías después de eliminar los sale_items
SELECT DISTINCT s.id AS sale_id, s.created_at, s.total_amount
FROM sales s
JOIN sale_items si ON s.id = si.sale_id
JOIN products p ON si.product_id = p.id
WHERE p.barcode IS NULL 
   OR p.unit_price IS NULL 
   OR p.unit_price <= 0;

-- ============================================================================
-- PASO 1: Eliminar sale_items asociados a productos defectuosos
-- ============================================================================

DELETE FROM sale_items 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE barcode IS NULL 
       OR unit_price IS NULL 
       OR unit_price <= 0
);

-- Ver cuántos sale_items fueron eliminados
-- (El resultado se muestra automáticamente con el DELETE)

-- ============================================================================
-- PASO 2: Eliminar ventas (sales) que quedaron sin ítems
-- ============================================================================

DELETE FROM sales 
WHERE id NOT IN (
    SELECT DISTINCT sale_id FROM sale_items
);

-- ============================================================================
-- PASO 3: Eliminar stock_entries asociados a productos defectuosos
-- ============================================================================

DELETE FROM stock_entries 
WHERE product_id IN (
    SELECT id FROM products 
    WHERE barcode IS NULL 
       OR unit_price IS NULL 
       OR unit_price <= 0
);

-- ============================================================================
-- PASO 4: Eliminar los productos defectuosos
-- ============================================================================

DELETE FROM products 
WHERE barcode IS NULL 
   OR unit_price IS NULL 
   OR unit_price <= 0;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que no queden productos defectuosos
SELECT COUNT(*) AS productos_defectuosos_restantes
FROM products 
WHERE barcode IS NULL 
   OR unit_price IS NULL 
   OR unit_price <= 0;

-- Ver productos restantes (deberían estar todos completos)
SELECT id, name, barcode, unit_price, wholesale_price
FROM products 
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- CONFIRMAR O REVERTIR
-- ============================================================================

-- Si todo se ve bien, ejecuta:
COMMIT;

-- Si algo salió mal y quieres revertir, ejecuta:
-- ROLLBACK;
