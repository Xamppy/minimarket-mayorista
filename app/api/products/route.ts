import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../utils/auth/middleware';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  client_encoding: 'UTF8'
};

// GET - Obtener todos los productos con información de stock
export async function GET(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      await client.connect();
      
      // Obtener productos con información de marcas y tipos usando las FK correctas
      const productsQuery = `
        SELECT 
          p.id,
          p.name,
          p.barcode,
          p.image_url,
          p.created_at,
          p.brand_id,
          p.type_id,
          b.name as brand_name,
          pt.name as type_name
        FROM products p
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN product_types pt ON p.type_id = pt.id
        ORDER BY p.created_at DESC
      `;
      
      const productsResult = await client.query(productsQuery);
      
      // Calcular stock total para cada producto
      const productsWithStock = await Promise.all(
        productsResult.rows.map(async (product) => {
          const stockQuery = `
            SELECT COALESCE(SUM(current_quantity), 0) as total_stock
            FROM stock_entries 
            WHERE product_id = $1 AND current_quantity > 0
          `;
          
          const stockResult = await client.query(stockQuery, [product.id]);
          const totalStock = parseInt(stockResult.rows[0]?.total_stock || '0');
          
          return {
            id: product.id,
            name: product.name,
            barcode: product.barcode || '',
            brand_id: product.brand_id,
            type_id: product.type_id,
            brand_name: product.brand_name || 'Sin marca',
            type_name: product.type_name || 'Sin tipo',
            image_url: product.image_url,
            total_stock: totalStock,
            created_at: product.created_at
          };
        })
      );
      
      return NextResponse.json({
        products: productsWithStock,
        total: productsWithStock.length
      });
      
    } catch (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json(
        { error: { message: 'Error al obtener productos', status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}

// POST - Crear nuevo producto (VERSIÓN BLINDADA)
export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    const client = new Client(dbConfig);
    
    try {
      const body = await request.json();
      
      // ========================================
      // PASO 1: DEBUG - Ver exactamente qué llega
      // ========================================
      console.log('========================================');
      console.log('📦 POST /api/products - Body recibido:');
      console.log(JSON.stringify(body, null, 2));
      console.log('========================================');
      
      // ========================================
      // PASO 2: Extraer datos con MÚLTIPLES nombres posibles
      // ========================================
      const name = body.name;
      const barcode = body.barcode;
      const imageUrl = body.image_url || body.imageUrl || null;
      
      // Brand: Buscar en múltiples nombres de campo
      const rawBrandId = body.brand_id || body.brandId || body.brand;
      
      // Type: Buscar en múltiples nombres de campo  
      const rawTypeId = body.type_id || body.typeId || body.product_type_id || body.productTypeId;
      
      console.log('📊 Valores extraídos:');
      console.log('   - name:', name);
      console.log('   - barcode:', barcode);
      console.log('   - rawBrandId:', rawBrandId, '(tipo:', typeof rawBrandId, ')');
      console.log('   - rawTypeId:', rawTypeId, '(tipo:', typeof rawTypeId, ')');
      
      // ========================================
      // PASO 3: Validaciones
      // ========================================
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'El nombre del producto es requerido', status: 400 } },
          { status: 400 }
        );
      }

      if (!barcode || typeof barcode !== 'string' || barcode.trim().length === 0) {
        return NextResponse.json(
          { error: { message: 'El código de barras es requerido', status: 400 } },
          { status: 400 }
        );
      }

      if (!rawBrandId) {
        return NextResponse.json(
          { error: { message: 'La marca es requerida (brand_id)', status: 400 } },
          { status: 400 }
        );
      }

      if (!rawTypeId) {
        return NextResponse.json(
          { error: { message: 'El tipo de producto es requerido (type_id)', status: 400 } },
          { status: 400 }
        );
      }
      
      // ========================================
      // PASO 4: Preparar valores para INSERT
      // ========================================
      
      // brand_id debe ser INTEGER
      const brandIdInt = parseInt(String(rawBrandId), 10);
      if (isNaN(brandIdInt)) {
        return NextResponse.json(
          { error: { message: `brand_id inválido: "${rawBrandId}" no se puede convertir a número`, status: 400 } },
          { status: 400 }
        );
      }
      
      // type_id es UUID (string)
      const typeIdUuid = String(rawTypeId).trim();
      
      // brand_name para columna legacy - lo obtendremos de la BD
      let brandNameLegacy = '';
      
      console.log('🔧 Valores preparados para INSERT:');
      console.log('   - brandIdInt (INTEGER):', brandIdInt);
      console.log('   - typeIdUuid (UUID):', typeIdUuid);
      
      // ========================================
      // PASO 5: Conectar y verificar duplicados
      // ========================================
      await client.connect();
      
      // Obtener el nombre real de la marca desde la tabla brands
      const brandResult = await client.query(
        'SELECT name FROM brands WHERE id = $1',
        [brandIdInt]
      );
      
      if (brandResult.rows.length > 0) {
        brandNameLegacy = brandResult.rows[0].name;
      } else {
        brandNameLegacy = `Marca ${brandIdInt}`; // Fallback
      }
      
      console.log('   - brandNameLegacy (del DB):', brandNameLegacy);
      
      const existingProduct = await client.query(
        'SELECT id FROM products WHERE LOWER(name) = LOWER($1)',
        [name.trim()]
      );
      
      if (existingProduct.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'Ya existe un producto con ese nombre', status: 409 } },
          { status: 409 }
        );
      }

      const existingBarcode = await client.query(
        'SELECT id FROM products WHERE barcode = $1',
        [barcode.trim()]
      );
      
      if (existingBarcode.rows.length > 0) {
        return NextResponse.json(
          { error: { message: 'Ya existe un producto con ese código de barras', status: 409 } },
          { status: 409 }
        );
      }
      
      // ========================================
      // PASO 6: INSERT BLINDADO Y REDUNDANTE
      // Escribimos en TODAS las columnas posibles
      // ========================================
      const insertQuery = `
        INSERT INTO products (
          name,
          barcode,
          image_url,
          brand_id,
          brand_name,
          product_type_id,
          type_id
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `;
      
      const insertValues = [
        name.trim(),           // $1: name
        barcode.trim(),        // $2: barcode
        imageUrl,              // $3: image_url
        brandIdInt,            // $4: brand_id (INTEGER) - CRÍTICO
        brandNameLegacy,       // $5: brand_name (legacy VARCHAR)
        typeIdUuid,            // $6: product_type_id (UUID)
        typeIdUuid             // $7: type_id (UUID) - Mismo valor que product_type_id
      ];
      
      console.log('📝 Ejecutando INSERT SQL:');
      console.log('   Query:', insertQuery.replace(/\s+/g, ' ').trim());
      console.log('   Valores:', insertValues);
      
      const result = await client.query(insertQuery, insertValues);
      
      console.log('✅ Producto creado exitosamente:');
      console.log(JSON.stringify(result.rows[0], null, 2));
      
      return NextResponse.json({
        product: result.rows[0],
        message: 'Producto creado exitosamente'
      }, { status: 201 });
      
    } catch (error: any) {
      console.error('❌ ERROR al crear producto:');
      console.error('   Mensaje:', error.message);
      console.error('   Stack:', error.stack);
      
      // Si el error es de columna inexistente, intentar INSERT simplificado
      if (error.message && error.message.includes('column')) {
        console.log('⚠️ Error de columna detectado. Revisar esquema de BD.');
      }
      
      return NextResponse.json(
        { error: { message: `Error al crear producto: ${error.message || 'Error desconocido'}`, status: 500 } },
        { status: 500 }
      );
    } finally {
      await client.end();
    }
  });
}