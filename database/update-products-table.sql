-- Actualizar tabla products para incluir relaciones con brands y product_types
-- Este script agrega las claves foráneas manteniendo la integridad de datos

-- Agregar columnas de claves foráneas a la tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS type_id UUID REFERENCES product_types(id),
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES brands(id);

-- Crear índices para optimizar las consultas con JOINs
CREATE INDEX IF NOT EXISTS idx_products_type_id ON products(type_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);

-- Índice compuesto para consultas que filtren por tipo y marca
CREATE INDEX IF NOT EXISTS idx_products_type_brand ON products(type_id, brand_id);

-- Comentarios para documentación
COMMENT ON COLUMN products.type_id IS 'Referencia a la categoría/tipo del producto';
COMMENT ON COLUMN products.brand_id IS 'Referencia a la marca del producto';

-- Verificar la estructura actualizada
\d products;