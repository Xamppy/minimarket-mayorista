import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const barcode = searchParams.get('barcode');

    if (!barcode) {
      return NextResponse.json({ error: 'Código de barras es requerido' }, { status: 400 });
    }

    // Buscar en stock_entries por código de barras y obtener información del producto
    // Implementar FIFO: seleccionar el stock entry con fecha de vencimiento más próxima
    const { data: stockEntries, error: stockError } = await supabase
      .from('stock_entries')
      .select(`
        id,
        product_id,
        current_quantity,
        barcode,
        sale_price_unit,
        sale_price_box,
        sale_price_wholesale,
        purchase_price,
        expiration_date,
        created_at,
        products (
          id,
          name,
          image_url,
          brands (
            name
          ),
          product_types (
            name
          )
        )
      `)
      .eq('barcode', barcode.trim())
      .gt('current_quantity', 0) // Solo productos con stock disponible
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (stockError) {
      // Si no se encuentra, devolver null en lugar de error
      if (stockError.code === 'PGRST116') {
        return NextResponse.json({ 
          product: null, 
          message: 'No se encontró producto con ese código de barras o sin stock disponible' 
        });
      }
      
      console.error('Error searching by barcode:', stockError);
      return NextResponse.json({ error: 'Error al buscar producto' }, { status: 500 });
    }

    if (!stockEntries || stockEntries.length === 0) {
      return NextResponse.json({ 
        product: null, 
        message: 'No se encontró producto con ese código de barras' 
      });
    }

    // Seleccionar el primer stock entry (FIFO - más próximo a vencer o más antiguo)
    const stockEntry = stockEntries[0];

    if (!stockEntry || !stockEntry.products) {
      return NextResponse.json({ 
        product: null, 
        message: 'No se encontró producto con ese código de barras' 
      });
    }

    // Obtener el stock total del producto usando la función RPC
    const { data: totalStockData, error: totalStockError } = await supabase
      .rpc('get_products_with_stock');

    let totalStock = stockEntry.current_quantity;
    
    if (!totalStockError && totalStockData) {
      const productWithStock = totalStockData.find((p: any) => p.id === stockEntry.product_id);
      if (productWithStock) {
        totalStock = productWithStock.total_stock;
      }
    }

    // Construir el objeto producto
    const productData = stockEntry.products as any;
    const product = {
      id: productData.id,
      name: productData.name,
      brand_name: productData.brands?.name || 'Sin marca',
      type_name: productData.product_types?.name || 'Sin tipo',
      total_stock: totalStock,
      image_url: productData.image_url
    };

    return NextResponse.json({ 
      product,
      stockEntry: {
        id: stockEntry.id,
        sale_price_unit: stockEntry.sale_price_unit,
        sale_price_box: stockEntry.sale_price_box,
        sale_price_wholesale: stockEntry.sale_price_wholesale,
        current_quantity: stockEntry.current_quantity,
        purchase_price: stockEntry.purchase_price,
        expiration_date: stockEntry.expiration_date,
        barcode: stockEntry.barcode
      },
      message: 'Producto encontrado exitosamente'
    });

  } catch (error) {
    console.error('Error in by-barcode API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 