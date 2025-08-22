import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { withVendedorAuth } from '../../../../utils/auth/middleware';

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true'
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ productId: string }> }
) {
    return withVendedorAuth(request, async (req, user) => {
        try {
            const { productId } = await params;

            if (!productId) {
                return NextResponse.json(
                    {
                        error: {
                            message: 'ID del producto es requerido',
                            status: 400
                        }
                    },
                    { status: 400 }
                );
            }

            console.log('API: Fetching stock entries for product ID:', productId);

            // Convertir productId a número si es necesario
            const numericProductId = parseInt(productId);
            if (isNaN(numericProductId)) {
                return NextResponse.json(
                    {
                        error: {
                            message: 'ID del producto debe ser un número válido',
                            status: 400
                        }
                    },
                    { status: 400 }
                );
            }

            const client = new Client(dbConfig);
            await client.connect();

            try {

                // Obtener todas las entradas de stock para el producto con stock disponible
                const stockQuery = `
                    SELECT 
                        id,
                        product_id,
                        barcode,
                        remaining_quantity,
                        initial_quantity,
                        expiration_date,
                        created_at,
                        purchase_price,
                        sale_price_unit,
                        sale_price_wholesale
                    FROM stock_entries
                    WHERE product_id = $1 AND remaining_quantity > 0
                    ORDER BY 
                        CASE WHEN expiration_date IS NULL THEN 1 ELSE 0 END,
                        expiration_date ASC,
                        created_at ASC
                `;

                const stockResult = await client.query(stockQuery, [numericProductId]);

                if (stockResult.rows.length === 0) {
                    return NextResponse.json({
                        success: true,
                        stockEntries: [],
                        totalEntries: 0,
                        totalStock: 0,
                        message: 'No hay stock disponible para este producto'
                    });
                }

                const stockEntries = stockResult.rows;

                // Calcular información adicional para cada stock entry
                const enrichedStockEntries = stockEntries.map(entry => {
                    const now = new Date();
                    const expirationDate = entry.expiration_date ? new Date(entry.expiration_date) : null;
                    const daysUntilExpiration = expirationDate
                        ? Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        : null;

                    return {
                        ...entry,
                        daysUntilExpiration,
                        isExpired: daysUntilExpiration !== null && daysUntilExpiration < 0,
                        isNearExpiration: daysUntilExpiration !== null && daysUntilExpiration <= 7 && daysUntilExpiration >= 0
                    };
                });

                // Calcular totales
                const totalEntries = enrichedStockEntries.length;
                const totalStock = enrichedStockEntries.reduce((sum, entry) => sum + entry.remaining_quantity, 0);

                console.log('API: Stock entries found:', totalEntries, 'Total stock:', totalStock);

                return NextResponse.json({
                    success: true,
                    stockEntries: enrichedStockEntries,
                    totalEntries,
                    totalStock
                });

            } finally {
                await client.end();
            }
        } catch (error) {
            console.error('Error in stock entries API:', error);
            return NextResponse.json(
                {
                    error: {
                        message: 'Error interno del servidor',
                        status: 500
                    }
                },
                { status: 500 }
            );
        }
    });
}