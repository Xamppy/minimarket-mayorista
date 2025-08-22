import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../utils/auth/middleware';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function POST(request: NextRequest) {
  return withVendedorAuth(request, async (req, user) => {
    try {
      const formData = await req.formData();
      const productIdString = formData.get('productId') as string;
      const productId = parseInt(productIdString);
      const quantity = parseInt(formData.get('quantity') as string);
      const saleFormat = formData.get('saleFormat') as string;
      
      // Parámetros opcionales para venta específica por stock entry (carrito)
      const stockEntryIdString = formData.get('stockEntryId') as string;
      const stockEntryId = stockEntryIdString ? parseInt(stockEntryIdString) : null;
      const priceString = formData.get('price') as string;
      const specificPrice = priceString ? parseFloat(priceString) : null;

      // Validaciones mejoradas
      if (!productIdString || isNaN(productId) || !quantity || !saleFormat) {
        return NextResponse.json({ 
          error: {
            message: 'Faltan datos requeridos para procesar la venta',
            details: 'Se requiere ID del producto, cantidad y formato de venta',
            status: 400
          }
        }, { status: 400 });
      }

      if (quantity <= 0) {
        return NextResponse.json({ 
          error: {
            message: 'La cantidad debe ser mayor a 0',
            details: `Cantidad recibida: ${quantity}`,
            status: 400
          }
        }, { status: 400 });
      }

      if (quantity > 1000) {
        return NextResponse.json({ 
          error: {
            message: 'La cantidad es demasiado alta',
            details: 'La cantidad máxima por venta es 1000 unidades',
            status: 400
          }
        }, { status: 400 });
      }

      let client: Client | null = null;
      
      try {
        client = new Client(dbConfig);
        await client.connect();
        
        // Iniciar transacción para garantizar consistencia
        await client.query('BEGIN');

         // Obtener información del producto
         const productQuery = 'SELECT id, name FROM products WHERE id = $1';
         const productResult = await client.query(productQuery, [productId]);

         if (productResult.rows.length === 0) {
           await client.query('ROLLBACK');
           return NextResponse.json(
             {
               error: {
                 message: 'Producto no encontrado',
                 status: 404
               }
             },
             { status: 404 }
           );
         }

         const product = productResult.rows[0];

         let stockEntries, totalPrice, stockUpdates;

         if (stockEntryId && specificPrice !== null) {
           // Modo específico: usar stock entry específico (para carrito)
           const result = await handleSpecificStockEntry(client, stockEntryId, quantity, specificPrice);
           if (result.error) {
             await client.query('ROLLBACK');
             return NextResponse.json(
               {
                 error: {
                   message: result.error,
                   status: result.status || 400
                 }
               },
               { status: result.status || 400 }
             );
           }
           stockEntries = [result.stockEntry];
           totalPrice = result.totalPrice;
           stockUpdates = result.stockUpdates;
         } else {
           // Modo FIFO: usar lógica automática de stock
           const result = await handleFIFOStock(client, productId, quantity);
           if (result.error) {
             await client.query('ROLLBACK');
             return NextResponse.json(
               {
                 error: {
                   message: result.error,
                   status: result.status || 400
                 }
               },
               { status: result.status || 400 }
             );
           }
           stockEntries = result.stockEntries;
           totalPrice = result.totalPrice;
           stockUpdates = result.stockUpdates;
         }

         // Crear la venta
         const saleQuery = `
           INSERT INTO sales (user_id, total_amount)
           VALUES ($1, $2)
           RETURNING id
         `;
         
         const saleResult = await client.query(saleQuery, [user.id, totalPrice]);
         
         if (saleResult.rows.length === 0) {
           await client.query('ROLLBACK');
           return NextResponse.json(
             {
               error: {
                 message: 'Error al crear la venta',
                 status: 500
               }
             },
             { status: 500 }
           );
         }
         
         const sale = saleResult.rows[0];

         // Crear items de venta
         const saleItemsToInsert = [];
         
         if (stockEntryId && specificPrice !== null) {
           // Venta específica: un solo item
           saleItemsToInsert.push({
             sale_id: sale.id,
             stock_entry_id: stockEntryId,
             quantity_sold: quantity,
             price_at_sale: specificPrice,
             sale_format: saleFormat
           });
         } else {
           // Venta FIFO: múltiples items según los stock entries usados
           if (!stockEntries || stockEntries.length === 0) {
             await client.query('ROLLBACK');
             return NextResponse.json(
               {
                 error: {
                   message: 'No se encontraron entradas de stock válidas',
                   status: 400
                 }
               },
               { status: 400 }
             );
           }
           
           let remainingQty = quantity;
           for (const entry of stockEntries) {
             if (remainingQty <= 0) break;
             
             const qtyToTake = Math.min(remainingQty, entry.remaining_quantity);
             
             // Calcular precio correcto con wholesale pricing mejorado
             let pricePerUnit = entry.sale_price_unit;
             if (entry.sale_price_wholesale && 
                 entry.sale_price_wholesale > 0 && 
                 qtyToTake >= 3) {
               pricePerUnit = entry.sale_price_wholesale;
             }
             
             saleItemsToInsert.push({
               sale_id: sale.id,
               stock_entry_id: entry.id,
               quantity_sold: qtyToTake,
               price_at_sale: pricePerUnit,
               sale_format: saleFormat
             });
             
             remainingQty -= qtyToTake;
           }
         }
         
         // Insertar items de venta
         for (const item of saleItemsToInsert) {
           const saleItemQuery = `
             INSERT INTO sale_items (sale_id, stock_entry_id, quantity_sold, price_at_sale, sale_format)
             VALUES ($1, $2, $3, $4, $5)
           `;
           
           try {
             await client.query(saleItemQuery, [
               item.sale_id,
               item.stock_entry_id,
               item.quantity_sold,
               item.price_at_sale,
               item.sale_format
             ]);
           } catch (saleItemError) {
             // Revertir toda la transacción si falla el item
             await client.query('ROLLBACK');
             
             return NextResponse.json(
               {
                 error: {
                   message: 'Error al crear el item de venta',
                   status: 500
                 }
               },
               { status: 500 }
             );
           }
         }

         // Actualizar stock entries
         if (stockUpdates && stockUpdates.length > 0) {
           for (const update of stockUpdates) {
             try {
               const updateQuery = 'UPDATE stock_entries SET remaining_quantity = $1 WHERE id = $2';
               await client.query(updateQuery, [update.newQuantity, update.id]);
             } catch (updateError) {
               console.error('Error actualizando stock entry:', updateError);
               await client.query('ROLLBACK');
               return NextResponse.json(
                 {
                   error: {
                     message: 'Error al actualizar el stock',
                     status: 500
                   }
                 },
                 { status: 500 }
               );
             }
           }
         }

         // Confirmar la transacción
         await client.query('COMMIT');

         return NextResponse.json({ 
           success: true, 
           saleId: sale.id,
           message: 'Venta procesada exitosamente'
         });

       } catch (innerError) {
         console.error('Error en transacción de venta:', innerError);
         if (client) {
           try {
             await client.query('ROLLBACK');
           } catch (rollbackError) {
             console.error('Error en rollback:', rollbackError);
           }
         }
         throw innerError;
       } finally {
         if (client) {
           try {
             await client.end();
           } catch (endError) {
             console.error('Error cerrando conexión:', endError);
           }
         }
       }
     } catch (error) {
       console.error('Error en API de ventas:', error);
       return NextResponse.json(
         {
           error: {
             message: 'Error interno del servidor',
             status: 500
           }
         },
         { status: 500 }
       );
     }
   });
 }

