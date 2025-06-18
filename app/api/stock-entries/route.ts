import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const { searchParams } = request.nextUrl;
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('stock_entries')
      .select('*')
      .eq('product_id', parseInt(productId))
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting stock entries:', error);
      return NextResponse.json({ error: 'Failed to fetch stock entries' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in stock-entries API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 