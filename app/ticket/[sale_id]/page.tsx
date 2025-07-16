'use client';

import { createClient } from '../../utils/supabase/client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

interface SaleData {
  id: string;
  seller_id: string;
  total_amount: number;
  created_at: string;
  seller_email: string;
  sale_items: {
    id: string;
    quantity_sold: number;
    price_at_sale: number;
    sale_format: string;
    stock_entry: {
      barcode: string;
      product: {
        name: string;
        brand: {
          name: string;
        };
      };
    };
  }[];
}

interface PageProps {
  params: Promise<{ sale_id: string }>;
}

export default function TicketPage({ params }: PageProps) {
  const [saleData, setSaleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const resolvedParams = use(params);
  const saleId = resolvedParams.sale_id;

  useEffect(() => {
    if (!saleId) {
      router.push('/dashboard/vendedor');
      return;
    }

    const fetchSaleData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // Obtener datos de la venta paso a paso para mejor debugging
        console.log('Fetching sale with ID:', saleId);
        
        // Primero obtener los datos básicos de la venta
        const { data: sale, error: saleError } = await supabase
          .from('sales')
          .select(`
            id,
            seller_id,
            total_amount,
            created_at
          `)
          .eq('id', saleId)
          .single();

        if (saleError) {
          console.error('Error fetching basic sale data:', saleError);
          setError(`Error al cargar la venta: ${saleError.message}`);
          return;
        }

        if (!sale) {
          console.error('No sale found with ID:', saleId);
          setError('Venta no encontrada');
          return;
        }

        console.log('Basic sale data:', sale);

        // Obtener información del vendedor
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', sale.seller_id)
          .single();

        if (profileError) {
          console.warn('Error fetching seller profile:', profileError);
        }

        // Obtener items de la venta con información completa incluyendo wholesale pricing
        const { data: saleItems, error: itemsError } = await supabase
          .from('sale_items')
          .select(`
            id,
            quantity_sold,
            price_at_sale,
            sale_format,
            stock_entry_id,
            stock_entries (
              barcode,
              sale_price_unit,
              sale_price_wholesale,
              products (
                name,
                brands (name)
              )
            )
          `)
          .eq('sale_id', saleId);

        if (itemsError) {
          console.error('Error fetching sale items:', itemsError);
          setError(`Error al cargar los productos: ${itemsError.message}`);
          return;
        }

        console.log('Sale items:', saleItems);

        // Procesar items con información de wholesale pricing
        const itemsWithProducts = (saleItems || []).map((item: any) => {
          const stockEntry = item.stock_entries;
          const product = stockEntry?.products;
          
          // Determinar si se aplicó wholesale pricing
          const isWholesale = item.quantity_sold >= 3 && 
                             stockEntry?.sale_price_wholesale && 
                             item.price_at_sale === stockEntry.sale_price_wholesale;
          
          // Calcular ahorro si se aplicó wholesale pricing
          let savings = 0;
          if (isWholesale && stockEntry?.sale_price_unit) {
            savings = (stockEntry.sale_price_unit - stockEntry.sale_price_wholesale) * item.quantity_sold;
          }

          return {
            ...item,
            product_name: product?.name || 'Producto desconocido',
            brand_name: product?.brands?.name || 'Sin marca',
            barcode: stockEntry?.barcode || 'N/A',
            is_wholesale: isWholesale,
            unit_price: stockEntry?.sale_price_unit || 0,
            wholesale_price: stockEntry?.sale_price_wholesale || null,
            savings: savings
          };
        });

        // Construir el objeto final
        const fullSaleData = {
          ...sale,
          seller_email: profile?.email || 'Vendedor desconocido',
          sale_items: itemsWithProducts
        };

        console.log('Full sale data:', fullSaleData);
        setSaleData(fullSaleData);
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar el ticket');
      } finally {
        setLoading(false);
      }
    };

    fetchSaleData();
  }, [saleId, router]);

  // Efecto para imprimir automáticamente
  useEffect(() => {
    if (saleData && !loading) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [saleData, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Cargando ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !saleData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Ticket no encontrado'}</p>
          <button 
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    );
  }
  const saleDate = new Date(saleData.created_at);
  const formattedDate = saleDate.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const formattedTime = saleDate.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <>
      {/* Estilos específicos para impresión */}
      <style jsx global>{`
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            color: black !important;
          }
          
          body {
            font-family: monospace !important;
            font-size: 12px !important;
            line-height: 1.2 !important;
            color: black !important;
            background: white !important;
          }
          
          .ticket {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Forzar todo el texto a negro en impresión */
          .ticket * {
            color: black !important;
            border-color: black !important;
          }
        }
        
        @media screen {
          body {
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          
          /* Asegurar que el texto sea negro en pantalla también */
          .ticket {
            color: black;
          }
          
          .ticket * {
            color: black !important;
          }
        }
      `}</style>



      <div className="ticket bg-white" style={{ 
        width: '80mm', 
        maxWidth: '80mm',
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.2',
        padding: '10px',
        margin: '0 auto'
      }}>
        {/* Header del ticket */}
        <div className="text-center mb-4">
          <div className="font-bold text-lg">MINIMARKET</div>
          <div className="text-sm">Ticket de Venta</div>
          <div className="border-b border-dashed border-black my-2"></div>
        </div>

        {/* Información de la venta */}
        <div className="mb-4 text-xs">
          <div className="flex justify-between">
            <span>Ticket #:</span>
            <span className="font-mono">{saleData.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Fecha:</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Hora:</span>
            <span>{formattedTime}</span>
          </div>
          <div className="flex justify-between">
            <span>Vendedor:</span>
            <span className="truncate ml-2">{saleData.seller_email || 'N/A'}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-black my-2"></div>

        {/* Items de la venta */}
        <div className="mb-4">
          <div className="text-xs font-bold mb-2">PRODUCTOS VENDIDOS:</div>
          
          {saleData.sale_items.map((item: any, index: number) => (
            <div key={item.id} className="mb-3 text-xs">
              <div className="font-semibold">
                {item.product_name || 'Producto desconocido'}
              </div>
              <div className="text-black text-xs">
                Marca: {item.brand_name || 'Sin marca'}
              </div>
              <div className="text-black text-xs">
                Código: {item.barcode || 'N/A'}
              </div>
              <div className="flex justify-between mt-1">
                <span>{item.quantity_sold} x ${item.price_at_sale.toFixed(2)}</span>
                <span className="font-bold">${(item.quantity_sold * item.price_at_sale).toFixed(2)}</span>
              </div>
              <div className="text-xs text-black">
                Formato: {item.sale_format}
                {item.is_wholesale && (
                  <span className="ml-2 font-bold">🎉 MAYORISTA</span>
                )}
              </div>
              {item.is_wholesale && item.savings > 0 && (
                <div className="text-xs text-black font-semibold">
                  Ahorro: ${item.savings.toFixed(2)}
                </div>
              )}
              {index < saleData.sale_items.length - 1 && (
                <div className="border-b border-dotted border-black my-2"></div>
              )}
            </div>
          ))}
        </div>

        <div className="border-b border-dashed border-black my-2"></div>

        {/* Total */}
        <div className="mb-4">
          <div className="flex justify-between text-sm font-bold">
            <span>TOTAL:</span>
            <span>${saleData.total_amount.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-black my-2"></div>

        {/* Footer */}
        <div className="text-center text-xs mt-4">
          <div>¡Gracias por su compra!</div>
          <div className="mt-2">
            Conserve este ticket como
          </div>
          <div>
            comprobante de su compra
          </div>
          <div className="mt-3 text-xs">
            Sistema de Minimarket
          </div>
        </div>

        {/* Botón para cerrar (solo visible en pantalla) */}
        <div className="no-print text-center mt-6">
          <button 
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cerrar Ventana
          </button>
        </div>
      </div>
    </>
  );
} 