import { NextResponse } from 'next/server';
import { getWholesalePricingStats } from '@/app/dashboard/admin/actions';

export async function GET() {
  try {
    const stats = await getWholesalePricingStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in wholesale-stats API:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas de wholesale pricing' },
      { status: 500 }
    );
  }
}