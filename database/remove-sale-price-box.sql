-- Script para eliminar la columna sale_price_box de la tabla stock_entries
-- Este script elimina completamente el soporte para precios por caja

-- Eliminar la columna sale_price_box de la tabla stock_entries
ALTER TABLE stock_entries DROP COLUMN IF EXISTS sale_price_box;

-- Verificar que la columna fue eliminada
-- (Opcional: descomentar para verificar)
-- SELECT column_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'stock_entries' AND column_name = 'sale_price_box';

-- Mensaje de confirmación
SELECT 'Columna sale_price_box eliminada exitosamente de la tabla stock_entries' as resultado;