-- Crear tabla para códigos de barras generados
-- Sistema independiente para generar y almacenar códigos de barras personalizados

-- Tabla de códigos de barras generados
CREATE TABLE IF NOT EXISTS generated_barcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(20) NOT NULL UNIQUE, -- Formato: "1 111111 111111" (sin espacios en BD)
    name VARCHAR(255) NOT NULL, -- Nombre del producto/promoción
    description TEXT, -- Descripción opcional
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID, -- Referencia al usuario que lo creó (opcional)
    is_active BOOLEAN DEFAULT true -- Para soft delete
);

-- Crear índices para optimizar rendimiento
CREATE INDEX IF NOT EXISTS idx_generated_barcodes_barcode ON generated_barcodes(barcode);
CREATE INDEX IF NOT EXISTS idx_generated_barcodes_name ON generated_barcodes(name);
CREATE INDEX IF NOT EXISTS idx_generated_barcodes_created_at ON generated_barcodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_barcodes_active ON generated_barcodes(is_active) WHERE is_active = true;

-- Índice para búsqueda por nombre (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_generated_barcodes_name_lower ON generated_barcodes(LOWER(name));

-- Función para actualizar timestamp automáticamente (reutilizando la existente)
CREATE TRIGGER update_generated_barcodes_updated_at 
    BEFORE UPDATE ON generated_barcodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE generated_barcodes IS 'Códigos de barras generados para productos y promociones especiales';
COMMENT ON COLUMN generated_barcodes.id IS 'Clave primaria UUID única';
COMMENT ON COLUMN generated_barcodes.barcode IS 'Código de barras en formato GS1 Chile (sin espacios)';
COMMENT ON COLUMN generated_barcodes.name IS 'Nombre del producto o promoción';
COMMENT ON COLUMN generated_barcodes.description IS 'Descripción opcional del código de barras';
COMMENT ON COLUMN generated_barcodes.created_by IS 'UUID del usuario que creó el código';
COMMENT ON COLUMN generated_barcodes.is_active IS 'Estado activo del código de barras';

-- Función para generar código de barras con formato GS1 Chile
CREATE OR REPLACE FUNCTION generate_gs1_chile_barcode()
RETURNS VARCHAR(13) AS $$
DECLARE
    prefix_country VARCHAR(3) := '780'; -- Prefijo de Chile
    prefix_company VARCHAR(6) := '123456'; -- Prefijo empresa (configurable)
    product_code VARCHAR(3);
    check_digit INTEGER;
    full_code VARCHAR(12);
    sum_odd INTEGER := 0;
    sum_even INTEGER := 0;
    i INTEGER;
BEGIN
    -- Generar código de producto aleatorio de 3 dígitos
    product_code := LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
    
    -- Construir código sin dígito verificador
    full_code := prefix_country || prefix_company || product_code;
    
    -- Calcular dígito verificador según algoritmo GS1
    FOR i IN 1..12 LOOP
        IF i % 2 = 1 THEN
            sum_odd := sum_odd + CAST(SUBSTRING(full_code, i, 1) AS INTEGER);
        ELSE
            sum_even := sum_even + CAST(SUBSTRING(full_code, i, 1) AS INTEGER);
        END IF;
    END LOOP;
    
    check_digit := (10 - ((sum_odd + sum_even * 3) % 10)) % 10;
    
    RETURN full_code || check_digit::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Función para formatear código de barras para visualización
CREATE OR REPLACE FUNCTION format_barcode_display(barcode VARCHAR(13))
RETURNS VARCHAR(20) AS $$
BEGIN
    -- Formato: "1 111111 111111" -> "7 801234 56789 0"
    RETURN SUBSTRING(barcode, 1, 1) || ' ' || 
           SUBSTRING(barcode, 2, 6) || ' ' || 
           SUBSTRING(barcode, 8, 5) || ' ' || 
           SUBSTRING(barcode, 13, 1);
END;
$$ LANGUAGE plpgsql;

-- Mensaje de finalización
SELECT 'Tabla generated_barcodes creada exitosamente con funciones GS1 Chile.' as mensaje;