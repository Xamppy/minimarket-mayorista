-- Migración: Agregar columnas de descuento a tabla sales
-- Ejecutar: psql -U usuario -d database -f add-discount-columns.sql
-- Fecha: 2025-12-10

-- Agregar columna para tipo de descuento
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT NULL;

-- Agregar columna para valor del descuento
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12, 2) DEFAULT NULL;

-- Comentarios descriptivos
COMMENT ON COLUMN sales.discount_type IS 'Tipo de descuento aplicado: amount (monto fijo) o percentage (porcentaje)';
COMMENT ON COLUMN sales.discount_value IS 'Valor del descuento: monto en pesos o porcentaje según discount_type';

-- Verificar columnas agregadas
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'sales' 
AND column_name IN ('discount_type', 'discount_value');
