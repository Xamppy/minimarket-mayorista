-- Crear sistema de tablas relacionales para categorización avanzada
-- Este script implementa una estructura escalable con integridad referencial

-- Tabla de tipos/categorías de productos
CREATE TABLE IF NOT EXISTS product_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de marcas
CREATE TABLE IF NOT EXISTS brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insertar categorías básicas para minimarket
INSERT INTO product_types (name, description) VALUES 
    ('Bebidas', 'Bebidas alcohólicas y no alcohólicas'),
    ('Snacks', 'Aperitivos y golosinas'),
    ('Lácteos', 'Productos lácteos y derivados'),
    ('Panadería', 'Pan, pasteles y productos de panadería'),
    ('Limpieza', 'Productos de limpieza e higiene'),
    ('Cuidado Personal', 'Productos de higiene personal'),
    ('Enlatados', 'Productos enlatados y conservas'),
    ('Cereales', 'Cereales y productos de desayuno'),
    ('Condimentos', 'Especias, salsas y condimentos'),
    ('Otros', 'Productos varios')
ON CONFLICT (name) DO NOTHING;

-- Insertar marcas comunes (se pueden agregar más según necesidad)
INSERT INTO brands (name, description) VALUES 
    ('Coca-Cola', 'Bebidas gaseosas'),
    ('Pepsi', 'Bebidas gaseosas'),
    ('Nestlé', 'Productos alimenticios diversos'),
    ('Unilever', 'Productos de cuidado personal y limpieza'),
    ('Procter & Gamble', 'Productos de cuidado personal'),
    ('Kelloggs', 'Cereales y snacks'),
    ('Danone', 'Productos lácteos'),
    ('Bimbo', 'Productos de panadería'),
    ('Sin Marca', 'Productos genéricos o sin marca específica')
ON CONFLICT (name) DO NOTHING;

-- Crear índices para optimizar rendimiento
CREATE INDEX IF NOT EXISTS idx_product_types_name ON product_types(name);
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar timestamps automáticamente
CREATE TRIGGER update_product_types_updated_at 
    BEFORE UPDATE ON product_types 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brands_updated_at 
    BEFORE UPDATE ON brands 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE product_types IS 'Categorías/tipos de productos para clasificación';
COMMENT ON TABLE brands IS 'Marcas de productos para organización';
COMMENT ON COLUMN product_types.id IS 'Clave primaria UUID única';
COMMENT ON COLUMN brands.id IS 'Clave primaria UUID única';