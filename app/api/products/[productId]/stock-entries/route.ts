import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ productId: string }> }
) {
    try {
        const cookieStore = cookies();
        const supabase = createClient(cookieStore);

        // Verificar autenticación
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
        }

        const { productId } = await params;

        if (!productId) {
            return NextResponse.json({ error: 'ID del producto es requerido' }, { status: 400 });
        }

        console.log('API: Fetching stock entries for product ID:', productId);

        // Convertir productId a número si es necesario
        const numericProductId = parseInt(productId);
        if (isNaN(numericProductId)) {
            return NextResponse.json({ error: 'ID del producto debe ser un número válido' }, { status: 400 });
        }

        // Obtener todas las entradas de stock para el producto con stock disponible
        const { data: stockEntries, error: stockError } = await supabase
            .from('stock_entries')
            .select(`
        id,
        product_id,
        barcode,
        current_quantity,
        initial_quantity,
        expiration_date,
        created_at,
        purchase_price,
        sale_price_unit,
        sale_price_box,
        sale_price_wholesale
      `)
            .eq('product_id', numericProductId)
            .gt('current_quantity', 0) // Solo stock entries con cantidad disponible
            .order('expiration_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: true });

        if (stockError) {
            console.error('Error fetching stock entries:', stockError);
            return NextResponse.json({ error: 'Error al obtener stock entries' }, { status: 500 });
        }

        if (!stockEntries || stockEntries.length === 0) {
            return NextResponse.json({
                stockEntries: [],
                message: 'No hay stock disponible para este producto'
            });
        }

        // Calcular información adicional para cada stock entry
        const enhancedStockEntries = stockEntries.map(entry => {
            let daysUntilExpiration = null;
            let isExpiringSoon = false;

            if (entry.expiration_date) {
                const today = new Date();
                const expirationDate = new Date(entry.expiration_date);
                daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                isExpiringSoon = daysUntilExpiration <= 7;
            }

            return {
                ...entry,
                daysUntilExpiration,
                isExpiringSoon,
                wholesaleAvailable: !!(entry.sale_price_wholesale && entry.sale_price_wholesale > 0)
            };
        });

        return NextResponse.json({
            stockEntries: enhancedStockEntries,
            totalEntries: enhancedStockEntries.length,
            totalStock: enhancedStockEntries.reduce((sum, entry) => sum + entry.current_quantity, 0),
            message: 'Stock entries obtenidos exitosamente'
        });

    } catch (error) {
        console.error('Error in stock-entries API:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}