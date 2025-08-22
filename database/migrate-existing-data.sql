-- Script de migración de datos existentes a la nueva estructura relacional
-- Este script mapea los datos actuales a las nuevas tablas relacionales

-- Primero, verificar qué marcas únicas existen en los productos actuales
SELECT DISTINCT brand_name FROM products WHERE brand_name IS NOT NULL AND brand_name != '';

-- Insertar marcas faltantes basadas en los datos existentes
INSERT INTO brands (name, description)
SELECT DISTINCT 
    COALESCE(NULLIF(brand_name, ''), 'Sin Marca') as name,
    'Marca migrada desde datos existentes' as description
FROM products 
WHERE brand_name IS NOT NULL 
    AND brand_name != ''
    AND NOT EXISTS (
        SELECT 1 FROM brands b 
        WHERE b.name = COALESCE(NULLIF(products.brand_name, ''), 'Sin Marca')
    );

-- Actualizar brand_id en productos basándose en brand_name existente
UPDATE products 
SET brand_id = (
    SELECT b.id 
    FROM brands b 
    WHERE b.name = COALESCE(NULLIF(products.brand_name, ''), 'Sin Marca')
)
WHERE brand_id IS NULL;

-- Para productos sin marca, asignar 'Sin Marca'
UPDATE products 
SET brand_id = (
    SELECT b.id 
    FROM brands b 
    WHERE b.name = 'Sin Marca'
)
WHERE brand_id IS NULL;

-- Asignar categoría por defecto 'Otros' a productos sin tipo
UPDATE products 
SET product_type_id = (
    SELECT pt.id 
    FROM product_types pt 
    WHERE pt.name = 'Otros'
)
WHERE product_type_id IS NULL;

-- Intentar categorizar automáticamente algunos productos basándose en nombres comunes
-- Bebidas
UPDATE products 
SET product_type_id = (
    SELECT pt.id FROM product_types pt WHERE pt.name = 'Bebidas'
)
WHERE product_type_id = (
    SELECT pt.id FROM product_types pt WHERE pt.name = 'Otros'
)
AND (
    LOWER(name) LIKE '%coca%' OR 
    LOWER(name) LIKE '%pepsi%' OR 
    LOWER(name) LIKE '%agua%' OR 
    LOWER(name) LIKE '%jugo%' OR 
    LOWER(name) LIKE '%refresco%' OR
    LOWER(name) LIKE '%gaseosa%'
);

-- Snacks
UPDATE products 
SET product_type_id = (
    SELECT pt.id FROM product_types pt WHERE pt.name = 'Snacks'
)
WHERE product_type_id = (
    SELECT pt.id FROM product_types pt WHERE pt.name = 'Otros'
)
AND (
    LOWER(name) LIKE '%chip%' OR 
    LOWER(name) LIKE '%galleta%' OR 
    LOWER(name) LIKE '%dulce%' OR 
    LOWER(name) LIKE '%chocolate%' OR
    LOWER(name) LIKE '%caramelo%'
);

-- Lácteos
UPDATE products 
SET product_type_id = (
    SELECT pt.id FROM product_types pt WHERE pt.name = 'Lácteos'
)
WHERE product_type_id = (
    SELECT pt.id FROM product_types pt WHERE pt.name = 'Otros'
)
AND (
    LOWER(name) LIKE '%leche%' OR 
    LOWER(name) LIKE '%yogur%' OR 
    LOWER(name) LIKE '%queso%' OR 
    LOWER(name) LIKE '%mantequilla%'
);

-- Verificar resultados de la migración
SELECT 
    'Productos totales' as descripcion,
    COUNT(*) as cantidad
FROM products
UNION ALL
SELECT 
    'Productos con marca asignada' as descripcion,
    COUNT(*) as cantidad
FROM products 
WHERE brand_id IS NOT NULL
UNION ALL
SELECT 
    'Productos con tipo asignado' as descripcion,
    COUNT(*) as cantidad
FROM products 
WHERE product_type_id IS NOT NULL;

-- Mostrar distribución por categorías
SELECT 
    pt.name as categoria,
    COUNT(p.id) as productos
FROM product_types pt
LEFT JOIN products p ON p.product_type_id = pt.id
GROUP BY pt.name, pt.id
ORDER BY productos DESC;

-- Mostrar distribución por marcas
SELECT 
    b.name as marca,
    COUNT(p.id) as productos
FROM brands b
LEFT JOIN products p ON p.brand_id = b.id
GROUP BY b.name, b.id
ORDER BY productos DESC
LIMIT 10;