import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../utils/auth/middleware';

// Función auxiliar para reintentos con backoff exponencial
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // No reintentar en errores de validación o lógica de negocio
      if (error instanceof Error && (
        error.message.includes('validation') ||
        error.message.includes('insufficient') ||
        error.message.includes('not found')
      )) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Backoff exponencial: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
  connectionTimeoutMillis: 10000, // 10 segundos timeout para conexión
  idleTimeoutMillis: 30000, // 30 segundos timeout para idle
  query_timeout: 30000, // 30 segundos timeout para queries
  statement_timeout: 30000, // 30 segundos timeout para statements
  max: 1 // Una sola conexión por request
};

export async function POST(request: NextRequest) {
  return await withVendedorAuth(request, async (req, user) => {
    try {
      const formData = await req.formData();
      
      // Log detallado de los datos recibidos
      console.log('=== DATOS RECIBIDOS EN /api/sales ===');
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
      }
      
      const productIdString = formData.get('productId') as string;
      // Limpiar y validar productId - puede ser UUID o número entero
      const cleanProductId = productIdString ? productIdString.toString().trim() : '';
      // Validar si es UUID o número entero
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanProductId);
      const isInteger = /^\d+$/.test(cleanProductId);
      const productId = (isUUID || isInteger) ? cleanProductId : null;
      const quantity = parseInt(formData.get('quantity') as string);
      const saleFormat = formData.get('saleFormat') as string;
      
      console.log('Datos procesados:');
      console.log(`  productId: ${productId} (original: ${productIdString})`);
      console.log(`  quantity: ${quantity}`);
      console.log(`  saleFormat: ${saleFormat}`);
      

      
      // Parámetros opcionales para venta específica por stock entry (carrito)
      const stockEntryIdString = formData.get('stockEntryId') as string;
      let stockEntryId = null;
      
      console.log(`  stockEntryId: ${stockEntryIdString} (original)`);
      
      // Validar stockEntryId como UUID si está presente
      if (stockEntryIdString) {
        const cleanStockEntryId = stockEntryIdString.trim();
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanStockEntryId);
        
        console.log(`  cleanStockEntryId: ${cleanStockEntryId}`);
        console.log(`  isValidUUID: ${isValidUUID}`);
        
        if (isValidUUID) {
          stockEntryId = cleanStockEntryId;
        } else {
          console.error('stockEntryId inválido:', cleanStockEntryId);
          console.error('Formato esperado: UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)');
          return NextResponse.json({ 
            error: {
              message: 'ID de entrada de stock inválido',
              details: `El stockEntryId debe ser un UUID válido. Recibido: ${cleanStockEntryId}`,
              status: 400
            }
          }, { status: 400 });
        }
      }
      
      const priceString = formData.get('price') as string;
      const specificPrice = priceString ? parseFloat(priceString) : null;
      
      console.log(`  price: ${specificPrice} (original: ${priceString})`);
      console.log('=== FIN DATOS RECIBIDOS ===');
      




      // Validaciones robustas de datos de entrada
      console.log('=== INICIANDO VALIDACIONES ===');
      const validationErrors = [];
      
      // Validar productId
      if (!productIdString) {
        validationErrors.push('ID del producto es requerido');
      } else if (productId === null) {
        validationErrors.push(`ID del producto inválido: ${productIdString}. Debe ser un UUID o número entero`);
      }
      
      // Validar quantity
      if (!formData.get('quantity')) {
        validationErrors.push('Cantidad es requerida');
      } else if (isNaN(quantity)) {
        validationErrors.push(`Cantidad inválida: ${formData.get('quantity')}. Debe ser un número`);
      } else if (quantity <= 0) {
        validationErrors.push(`Cantidad debe ser mayor a 0. Recibido: ${quantity}`);
      } else if (quantity > 1000) {
        validationErrors.push(`Cantidad demasiado alta: ${quantity}. Máximo permitido: 1000 unidades`);
      } else if (!Number.isInteger(quantity)) {
        validationErrors.push(`Cantidad debe ser un número entero. Recibido: ${quantity}`);
      }
      
      // Validar saleFormat
      if (!saleFormat) {
        validationErrors.push('Formato de venta es requerido');
      } else if (!['unitario', 'display', 'pallet'].includes(saleFormat)) {
        validationErrors.push(`Formato de venta inválido: ${saleFormat}. Valores permitidos: unitario, display, pallet`);
      }
      
      // Validar precio específico si está presente
      if (specificPrice !== null) {
        if (isNaN(specificPrice)) {
          validationErrors.push(`Precio inválido: ${priceString}. Debe ser un número`);
        } else if (specificPrice < 0) {
          validationErrors.push(`Precio no puede ser negativo: ${specificPrice}`);
        } else if (specificPrice > 1000000) {
          validationErrors.push(`Precio demasiado alto: ${specificPrice}. Máximo permitido: $1,000,000`);
        }
      }
      
      // Retornar errores de validación si existen
      if (validationErrors.length > 0) {
        console.log('ERROR: Validaciones fallaron:', validationErrors);
        return NextResponse.json({ 
          error: {
            message: 'Datos de entrada inválidos',
            details: validationErrors,
            status: 400
          }
        }, { status: 400 });
      }
      
      console.log('Validaciones pasaron exitosamente');
      console.log('=== FIN VALIDACIONES ===');

      let client: Client | null = null;
      
      try {
        console.log('=== INICIANDO CONEXIÓN A BASE DE DATOS ===');
        // Usar reintentos para la conexión crítica
        client = await retryOperation(async () => {
          const newClient = new Client(dbConfig);
          await newClient.connect();
          return newClient;
        }, 3, 1000);
        console.log('Conexión a base de datos exitosa');
        
        // Iniciar transacción para garantizar consistencia
        console.log('Iniciando transacción...');
        await client.query('BEGIN');
        console.log('Transacción iniciada exitosamente');
        console.log('=== FIN CONEXIÓN A BASE DE DATOS ===');

         // Obtener información del producto
         console.log('=== CONSULTANDO PRODUCTO ===');
         console.log(`Buscando producto con ID: ${productId}`);
         const productQuery = 'SELECT id, name FROM products WHERE id = $1';
         const productResult = await client.query(productQuery, [productId]);
         console.log(`Resultado de consulta: ${productResult.rows.length} filas encontradas`);
         
         if (productResult.rows.length > 0) {
           console.log('Producto encontrado:', productResult.rows[0]);
         }

         if (productResult.rows.length === 0) {
           console.log('ERROR: Producto no encontrado');
           await client.query('ROLLBACK');
           return NextResponse.json({
             success: false,
             error: {
               message: 'Producto no encontrado',
               details: `No existe un producto con ID: ${productId}`,
               status: 404,
               timestamp: new Date().toISOString()
             }
           }, { status: 404 });
         }

         const product = productResult.rows[0];
         console.log('=== FIN CONSULTA PRODUCTO ===');

         // Validaciones de integridad de datos
         console.log('=== VALIDANDO PRODUCTO ===');
         console.log(`Producto encontrado: ${product.name}`);
         // Nota: Validación is_active removida - columna no existe en la tabla
         console.log('Producto válido para venta');
         console.log('=== FIN VALIDACIÓN PRODUCTO ===');
         
         // Verificar stock total disponible
         console.log('=== VERIFICANDO STOCK ===');
         const stockCheckQuery = `
           SELECT COALESCE(SUM(quantity), 0) as total_stock
           FROM stock_entries 
           WHERE product_id = $1 AND quantity > 0
         `;
         const stockCheckResult = await client.query(stockCheckQuery, [productId]);
         const totalAvailableStock = parseInt(stockCheckResult.rows[0].total_stock);
         console.log(`Stock disponible: ${totalAvailableStock}, cantidad solicitada: ${quantity}`);
         
         if (totalAvailableStock < quantity) {
           console.log('ERROR: Stock insuficiente');
           await client.query('ROLLBACK');
           return NextResponse.json({
             success: false,
             error: {
               message: 'Stock insuficiente',
               details: `Stock disponible: ${totalAvailableStock}, cantidad solicitada: ${quantity}`,
               status: 400,
               timestamp: new Date().toISOString()
             }
           }, { status: 400 });
         }
         console.log('=== FIN VERIFICACIÓN STOCK ===');

         let stockEntries, totalPrice, stockUpdates;

         if (stockEntryId && specificPrice !== null) {
           // Modo específico: usar stock entry específico (para carrito)
           console.log('=== PROCESANDO STOCK ENTRY ESPECÍFICO ===');
           console.log(`stockEntryId: ${stockEntryId}, quantity: ${quantity}, specificPrice: ${specificPrice}`);
           const result = await handleSpecificStockEntry(client, stockEntryId, quantity, specificPrice);
           console.log('Resultado de handleSpecificStockEntry:', result);
           if (result.error) {
             console.log('ERROR en handleSpecificStockEntry:', result.error);
             await client.query('ROLLBACK');
             return NextResponse.json({
               success: false,
               error: {
                 message: result.error,
                 details: 'Error en venta específica por stock entry',
                 status: result.status || 400,
                 timestamp: new Date().toISOString()
               }
             }, { status: result.status || 400 });
           }
           stockEntries = [result.stockEntry];
           totalPrice = result.totalPrice;
           stockUpdates = result.stockUpdates;
           console.log('=== FIN PROCESAMIENTO STOCK ENTRY ESPECÍFICO ===');
         } else {
           console.log('=== INICIANDO MODO FIFO ===');
           // Modo FIFO: usar lógica automática de stock
           if (!productId) {
             await client.query('ROLLBACK');
             return NextResponse.json({
               success: false,
               error: {
                 message: 'ID del producto inválido para modo FIFO',
                 status: 400
               }
             }, { status: 400 });
           }
           const result = await handleFIFOStock(client, productId, quantity);
           if (result.error) {
             await client.query('ROLLBACK');
             return NextResponse.json({
               success: false,
               error: {
                 message: result.error,
                 details: 'Error en venta FIFO (First In, First Out)',
                 status: result.status || 400,
                 timestamp: new Date().toISOString()
               }
             }, { status: result.status || 400 });
           }
           stockEntries = result.stockEntries;
           totalPrice = result.totalPrice;
           stockUpdates = result.stockUpdates;
           console.log('=== FIN MODO FIFO ===');
         }

         console.log('=== PREPARANDO CREACIÓN DE VENTA ===');
         console.log(`stockEntries length: ${stockEntries ? stockEntries.length : 'undefined'}`);
         console.log(`totalPrice: ${totalPrice}`);
         console.log(`stockUpdates length: ${stockUpdates ? stockUpdates.length : 'undefined'}`);
         
         // Crear la venta con reintentos
         console.log('=== CREANDO VENTA ===');
         console.log(`Usuario ID: ${user.id}, Total: ${totalPrice}`);
         const saleQuery = `
           INSERT INTO sales (user_id, total_amount, payment_method)
           VALUES ($1, $2, $3)
           RETURNING id
         `;
         
         const saleResult = await retryOperation(
           () => client!.query(saleQuery, [user.id, totalPrice, 'pending']),
           2,
           500
         );
         
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
         console.log(`Venta creada con ID: ${sale.id}`);
         console.log('=== FIN CREACIÓN VENTA ===');

         // Crear items de venta
         console.log('=== CREANDO ITEMS DE VENTA ===');
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
             
             const qtyToTake = Math.min(remainingQty, entry.current_quantity);
             
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
         console.log(`Insertando ${saleItemsToInsert.length} items de venta`);
         for (const item of saleItemsToInsert) {
           console.log(`Insertando item:`, item);
           const saleItemQuery = `
             INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, total_price, sale_type)
             VALUES ($1, $2, $3, $4, $5, $6)
           `;
           
           try {
             await client.query(saleItemQuery, [
               item.sale_id,
               productId, // Usar productId en lugar de stock_entry_id
               item.quantity_sold,
               item.price_at_sale,
               item.price_at_sale * item.quantity_sold, // total_price = unit_price * quantity
               item.sale_format || 'regular' // sale_type
             ]);
           } catch (saleItemError) {
             console.error('=== ERROR AL CREAR ITEM DE VENTA ===');
             console.error('Error:', saleItemError);
             console.error('Item que causó el error:', item);
             console.error('=== FIN ERROR ITEM DE VENTA ===');
             
             // Revertir toda la transacción si falla el item
             await client.query('ROLLBACK');
             
             return NextResponse.json(
               {
                 error: {
                   message: 'Error al crear el item de venta: ' + (saleItemError instanceof Error ? saleItemError.message : String(saleItemError)),
                   status: 500
                 }
               },
               { status: 500 }
             );
           }
         }

         console.log('=== FIN CREACIÓN ITEMS ===');
         
         // Actualizar stock entries
         console.log('=== ACTUALIZANDO STOCK ===');
         if (stockUpdates && stockUpdates.length > 0) {
           console.log(`Actualizando ${stockUpdates.length} stock entries`);
           for (const update of stockUpdates) {
             try {
               const updateQuery = 'UPDATE stock_entries SET current_quantity = $1 WHERE id = $2';
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

         console.log('=== FIN ACTUALIZACIÓN STOCK ===');
         
         // Confirmar la transacción
         console.log('=== CONFIRMANDO TRANSACCIÓN ===');
         await client.query('COMMIT');
         console.log('Transacción confirmada exitosamente');
         console.log('=== FIN CONFIRMACIÓN TRANSACCIÓN ===');
         console.log('=== HANDLER EJECUTADO EXITOSAMENTE ===');

         return NextResponse.json({ 
           success: true,
           message: 'Venta registrada exitosamente',
           data: {
             saleId: sale.id,
             totalAmount: totalPrice,
             items: saleItemsToInsert,
             timestamp: new Date().toISOString(),
             productName: product.name,
             quantitySold: quantity
           }
         });

       } catch (innerError) {
         console.error('Error en transacción de venta:', {
           error: innerError instanceof Error ? innerError.message : 'Error desconocido',
           stack: innerError instanceof Error ? innerError.stack : undefined,
           timestamp: new Date().toISOString(),
           userId: user.id,
           productId,
           quantity,
           stockEntryId
         });
         
         if (client) {
           try {
             await client.query('ROLLBACK');
           } catch (rollbackError) {
             console.error('Error crítico en rollback:', rollbackError);
           }
         }
         
         // Determinar tipo de error y respuesta apropiada
         if (innerError instanceof Error) {
             if (innerError.message.includes('connection')) {
               return NextResponse.json({
                 success: false,
                 error: {
                   message: 'Error de conexión a la base de datos',
                   details: 'Intente nuevamente en unos momentos',
                   status: 503,
                   timestamp: new Date().toISOString()
                 }
               }, { status: 503 });
             }
             
             if (innerError.message.includes('timeout')) {
               return NextResponse.json({
                 success: false,
                 error: {
                   message: 'Tiempo de espera agotado',
                   details: 'La operación tardó demasiado tiempo',
                   status: 408,
                   timestamp: new Date().toISOString()
                 }
               }, { status: 408 });
             }
           }
           
           return NextResponse.json({
             success: false,
             error: {
               message: 'Error interno durante la transacción',
               details: 'No se pudo completar la venta',
               status: 500,
               timestamp: new Date().toISOString()
             }
           }, { status: 500 });
       } finally {
         if (client) {
           try {
             console.log('Cerrando conexión a base de datos...');
             await client.end();
             console.log('Conexión cerrada exitosamente');
           } catch (endError) {
             console.error('Error cerrando conexión de BD:', endError);
           }
         }
       }
     } catch (error) {
       console.error('=== ERROR CRÍTICO EN POST /api/sales ===');
       console.error('Tipo de error:', error instanceof Error ? error.constructor.name : typeof error);
       console.error('Mensaje de error:', error instanceof Error ? error.message : String(error));
       console.error('Stack trace:', error instanceof Error ? error.stack : 'No disponible');
       console.error('Timestamp:', new Date().toISOString());
       console.error('=== FIN ERROR CRÍTICO ===');
       
       return NextResponse.json({
          success: false,
          error: {
            message: 'Error interno del servidor',
            details: 'No se pudo procesar la solicitud',
            status: 500,
            timestamp: new Date().toISOString()
          }
        }, { status: 500 });
     }
   });
 }