// Función para manejar venta específica por stock entry (carrito)
async function handleSpecificStockEntry(client: Client, stockEntryId: number, quantity: number, price: number) {
  // Obtener el stock entry específico con información de wholesale pricing
  // Query optimizada con índice en primary key
  const stockQuery = `
    SELECT id, remaining_quantity, sale_price_unit, sale_price_wholesale
    FROM stock_entries
    WHERE id = $1 AND remaining_quantity > 0
  `;
  
  const stockResult = await client.query(stockQuery, [stockEntryId]);

  if (stockResult.rows.length === 0) {
    return { error: 'Stock entry no encontrado', status: 404 };
  }

  const stockEntry = stockResult.rows[0];

  if (stockEntry.remaining_quantity < quantity) {
    return { 
      error: `Stock insuficiente en este lote. Solo hay ${stockEntry.remaining_quantity} unidades disponibles.`,
      status: 400 
    };
  }

  // El precio ya viene calculado desde el carrito con wholesale pricing aplicado
  const totalPrice = price * quantity;
  const stockUpdates = [{
    id: stockEntryId.toString(),
    newQuantity: stockEntry.remaining_quantity - quantity
  }];

  return {
    stockEntry,
    totalPrice,
    stockUpdates
  };
}

// Función para manejar venta FIFO automática con wholesale pricing
async function handleFIFOStock(client: Client, productId: number, quantity: number) {
  // Obtener entradas de stock ordenadas por fecha de vencimiento (FIFO) con información de wholesale pricing
  // Query optimizada con índices sugeridos: idx_stock_entries_product_remaining, idx_stock_entries_expiration
  const stockQuery = `
    SELECT id, remaining_quantity, sale_price_unit, sale_price_wholesale, expiration_date, entry_date
      FROM stock_entries
      WHERE product_id = $1 AND remaining_quantity > 0
    ORDER BY 
      CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
      expiration_date ASC,
      entry_date ASC
    LIMIT 10
  `;
  
  const stockResult = await client.query(stockQuery, [productId]);

  if (stockResult.rows.length === 0) {
    return { error: 'No hay stock disponible', status: 400 };
  }

  const stockEntries = stockResult.rows;

  // Verificar stock total disponible
  const totalStock = stockEntries.reduce((sum: number, entry: any) => sum + entry.remaining_quantity, 0);
  
  if (quantity > totalStock) {
    return { 
      error: `Stock insuficiente. Solo hay ${totalStock} unidades disponibles.`,
      status: 400
    };
  }

  // Calcular precio con lógica de wholesale pricing mejorada para escenarios mixtos
  let remainingQuantity = quantity;
  let totalPrice = 0;
  const stockUpdates: { id: string; newQuantity: number }[] = [];
  const priceBreakdown: { entryId: number; quantity: number; pricePerUnit: number; priceType: string }[] = [];

  for (const entry of stockEntries) {
    if (remainingQuantity <= 0) break;

    const quantityToTake = Math.min(remainingQuantity, entry.remaining_quantity);
    
    // Aplicar lógica de wholesale pricing POR STOCK ENTRY (no por cantidad total)
    let pricePerUnit = entry.sale_price_unit;
    let priceType = 'unit';
    
    // Evaluar wholesale pricing para la cantidad específica de este stock entry
    // Solo aplicar wholesale si este stock entry específico tiene ≥3 unidades disponibles
    // Y si la cantidad que vamos a tomar es ≥3 unidades
    if (entry.sale_price_wholesale && 
        entry.sale_price_wholesale > 0 && 
        quantityToTake >= 3) {
      pricePerUnit = entry.sale_price_wholesale;
      priceType = 'wholesale';
    }
    
    const entryTotal = quantityToTake * pricePerUnit;
    totalPrice += entryTotal;
    
    // Guardar información detallada para debugging y auditoría
    priceBreakdown.push({
      entryId: entry.id,
      quantity: quantityToTake,
      pricePerUnit,
      priceType
    });
    
    stockUpdates.push({
      id: entry.id.toString(),
      newQuantity: entry.remaining_quantity - quantityToTake
    });

    remainingQuantity -= quantityToTake;
  }

  // Log para debugging (opcional)
  console.log('FIFO Price Breakdown:', priceBreakdown);

  return {
    stockEntries,
    totalPrice,
    stockUpdates
  };
}