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
    
    // Force background to gray for paper effect
    document.body.style.backgroundColor = '#e5e7eb';
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
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !saleData) {
    return (
      <div className="min-h-screen bg-gray-200 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-sm">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{error || 'Venta no encontrada'}</p>
        </div>
      </div>
    );
  }

  const maxTextWidth = calculateOptimalTextWidth();

  return (
    <>
      {/* Inject thermal print styles */}
      <ThermalPrintStyles />

      {/* Screen-only wrapper with gray background */}
      <div className="min-h-screen bg-gray-200 py-8 px-4 print:bg-white print:p-0 print:min-h-0">
        
        {/* Paper-like ticket container for SCREEN */}
        <div className="
          max-w-[350px] mx-auto bg-white 
          shadow-[0_10px_40px_rgba(0,0,0,0.15)] 
          rounded-lg overflow-hidden
          font-mono text-gray-900
          print:max-w-none print:shadow-none print:rounded-none print:overflow-visible
        ">
          
          {/* Decorative top edge - scissors/cut line effect */}
          <div className="h-3 bg-gradient-to-r from-gray-100 via-white to-gray-100 border-b-2 border-dashed border-gray-300 print:hidden"></div>
          
          {/* Main ticket content */}
          <div className="p-6 print:p-0">
            
            {/* === THERMAL TICKET CONTENT (prints exactly) === */}
            <div className="thermal-ticket">
              
              {/* Header Section */}
              <div className="text-center mb-4 print:mb-0">
                <h1 className="text-xl font-bold text-gray-900 tracking-wide print:text-base thermal-header">
                  MINIMARKET DON ALE
                </h1>
                <p className="text-sm text-gray-600 font-semibold mt-1 print:text-xs thermal-section">
                  Ticket de Venta
                </p>
              </div>
              
              {/* Separator */}
              <div className="border-b-2 border-dashed border-gray-300 my-4 print:my-2 thermal-separator"></div>

              {/* Sale Information Section */}
              <div className="space-y-2 text-sm print:text-xs thermal-body">
                <div className="flex justify-between thermal-row">
                  <span className="text-gray-600">Ticket #:</span>
                  <span className="font-semibold text-gray-900">
                    {saleData.ticket_number ? saleData.ticket_number.toString().padStart(10, '0') : truncateText(saleData.id, 8)}
                  </span>
                </div>
                <div className="flex justify-between thermal-row">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-semibold text-gray-900">{saleData.formattedDate}</span>
                </div>
                <div className="flex justify-between thermal-row">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-semibold text-gray-900">{saleData.formattedTime}</span>
                </div>
                <div className="flex justify-between thermal-row">
                  <span className="text-gray-600">Vendedor:</span>
                  <span className="font-semibold text-gray-900 text-right max-w-[180px] truncate">
                    {truncateText(saleData.seller_email, 25)}
                  </span>
                </div>
                {saleData.itemCount && (
                  <div className="flex justify-between thermal-row">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-semibold text-gray-900">{saleData.itemCount}</span>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="border-b-2 border-dashed border-gray-300 my-4 print:my-2 thermal-separator"></div>

              {/* Products Section */}
              <div className="text-center mb-3 print:mb-1">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider print:text-xs thermal-section">
                  Productos Vendidos
                </h2>
              </div>
              
              <div className="space-y-3 print:space-y-1">
                {saleData.sale_items.map((item, index) => {
                  const wholesaleInfo = formatWholesaleInfo(item);
                  
                  return (
                    <div key={item.id} className="thermal-product-item">
                      {/* Product name */}
                      <div className="font-bold text-sm text-gray-900 print:text-xs thermal-body thermal-bold thermal-wrap">
                        {formatProductName(item.product_name, maxTextWidth - 5)}
                      </div>

                      {/* Price row */}
                      <div className="flex justify-between items-baseline mt-1 text-sm print:text-xs thermal-price-row">
                        <span className="text-gray-600 thermal-price-left">
                          {item.quantity_sold} x {formatCurrency(item.price_at_sale)}
                        </span>
                        <span className="font-bold text-gray-900 thermal-price-right thermal-bold">
                          {formatCurrency(item.quantity_sold * item.price_at_sale)}
                        </span>
                      </div>
                      
                      {/* Wholesale savings */}
                      {wholesaleInfo.showWholesale && (
                        <div className="text-xs text-green-600 font-semibold mt-1 thermal-small thermal-bold">
                          ✓ Ahorro: {wholesaleInfo.savingsText}
                        </div>
                      )}
                      
                      {/* Item separator */}
                      {index < saleData.sale_items.length - 1 && (
                        <div className="border-b border-gray-200 my-2 print:my-1 thermal-separator"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Separator before totals */}
              <div className="border-b-2 border-dashed border-gray-300 my-4 print:my-2 thermal-separator"></div>
              
              {/* Discount Section (only if discount exists) */}
              {saleData.discount && saleData.discount.amount > 0 && (
                <>
                  <div className="space-y-2 text-sm print:text-xs mb-3">
                    <div className="flex justify-between thermal-row">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(saleData.subtotal || (saleData.total_amount + saleData.discount.amount))}
                      </span>
                    </div>
                    <div className="flex justify-between thermal-row">
                      <span className="text-gray-600">
                        Descuento {saleData.discount.type === 'amount' ? '($)' : `(${saleData.discount.value}%)`}:
                      </span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(saleData.discount.amount)}
                      </span>
                    </div>
                  </div>
                  <div className="border-b-2 border-dashed border-gray-300 my-3 print:my-2 thermal-separator"></div>
                </>
              )}

              {/* Total */}
              <div className="flex justify-between items-center py-3 print:py-1 thermal-row thermal-section">
                <span className="text-base font-bold text-gray-900 print:text-sm">TOTAL A PAGAR:</span>
                <span className="text-xl font-bold text-gray-900 print:text-base thermal-bold">
                  {formatCurrency(saleData.total_amount)}
                </span>
              </div>

              {/* Separator */}
              <div className="border-b-2 border-dashed border-gray-300 my-4 print:my-2 thermal-separator"></div>

              {/* Footer Section */}
              <div className="text-center space-y-1 text-sm text-gray-600 print:text-xs thermal-center thermal-small">
                <p className="font-semibold text-gray-900">¡Gracias por su compra!</p>
                <p>Conserve este ticket como</p>
                <p>comprobante de su compra</p>
                <p className="text-xs text-gray-400 mt-3 print:mt-1">Sistema MiniMarket Pro</p>
              </div>
              
            </div>
            {/* === END THERMAL TICKET CONTENT === */}
            
          </div>
          
          {/* Decorative bottom edge - torn paper effect */}
          <div className="h-4 bg-gradient-to-b from-white to-gray-100 print:hidden"
            style={{
              maskImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0 Q 5 10 10 0 T 20 0 T 30 0 T 40 0 T 50 0 T 60 0 T 70 0 T 80 0 T 90 0 T 100 0 V10 H0Z\' fill=\'white\'/%3E%3C/svg%3E")',
              WebkitMaskImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0 Q 5 10 10 0 T 20 0 T 30 0 T 40 0 T 50 0 T 60 0 T 70 0 T 80 0 T 90 0 T 100 0 V10 H0Z\' fill=\'white\'/%3E%3C/svg%3E")',
              maskSize: '100% 100%',
              WebkitMaskSize: '100% 100%'
            }}
          ></div>
        </div>

        {/* Action Buttons - SCREEN ONLY */}
        <div className="max-w-[350px] mx-auto mt-6 space-y-3 print:hidden">
          
          {/* Print Status */}
          {isPrinting && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="font-medium">Preparando impresión...</span>
              </div>
            </div>
          )}
          
          {printError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <p className="text-red-600 font-medium">❌ Error: {printError}</p>
            </div>
          )}
          
          {isPDFFormat ? (
            /* PDF Mode Controls */
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <span className="text-xl">📄</span>
                  <span className="font-bold">Modo Guardar como PDF</span>
                </div>
                <p className="text-sm text-green-600">Usa Ctrl+P o Cmd+P para guardar este ticket como PDF</p>
              </div>

              <button 
                onClick={() => window.print()}
                className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Guardar como PDF
              </button>
              
              <button 
                onClick={() => window.close()}
                className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200"
              >
                ❌ Cerrar Ventana
              </button>
            </>
          ) : (
            /* Thermal Print Mode Controls */
            <>
              {/* Instructions Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <span className="text-xl">🖨️</span>
                  <span className="font-bold">Instrucciones de Impresión</span>
                </div>
                <ul className="text-sm text-blue-600 space-y-1 ml-7">
                  <li>• Impresora térmica encendida y conectada</li>
                  <li>• Seleccionar impresora en el diálogo</li>
                  <li>• Tamaño de papel: 80mm</li>
                </ul>
              </div>

              {/* Print Button */}
              <button 
                onClick={() => print()}
                disabled={isPrinting}
                className={`
                  w-full py-4 px-6 font-bold rounded-xl shadow-lg 
                  transition-all duration-200 flex items-center justify-center gap-3
                  ${isPrinting 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl text-white'
                  }
                `}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isPrinting ? 'Imprimiendo...' : 'Imprimir Ticket'}
              </button>
              
              {/* Close Button */}
              <button 
                onClick={() => window.close()}
                className="w-full py-3 px-6 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200"
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