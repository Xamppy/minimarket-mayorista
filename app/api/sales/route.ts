import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
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
        error: 'Faltan datos requeridos para procesar la venta',
        details: 'Se requiere ID del producto, cantidad y formato de venta'
      }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ 
        error: 'La cantidad debe ser mayor a 0',
        details: `Cantidad recibida: ${quantity}`
      }, { status: 400 });
    }

    if (quantity > 1000) {
      return NextResponse.json({ 
        error: 'La cantidad es demasiado alta',
        details: 'La cantidad máxima por venta es 1000 unidades'
      }, { status: 400 });
    }

    // Obtener información del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    let stockEntries, totalPrice, stockUpdates;

    if (stockEntryId && specificPrice !== null) {
      // Modo específico: usar stock entry específico (para carrito)
      const result = await handleSpecificStockEntry(supabase, stockEntryId, quantity, specificPrice);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      stockEntries = [result.stockEntry];
      totalPrice = result.totalPrice;
      stockUpdates = result.stockUpdates;
    } else {
      // Modo FIFO: usar lógica automática de stock
      const result = await handleFIFOStock(supabase, productId, quantity);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: result.status || 400 });
      }
      stockEntries = result.stockEntries;
      totalPrice = result.totalPrice;
      stockUpdates = result.stockUpdates;
    }

    // Iniciar transacción
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        seller_id: user.id,
        total_amount: totalPrice
      })
      .select('id')
      .single();

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Error al crear la venta' }, { status: 500 });
    }

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
    
    const { error: saleItemError } = await supabase
      .from('sale_items')
      .insert(saleItemsToInsert);

    if (saleItemError) {
      // Revertir la venta si falla el item
      await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);
      
      return NextResponse.json({ error: 'Error al crear el item de venta' }, { status: 500 });
    }

    // Actualizar stock entries
    if (stockUpdates) {
      for (const update of stockUpdates) {
        const { error: updateError } = await supabase
          .from('stock_entries')
          .update({ current_quantity: update.newQuantity })
          .eq('id', update.id);

        if (updateError) {
          console.error('Error actualizando stock entry:', updateError);
          // En un caso real, aquí deberías revertir toda la transacción
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      saleId: sale.id,
      message: 'Venta procesada exitosamente'
    });

  } catch (error) {
    console.error('Error en API de ventas:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función para manejar venta específica por stock entry (carrito)
async function handleSpecificStockEntry(supabase: any, stockEntryId: number, quantity: number, price: number) {
  // Obtener el stock entry específico con información de wholesale pricing
  const { data: stockEntry, error: stockError } = await supabase
    .from('stock_entries')
    .select('id, current_quantity, sale_price_unit, sale_price_box, sale_price_wholesale')
    .eq('id', stockEntryId)
    .single();

  if (stockError || !stockEntry) {
    return { error: 'Stock entry no encontrado', status: 404 };
  }

  if (stockEntry.current_quantity < quantity) {
    return { 
      error: `Stock insuficiente en este lote. Solo hay ${stockEntry.current_quantity} unidades disponibles.`,
      status: 400 
    };
  }

  // El precio ya viene calculado desde el carrito con wholesale pricing aplicado
  const totalPrice = price * quantity;
  const stockUpdates = [{
    id: stockEntryId.toString(),
    newQuantity: stockEntry.current_quantity - quantity
  }];

  return {
    stockEntry,
    totalPrice,
    stockUpdates
  };
}

// Función para manejar venta FIFO automática con wholesale pricing
async function handleFIFOStock(supabase: any, productId: number, quantity: number) {
  // Obtener entradas de stock ordenadas por fecha de vencimiento (FIFO) con información de wholesale pricing
  const { data: stockEntries, error: stockError } = await supabase
    .from('stock_entries')
    .select('id, current_quantity, sale_price_unit, sale_price_box, sale_price_wholesale, expiration_date, created_at')
    .eq('product_id', productId)
    .gt('current_quantity', 0)
    .order('expiration_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (stockError) {
    return { error: 'Error al obtener stock', status: 500 };
  }

  if (!stockEntries || stockEntries.length === 0) {
    return { error: 'No hay stock disponible', status: 400 };
  }

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