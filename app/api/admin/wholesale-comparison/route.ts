import { NextRequest, NextResponse } from 'next/server';
import { getWholesaleVsRegularSales } from '@/app/dashboard/admin/actions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const period = searchParams.get('period') as 'day' | 'week' | 'month' || 'month';
    
    const comparison = await getWholesaleVsRegularSales(period);
    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Error in wholesale-comparison API:', error);
    return NextResponse.json(
      { error: 'Error al obtener comparación de ventas' },
      { status: 500 }
    );
  }
}