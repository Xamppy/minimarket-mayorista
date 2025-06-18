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

    // Validaciones
    if (!productIdString || isNaN(productId) || !quantity || !saleFormat) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: 'La cantidad debe ser mayor a 0' }, { status: 400 });
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

    // Obtener entradas de stock ordenadas por fecha de vencimiento (FIFO)
    const { data: stockEntries, error: stockError } = await supabase
      .from('stock_entries')
      .select('id, current_quantity, sale_price_unit, expiration_date, created_at')
      .eq('product_id', productId)
      .gt('current_quantity', 0)
      .order('expiration_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (stockError) {
      return NextResponse.json({ error: 'Error al obtener stock' }, { status: 500 });
    }

    if (!stockEntries || stockEntries.length === 0) {
      return NextResponse.json({ error: 'No hay stock disponible' }, { status: 400 });
    }

    // Verificar stock total disponible
    const totalStock = stockEntries.reduce((sum, entry) => sum + entry.current_quantity, 0);
    
    if (quantity > totalStock) {
      return NextResponse.json({ 
        error: `Stock insuficiente. Solo hay ${totalStock} unidades disponibles.` 
      }, { status: 400 });
    }

    // Calcular precio promedio ponderado
    let remainingQuantity = quantity;
    let totalPrice = 0;
    const stockUpdates: { id: string; newQuantity: number }[] = [];

    for (const entry of stockEntries) {
      if (remainingQuantity <= 0) break;

      const quantityToTake = Math.min(remainingQuantity, entry.current_quantity);
      totalPrice += quantityToTake * entry.sale_price_unit;
      
      stockUpdates.push({
        id: entry.id.toString(),
        newQuantity: entry.current_quantity - quantityToTake
      });

      remainingQuantity -= quantityToTake;
    }

    const averagePrice = totalPrice / quantity;

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

    // Crear item de venta
    // Necesitamos crear un item por cada stock_entry que se use
    const saleItemsToInsert = [];
    
    let remainingQty = quantity;
    for (const entry of stockEntries) {
      if (remainingQty <= 0) break;
      
      const qtyToTake = Math.min(remainingQty, entry.current_quantity);
      
      saleItemsToInsert.push({
        sale_id: sale.id,
        stock_entry_id: entry.id,
        quantity_sold: qtyToTake,
        price_at_sale: entry.sale_price_unit,
        sale_format: saleFormat
      });
      
      remainingQty -= qtyToTake;
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