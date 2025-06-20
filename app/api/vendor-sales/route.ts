import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Verificar autenticación
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Calcular fechas del día actual
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Obtener ventas del día del vendedor autenticado
    const { data: sales, error } = await supabase
      .from('sales')
      .select('id, total_amount, created_at')
      .eq('seller_id', user.id)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener ventas del vendedor:', error);
      return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
    }

    // Calcular total
    const total = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

    return NextResponse.json({
      success: true,
      sales: sales || [],
      total,
      count: sales?.length || 0,
      date: today.toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('Error en API de ventas del vendedor:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 