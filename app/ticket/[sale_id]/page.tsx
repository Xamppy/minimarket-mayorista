'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useThermalPrint } from '../../hooks/useThermalPrint';
import { ThermalPrintStyles } from '../../components/ThermalPrintStyles';
import { 
  formatCurrency, 
  formatDateForThermal, 
  truncateText, 
  calculateOptimalTextWidth,
  formatProductName,
  formatBrandName,
  formatBarcode,
  formatWholesaleInfo
} from '../../utils/thermal-printer';
import type { ThermalTicketData, ThermalTicketItem } from '../../types/thermal-print';

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
  const [saleData, setSaleData] = useState<ThermalTicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const saleId = resolvedParams.sale_id;
  
  // Detectar si se solicita formato PDF para evitar impresión automática
  const isPDFFormat = searchParams.get('format') === 'pdf';

  // Initialize thermal printing hook
  const { print, isPrinting, printError } = useThermalPrint({
    autoprint: !isPDFFormat, // Desactivar impresión automática para PDF
    autoprintDelay: 500,
    onPrintError: (error) => {
      console.error('Print error:', error);
    }
  });

  useEffect(() => {
    if (!saleId) {
      router.push('/dashboard/vendedor');
      return;
    }

    const fetchSaleData = async () => {
      try {
        setLoading(true);

        // Obtener datos de la venta usando el endpoint de API
        console.log('Fetching sale with ID:', saleId);
        
        const response = await fetch(`/api/sales/${saleId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error fetching sale data:', errorData);
          setError(errorData.error?.message || 'Error al cargar la venta');
          return;
        }

        const result = await response.json();
        
        if (!result.success || !result.data) {
          console.error('No sale data found');
          setError('Venta no encontrada');
          return;
        }

        const sale = result.data;
        console.log('Sale data:', sale);

        // Procesar items con información de wholesale pricing
        const itemsWithProducts: ThermalTicketItem[] = (sale.sale_items || []).map((item: any) => {
          // Para determinar wholesale pricing, necesitamos hacer una estimación
          // basada en la cantidad y el precio aplicado
          const isWholesale = item.quantity_sold >= 3;
          
          return {
            id: item.id,
            quantity_sold: item.quantity_sold,
            price_at_sale: item.price_at_sale,
            sale_format: item.sale_format,
            product_name: item.stock_entry.product.name || 'Producto desconocido',
            brand_name: item.stock_entry.product.brand.name || 'Sin marca',
            barcode: item.stock_entry.barcode || null,
            is_wholesale: isWholesale,
            unit_price: item.price_at_sale, // Usamos el precio de venta como referencia
            wholesale_price: isWholesale ? item.price_at_sale : null,
            savings: 0 // Por ahora no calculamos ahorros sin datos adicionales
          };
        });

        // Calcular totales adicionales
        const totalSavings = itemsWithProducts.reduce((sum: number, item: any) => sum + (item.savings || 0), 0);
        const itemCount = itemsWithProducts.reduce((sum: number, item: any) => sum + item.quantity_sold, 0);

        // Formatear fecha y hora
        const saleDate = new Date(sale.created_at);
        const { date: formattedDate, time: formattedTime } = formatDateForThermal(saleDate);

        // Construir el objeto final con tipos correctos
        const fullSaleData: ThermalTicketData = {
          id: sale.id,
          seller_id: sale.seller_id,
          total_amount: sale.total_amount,
          created_at: sale.created_at,
          seller_email: sale.seller_email || 'Vendedor desconocido',
          sale_items: itemsWithProducts,
          formattedDate,
          formattedTime,
          totalSavings,
          itemCount
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

  // Auto-print is handled by the useThermalPrint hook

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

  // Calculate optimal text width for truncation
  const maxTextWidth = calculateOptimalTextWidth();

  return (
    <>
      {/* Inject thermal print styles */}
      <ThermalPrintStyles />

      <div className="thermal-ticket">
        {/* Header Section */}
        <div className="thermal-center">
          <div className="thermal-header">MINIMARKET DON ALE</div>
          <div className="thermal-section">Ticket de Venta</div>
        </div>
        
        <div className="thermal-separator"></div>

        {/* Sale Information Section */}
        <div className="thermal-body">
          <div className="thermal-row">
            <span>Ticket #:</span>
            <span className="thermal-wrap">{truncateText(saleData.id, 20)}</span>
          </div>
          <div className="thermal-row">
            <span>Fecha:</span>
            <span>{saleData.formattedDate}</span>
          </div>
          <div className="thermal-row">
            <span>Hora:</span>
            <span>{saleData.formattedTime}</span>
          </div>
          <div className="thermal-row">
            <span>Vendedor:</span>
            <span className="thermal-wrap">{truncateText(saleData.seller_email, 25)}</span>
          </div>
          {saleData.itemCount && (
            <div className="thermal-row">
              <span>Items:</span>
              <span>{saleData.itemCount}</span>
            </div>
          )}
        </div>

        <div className="thermal-separator"></div>

        {/* Products Section */}
        <div className="thermal-section thermal-center">PRODUCTOS VENDIDOS</div>
        
        {saleData.sale_items.map((item, index) => {
          const wholesaleInfo = formatWholesaleInfo(item);
          
          return (
            <div key={item.id} className="thermal-product-item">
              <div className="thermal-body thermal-bold thermal-wrap">
                {formatProductName(item.product_name, maxTextWidth - 5)}
              </div>
              <div className="thermal-small thermal-wrap">
                Marca: {formatBrandName(item.brand_name)}
              </div>
              {item.barcode && (
                <div className="thermal-small thermal-wrap">
                  Código: {formatBarcode(item.barcode)}
                </div>
              )}
              
              <div className="thermal-price-row">
                <span className="thermal-price-left">
                  {item.quantity_sold} x {formatCurrency(item.price_at_sale)}
                </span>
                <span className="thermal-price-right thermal-bold">
                  {formatCurrency(item.quantity_sold * item.price_at_sale)}
                </span>
              </div>
              
              <div className="thermal-small">
                Formato: {item.sale_format}
                {wholesaleInfo.wholesaleLabel && (
                  <span className="thermal-bold"> - {wholesaleInfo.wholesaleLabel}</span>
                )}
              </div>
              
              {wholesaleInfo.showWholesale && (
                <div className="thermal-small thermal-bold">
                  Ahorro: {wholesaleInfo.savingsText}
                </div>
              )}
              
              {index < saleData.sale_items.length - 1 && (
                <div className="thermal-separator" style={{ margin: '2mm 0' }}></div>
              )}
            </div>
          );
        })}

        <div className="thermal-separator"></div>
        
        <div className="thermal-row thermal-section">
          <span>TOTAL A PAGAR:</span>
          <span className="thermal-bold">{formatCurrency(saleData.total_amount)}</span>
        </div>

        <div className="thermal-separator"></div>

        {/* Footer Section */}
        <div className="thermal-center thermal-small">
          <div>¡Gracias por su compra!</div>
          <div style={{ marginTop: '2mm' }}>
            Conserve este ticket como
          </div>
          <div>
            comprobante de su compra
          </div>
          <div style={{ marginTop: '3mm' }} className="thermal-small">
            Sistema MiniMarket Pro
          </div>
        </div>

        {/* Print Status and Controls (screen only) */}
        <div className="no-print" style={{ textAlign: 'center', marginTop: '20px' }}>
          {isPrinting && (
            <div className="thermal-body" style={{ marginBottom: '10px' }}>
              🖨️ Preparando impresión...
            </div>
          )}
          {printError && (
            <div className="thermal-body" style={{ color: 'red', marginBottom: '10px' }}>
              ❌ Error: {printError}
            </div>
          )}
          
          {isPDFFormat ? (
            /* Controles para formato PDF */
            <>
              <div className="thermal-small" style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
                <strong>📄 Modo Guardar como PDF</strong>
                <p style={{ marginTop: '5px', fontSize: '12px' }}>Usa Ctrl+P o Cmd+P para guardar este ticket como PDF</p>
              </div>

              <button 
                onClick={() => window.print()}
                style={{
                  padding: '10px 20px',
                  margin: '5px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                📄 Guardar como PDF
              </button>
              
              <button 
                onClick={() => window.close()}
                style={{
                  padding: '10px 20px',
                  margin: '5px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ❌ Cerrar Ventana
              </button>
            </>
          ) : (
            /* Controles para impresión térmica normal */
            <>
              <div className="thermal-small" style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <strong>📋 Instrucciones para Impresora Térmica:</strong>
                <ul style={{ textAlign: 'left', marginTop: '5px', fontSize: '11px' }}>
                  <li>Asegúrate de que la impresora térmica esté encendida</li>
                  <li>Selecciona tu impresora térmica en el diálogo</li>
                  <li>Verifica que el tamaño de papel sea 80mm</li>
                  <li>Si no imprime, revisa los drivers de la impresora</li>
                </ul>
              </div>

              <button 
                onClick={() => print()}
                disabled={isPrinting}
                style={{
                  padding: '10px 20px',
                  margin: '5px',
                  backgroundColor: isPrinting ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isPrinting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                {isPrinting ? '🖨️ Imprimiendo...' : '🖨️ Imprimir Ticket'}
              </button>
              
              <button 
                onClick={() => window.close()}
                style={{
                  padding: '10px 20px',
                  margin: '5px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ❌ Cerrar Ventana
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}