import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { parse } from 'csv-parse/sync';
import { withVendedorAuth } from '../../../utils/auth/middleware';

// Configuración de la Base de Datos
const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  client_encoding: 'UTF8'
};

// Mapas para caché de IDs (evitar consultas repetitivas en el mismo loop)
type CacheMap = Map<string, any>;

// export async function POST(request: NextRequest) {
//   return withVendedorAuth(request, async (req, user) => {
// export async function POST(request: NextRequest) {
//   return withVendedorAuth(request, async (req, user) => {
export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    const results = {
      total: 0,
      created: 0,
      errors: [] as string[]
    };

    try {
      await client.connect();
      
      // 1. Obtener el archivo CSV del FormData
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: { message: 'No se procesó ningún archivo', status: 400 } },
          { status: 400 }
        );
      }

      // 2. Leer contenido del archivo
      const buffer = Buffer.from(await file.arrayBuffer());
      const content = buffer.toString('utf-8');

      // 3. Parsear CSV
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      results.total = records.length;
      
      // Cache local para esta importación
      const brandsCache: CacheMap = new Map();
      const typesCache: CacheMap = new Map();

      // INICIO TRANSACCIÓN GENERAL (Opcional: Podríamos hacer una por fila si queremos que fallen individualmente sin rollback total)
      // El requerimiento dice: "si una fila falla, que no detenga todo el proceso".
      // Por lo tanto, NO usaremos una transacción global gigante, sino manejo per-row.

      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 2; // +1 por 0-index, +1 por header
        
        try {
          // --- VALIDACIÓN BÁSICA DE COLUMNAS ---
          // Requeridos: Nombre, CodigoBarra, Marca, Tipo
          if (!row.Nombre || !row.CodigoBarra || !row.Marca || !row.Tipo) {
            throw new Error('Faltan datos obligatorios (Nombre, Barcode, Marca o Tipo)');
          }

          // --- 1. MARCA (Find or Create) ---
          const brandName = row.Marca.trim();
          let brandId;
          
          if (brandsCache.has(brandName.toLowerCase())) {
            brandId = brandsCache.get(brandName.toLowerCase());
          } else {
            // Buscar en BD
            const brandRes = await client.query('SELECT id FROM brands WHERE LOWER(name) = LOWER($1)', [brandName]);
            if (brandRes.rows.length > 0) {
              brandId = brandRes.rows[0].id;
            } else {
              // Crear Marca
              const newBrand = await client.query('INSERT INTO brands (name) VALUES ($1) RETURNING id', [brandName]);
              brandId = newBrand.rows[0].id;
            }
            brandsCache.set(brandName.toLowerCase(), brandId);
          }

          // --- 2. TIPO (Find or Create) ---
          const typeName = row.Tipo.trim();
          let typeId;

          if (typesCache.has(typeName.toLowerCase())) {
            typeId = typesCache.get(typeName.toLowerCase());
          } else {
            // Buscar en BD
            // Nota: product_types tiene UUID
            const typeRes = await client.query('SELECT id FROM product_types WHERE LOWER(name) = LOWER($1)', [typeName]);
            if (typeRes.rows.length > 0) {
              typeId = typeRes.rows[0].id;
            } else {
              // Crear Tipo
              // Asumimos que la tabla genera UUID automáticamente o necesitamos generarlo?
              // Verifiquemos si product_types tiene default gen_random_uuid().
              // Si falla, intentaremos insertar sin ID para ver si el default funciona.
              
              // Primero intentamos insert simple confiando en el default
              try {
                const newType = await client.query('INSERT INTO product_types (name) VALUES ($1) RETURNING id', [typeName]);
                typeId = newType.rows[0].id;
              } catch (e) {
                // Si falla, podríamos necesitar generar el UUID desde código, pero Next.js v15/Node crypto lo soporta.
                // Por ahora asumimos que la BD lo maneja (standard en Postgres moderno).
                throw new Error(`Error creando tipo ${typeName}: ${(e as Error).message}`);
              }
            }
            typesCache.set(typeName.toLowerCase(), typeId);
          }

          // --- 3. PRODUCTO ---
          // Verificar duplicados
          const existingProduct = await client.query(
            'SELECT id FROM products WHERE barcode = $1 OR LOWER(name) = LOWER($2)', 
            [row.CodigoBarra.trim(), row.Nombre.trim()]
          );

          let productId;
          
          if (existingProduct.rows.length > 0) {
             // Opcional: Podríamos actualizar, pero el req dice "poblar base inicial".
             // Asumiremos que si existe, lo saltamos o usamos su ID para cargar stock.
             // Para simplificar y reportar:
             // results.errors.push(`Fila ${rowNum}: Producto ya existe (Barcode/Nombre) - ${row.Nombre}`);
             // continue;
             
             // ALTERNATIVA: Usar el existente para agregarle stock si viene
             productId = existingProduct.rows[0].id;
          } else {
            // Crear Producto
            const insertProd = await client.query(`
              INSERT INTO products (
                name, barcode, brand_id, brand_name, type_id, product_type_id
              ) VALUES ($1, $2, $3, $4, $5, $5)
              RETURNING id
            `, [
              row.Nombre.trim(),
              row.CodigoBarra.trim(),
              brandId,
              brandName, // Legacy column support
              typeId
            ]);
            productId = insertProd.rows[0].id;
            results.created++;
          }

          // --- 4. STOCK INICIAL ---
          // Si vienen datos de stock y es > 0
          const stockInicial = parseInt(row.Stock_Inicial || '0');
          const precioCosto = parseInt(row.Precio_Costo || '0');
          const precioVenta = parseInt(row.Precio_Venta || '0');
          
          if (stockInicial > 0 && productId) {
             // Validar precios
             if (precioVenta <= 0) {
                results.errors.push(`Fila ${rowNum}: Stock no cargado. Precio Venta inválido para ${row.Nombre}`);
             } else {
                await client.query(`
                  INSERT INTO stock_entries (
                    product_id, 
                    quantity,
                    current_quantity,
                    initial_quantity,
                    barcode,
                    purchase_price,
                    sale_price_unit,
                    sale_price_wholesale,
                    expiration_date,
                    entry_date
                  ) VALUES ($1, $2, $2, $2, $3, $4, $5, 0, $6, NOW())
                `, [
                  productId,
                  stockInicial,
                  row.CodigoBarra.trim(),
                  precioCosto,
                  precioVenta,
                  row.Fecha_Vencimiento || null
                ]);
             }
          }

        } catch (rowError) {
          console.error(`Error en fila ${rowNum}:`, rowError);
          results.errors.push(`Fila ${rowNum} (${row.Nombre || 'Desconocido'}): ${(rowError as Error).message}`);
        }
      }

      return NextResponse.json({
        message: `Proceso finalizado. Creados: ${results.created}/${results.total}`,
        details: results
      });

    } catch (error) {
      console.error('Error general en import:', error);
      return NextResponse.json(
        { error: { message: 'Error procesando archivo', details: (error as Error).message } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}
