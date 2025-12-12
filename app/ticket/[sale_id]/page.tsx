'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ThermalTicketData, ThermalTicketItem } from '../../types/thermal-print';
import { 
  formatCurrency, 
  formatDate, 
  formatTime, 
  truncateText,
  calculateOptimalTextWidth,
  formatProductName,
  formatBrandName,
  formatBarcode,
  formatWholesaleInfo
} from '../../utils/thermal-printer';
import { useThermalPrint } from '../../hooks/useThermalPrint';
import ThermalPrintStyles from '../../components/ThermalPrintStyles';

export default function TicketPage() {
  const params = useParams();
  const saleId = params.sale_id as string;
  const [saleData, setSaleData] = useState<ThermalTicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPDFFormat, setIsPDFFormat] = useState(false);
  
  // Use our custom thermal print hook
  const { print, isPrinting, printError } = useThermalPrint({
    autoprint: false
  });

  // Use ref to store print function and avoid dependency issues
  const printRef = useRef(print);
  
  // Update ref when print function changes
  useEffect(() => {
    printRef.current = print;
  }, [print]);

  // Force light mode for this page
  useEffect(() => {
    // Add light-mode class to html and body
    document.documentElement.classList.add('light-mode');
    document.body.classList.add('light-mode');
    
    // Remove dark-mode class if present
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
    
    // Force background to white
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#000000';

    // Check if we are in PDF mode (URL param)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('format') === 'pdf') {
      setIsPDFFormat(true);
    }

    return () => {
      // Cleanup
      document.documentElement.classList.remove('light-mode');
      document.body.classList.remove('light-mode');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  useEffect(() => {
    const fetchSaleData = async () => {
      try {
        const response = await fetch(`/api/sales/${saleId}`);
        const result = await response.json();

        if (result.success) {
          const sale = result.data;
          
          // Calculate totals if not present
          const itemCount = sale.sale_items.reduce((sum: number, item: any) => sum + item.quantity_sold, 0);
          const totalSavings = sale.sale_items.reduce((sum: number, item: any) => {
            // Calculate savings if wholesale price was applied
            if (item.is_wholesale && item.unit_price && item.wholesale_price) {
              return sum + ((item.unit_price - item.wholesale_price) * item.quantity_sold);
            }
            return sum;
          }, 0);

          // Format dates
          const dateObj = new Date(sale.created_at);
          const formattedDate = formatDate(dateObj);
          const formattedTime = formatTime(dateObj);

          setSaleData({
            ...sale,
            formattedDate,
            formattedTime,
            itemCount,
            totalSavings
          });
          
          // Auto-print if requested via URL param and not in PDF mode
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('autoprint') === 'true' && !isPDFFormat) {
            // Small delay to ensure styles are loaded
            setTimeout(() => {
              printRef.current();
            }, 1000);
          }
        } else {
          setError(result.error?.message || 'Error al cargar la venta');
        }
      } catch (err) {
        setError('Error de conexión');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (saleId) {
      fetchSaleData();
    }
  }, [saleId, isPDFFormat]);





  if (loading) {
    return <div className="thermal-center" style={{ padding: '20px' }}>Cargando ticket...</div>;
  }

  if (error || !saleData) {
    return <div className="thermal-center" style={{ color: 'red', padding: '20px' }}>{error || 'Venta no encontrada'}</div>;
  }

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
            <span className="thermal-wrap">
              {saleData.ticket_number ? saleData.ticket_number.toString().padStart(10, '0') : truncateText(saleData.id, 8)}
            </span>
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

              
              <div className="thermal-price-row">
                <span className="thermal-price-left">
                  {item.quantity_sold} x {formatCurrency(item.price_at_sale)}
                </span>
                <span className="thermal-price-right thermal-bold">
                  {formatCurrency(item.quantity_sold * item.price_at_sale)}
                </span>
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
        
        <div className="thermal-separator"></div>
        
        {saleData.discount ? (
          <>
            <div className="thermal-row">
              <span>Subtotal:</span>
              <span>{formatCurrency(saleData.subtotal || (saleData.total_amount + saleData.discount.amount))}</span>
            </div>
            <div className="thermal-row">
              <span>Descuento ({saleData.discount.type === 'amount' ? '$' : `${saleData.discount.value}%`}):</span>
              <span>-{formatCurrency(saleData.discount.amount)}</span>
            </div>
            <div className="thermal-separator" style={{ margin: '2mm 0', borderTopStyle: 'dashed' }}></div>
          </>
        ) : null}

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