// Función para manejar venta específica por stock entry (carrito)
async function handleSpecificStockEntry(client: Client, stockEntryId: string, quantity: number, price: number) {
  const stockQuery = `
    SELECT id, current_quantity, sale_price_unit, sale_price_wholesale
    FROM stock_entries
    WHERE id = $1 AND current_quantity > 0
  `;
  
  const stockResult = await client.query(stockQuery, [stockEntryId]);

  if (stockResult.rows.length === 0) {
    return { error: 'Stock entry no encontrado', status: 404 };
  }

  const stockEntry = stockResult.rows[0];

  if (stockEntry.current_quantity < quantity) {
    return { 
      error: `Stock insuficiente en este lote. Solo hay ${stockEntry.current_quantity} unidades disponibles.`,
      status: 400 
    };
  }

  const totalPrice = price * quantity;
  const stockUpdates = [{
    id: stockEntryId,
    newQuantity: stockEntry.current_quantity - quantity
  }];

  return {
    stockEntry,
    totalPrice,
    stockUpdates
  };
}

// Función para manejar venta FIFO automática con wholesale pricing
async function handleFIFOStock(client: Client, productId: string, quantity: number) {
  // Obtener entradas de stock ordenadas por fecha de vencimiento (FIFO) con información de wholesale pricing
  // Query optimizada con índices sugeridos: idx_stock_entries_product_remaining, idx_stock_entries_expiration
  const stockQuery = `
    SELECT id, current_quantity, sale_price_unit, sale_price_wholesale, expiration_date, entry_date
      FROM stock_entries
      WHERE product_id = $1 AND current_quantity > 0
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
  const totalStock = stockEntries.reduce((sum: number, entry: any) => sum + entry.current_quantity, 0);
  
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

    const quantityToTake = Math.min(remainingQuantity, entry.current_quantity);
    
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
      newQuantity: entry.current_quantity - quantityToTake
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