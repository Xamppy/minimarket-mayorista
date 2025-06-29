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
    const productId = searchParams.get('product_id') || searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'product_id o productId es requerido' }, { status: 400 });
    }

    // Obtener entradas de stock para el producto específico
    const { data: stockEntries, error } = await supabase
      .from('stock_entries')
      .select('*')
      .eq('product_id', productId)
      .gt('current_quantity', 0) // Solo los que tengan stock
      .order('created_at', { ascending: true }); // FIFO - más antiguos primero

    if (error) {
      console.error('Error fetching stock entries:', error);
      return NextResponse.json({ error: 'Error al obtener stock entries' }, { status: 500 });
    }

    return NextResponse.json(stockEntries || []);

  } catch (error) {
    console.error('Error in stock-entries API:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 