-- Migración para renombrar remaining_quantity a current_quantity en la tabla stock_entries
-- Fecha: 2024
-- Descripción: Cambiar el nombre de la columna remaining_quantity a current_quantity para mayor claridad

BEGIN;

-- Renombrar la columna remaining_quantity a current_quantity
ALTER TABLE stock_entries 
RENAME COLUMN remaining_quantity TO current_quantity;

-- Verificar que el cambio se aplicó correctamente
-- Esta consulta debería mostrar la nueva columna current_quantity
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'stock_entries' 
AND column_name = 'current_quantity';

COMMIT;

-- Nota: Si necesitas revertir este cambio, ejecuta:
-- ALTER TABLE stock_entries RENAME COLUMN current_quantity TO remaining_quantity;