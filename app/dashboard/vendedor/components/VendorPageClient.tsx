'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { formatAsCLP } from '@/lib/formatters';
import { calculateUnifiedPricing } from '@/lib/unified-pricing-service';
import SaleModal from './SaleModal';
import CartModal from './CartModal';
import ProductCategories from './ProductCategories';
import ProductBrands from './ProductBrands';
import ProductCatalog from './ProductCatalog';
import SalesHistory from './SalesHistory';
import FloatingCartButton from './FloatingCartButton';
import MobileNavBar from './MobileNavBar';
import DesktopNavTabs from './DesktopNavTabs';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brand_name: string;
  total_stock: number;
  type_name?: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  stockEntryId: string;
  quantity: number;
  saleFormat: 'unitario' | 'display' | 'pallet';
  unitPrice: number;

  wholesalePrice?: number;
  appliedPrice: number;
  appliedPriceType: 'unit' | 'wholesale';
  totalPrice: number;
  savings?: number;
  // Enhanced stock entry information
  stockEntry?: {
    barcode?: string;
    expiration_date?: string | null;
    current_quantity?: number;
  };
}

interface VendorPageClientProps {
  products: Product[];
  searchTerm: string;
  categoryFilter: string;
  brandFilter: string;
  productTypes: ProductType[];
  brands: Brand[];
  productsError: any;
}

export default function VendorPageClient({
  products,
  searchTerm,
  categoryFilter,
  brandFilter,
  productTypes,
  brands,
  productsError
}: VendorPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'catalog' | 'scanner' | 'sales'>('scanner');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const [saleModalMode, setSaleModalMode] = useState<'add-to-cart-from-scan' | 'finalize-sale' | 'direct-sale-from-scan'>('finalize-sale');
  const [scannedProduct, setScannedProduct] = useState<{
    product: Product;
    stockEntry: {
      id: string;
      sale_price_unit: number;
    
      sale_price_wholesale?: number;
      current_quantity: number;
      expiration_date?: string | null;
      barcode?: string;
      purchase_price?: number;
    };
  } | undefined>(undefined);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputTimeRef = useRef<number>(0);

  // Auto-foco en el campo de escaneo al cargar la página (solo en tab de venta rápida)
  useEffect(() => {
    if (activeTab === 'scanner' && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [activeTab]);

  // Limpiar error después de 3 segundos
  useEffect(() => {
    if (scanError) {
      const timer = setTimeout(() => {
        setScanError('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [scanError]);

  // Limpiar timer de escaneo al desmontar el componente
  useEffect(() => {
    return () => {
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
      }
    };
  }, []);

  const showError = (message: string) => {
    setScanError(message);
  };



  const searchProductByBarcode = async (barcode: string) => {
    try {
      setIsScanning(true);
      const response = await fetch(`/api/products/by-barcode?barcode=${encodeURIComponent(barcode)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar producto');
      }

      if (!data.product || !data.stockEntry) {
        showError('Producto no encontrado o sin stock disponible');
        return;
      }

      // Usar directamente el stock entry específico devuelto por la API
      openAddToCartModal(data.product, data.stockEntry);
    } catch (error) {
      console.error('Error searching by barcode:', error);
      showError(error instanceof Error ? error.message : 'Error al buscar producto');
    } finally {
      setIsScanning(false);
    }
  };

  const openAddToCartModal = (product: Product, stockEntry: any) => {
    setScannedProduct({
      product,
      stockEntry: {
        id: stockEntry.id,
        sale_price_unit: stockEntry.sale_price_unit,
  
        sale_price_wholesale: stockEntry.sale_price_wholesale,
        current_quantity: stockEntry.current_quantity,
        expiration_date: stockEntry.expiration_date,
        barcode: stockEntry.barcode,
        purchase_price: stockEntry.purchase_price
      }
    });
    setSaleModalMode('add-to-cart-from-scan');
    setSaleModalOpen(true);
  };

  const addToCart = (product: Product, stockEntry: any) => {

    setCart(prevCart => {
      const existingItem = prevCart.find(item =>
        item.product.id === product.id && item.stockEntryId === stockEntry.id
      );

      if (existingItem) {
        // Verificar si hay suficiente stock
        if (existingItem.quantity >= stockEntry.current_quantity) {
          showError(`Stock insuficiente. Solo quedan ${stockEntry.current_quantity} unidades.`);
          return prevCart;
        }

        // Incrementar cantidad y recalcular precios
        const newQuantity = existingItem.quantity + 1;
        
        // Crear stock entry para el cálculo unificado
        const stockEntryForCalc = {
          id: stockEntry.id,
          product_id: product.id,
          barcode: stockEntry.barcode || '',
          current_quantity: stockEntry.current_quantity,
          initial_quantity: stockEntry.current_quantity,
          expiration_date: stockEntry.expiration_date || null,
          created_at: new Date().toISOString(),
          purchase_price: 0,
          sale_price_unit: existingItem.unitPrice,
  
          sale_price_wholesale: item.wholesalePrice || existingItem.wholesalePrice || null
        };
        
        const pricingInfo = calculateUnifiedPricing(stockEntryForCalc, newQuantity, 'unitario');

        return prevCart.map(item =>
          item.product.id === product.id && item.stockEntryId === stockEntry.id
            ? {
              ...item,
              quantity: newQuantity,
              appliedPrice: pricingInfo.appliedPrice,
              appliedPriceType: pricingInfo.priceType as 'unit' | 'wholesale',
              totalPrice: pricingInfo.totalPrice,
              savings: pricingInfo.savings
            }
            : item
        );
      } else {
        // Añadir nuevo item con cálculo de wholesale pricing
        const baseItem = {
          product,
          stockEntryId: stockEntry.id,
          quantity: 1,
          saleFormat: 'unitario' as const,
          unitPrice: stockEntry.sale_price_unit || 0,

          wholesalePrice: stockEntry.sale_price_wholesale
        };

        // Crear stock entry para el cálculo unificado
        const stockEntryForCalc = {
          id: stockEntry.id,
          product_id: product.id,
          barcode: stockEntry.barcode || '',
          current_quantity: stockEntry.current_quantity,
          initial_quantity: stockEntry.current_quantity,
          expiration_date: stockEntry.expiration_date || null,
          created_at: new Date().toISOString(),
          purchase_price: 0,
          sale_price_unit: baseItem.unitPrice,

          sale_price_wholesale: baseItem.wholesalePrice || null
        };
        
        const pricingInfo = calculateUnifiedPricing(stockEntryForCalc, 1, 'unitario');

        return [...prevCart, {
          ...baseItem,
          appliedPrice: pricingInfo.appliedPrice,
          appliedPriceType: pricingInfo.priceType as 'unit' | 'wholesale',
          totalPrice: pricingInfo.totalPrice,
          savings: pricingInfo.savings,
          stockEntry: {
            barcode: stockEntry.barcode,
            expiration_date: stockEntry.expiration_date,
            current_quantity: stockEntry.current_quantity
          }
        }];
      }
    });
  };

  const updateCartItemQuantity = (stockEntryId: string, productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(stockEntryId, productId);
      return;
    }

    setCart(prevCart =>
      prevCart.map(item => {
        if (item.product.id === productId && item.stockEntryId === stockEntryId) {
          // Crear stock entry para el cálculo unificado
          const stockEntryForCalc = {
            id: stockEntryId,
            product_id: productId,
            barcode: '',
            current_quantity: 999, // Usar un valor alto para no limitar el cálculo
            initial_quantity: 999,
            expiration_date: null,
            created_at: new Date().toISOString(),
            purchase_price: 0,
            sale_price_unit: item.unitPrice,
    
            sale_price_wholesale: item.wholesalePrice || null
          };
          
          const pricingInfo = calculateUnifiedPricing(stockEntryForCalc, newQuantity, 'unitario');

          return {
            ...item,
            quantity: newQuantity,
            appliedPrice: pricingInfo.appliedPrice,
            appliedPriceType: pricingInfo.priceType as 'unit' | 'wholesale',
            totalPrice: pricingInfo.totalPrice,
            savings: pricingInfo.savings
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (stockEntryId: string, productId: string) => {
    setCart(prevCart =>
      prevCart.filter(item =>
        !(item.product.id === productId && item.stockEntryId === stockEntryId)
      )
    );
  };

  const handleScanInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentTime = Date.now();
    const timeSinceLastInput = currentTime - lastInputTimeRef.current;

    setScanInput(value);
    lastInputTimeRef.current = currentTime;

    // Limpiar timer anterior si existe
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    // Si el input tiene contenido
    if (value.trim().length > 0) {
      // Detectar si es entrada rápida (probablemente escáner)
      // Los escáneres típicamente ingresan caracteres en menos de 50ms
      const isLikelyScanner = value.length > 3 && (
        timeSinceLastInput < 100 || // Entrada muy rápida
        value.length > 8 // Códigos de barras suelen ser largos
      );

      // Establecer timer para procesar automáticamente
      // Tiempo más corto para escáneres, más largo para entrada manual
      const delay = isLikelyScanner ? 200 : 1000;

      scanTimerRef.current = setTimeout(() => {
        if (value.trim().length >= 3) { // Mínimo 3 caracteres para procesar
          processBarcode(value.trim());
        }
      }, delay);
    }
  };

  const processBarcode = (barcode: string) => {
    searchProductByBarcode(barcode);
    setScanInput('');
    // Limpiar timer
    if (scanTimerRef.current) {
      clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    // Recuperar foco después de un breve delay
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  };

  const handleScanInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scanInput.trim()) {
      e.preventDefault();
      // Limpiar timer si existe
      if (scanTimerRef.current) {
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      processBarcode(scanInput.trim());
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.totalPrice || 0), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      showError('El carrito está vacío');
      return;
    }
    setCartModalOpen(true);
  };

  const handleSaleCompleted = (saleData?: { productIds?: string[] }) => {
    setCart([]);
    setSaleModalOpen(false);
    setCartModalOpen(false);
    setScannedProduct(undefined);
    router.refresh();
    // Recuperar foco en el campo de escaneo
    setTimeout(() => {
      if (scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  };

  const handleItemAddedToCart = (item: {
    product: Product;
    stockEntryId: string;
    quantity: number;
    saleFormat: 'unitario';
    price: number;
    wholesalePrice?: number;
  }) => {

    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem =>
        cartItem.product.id === item.product.id &&
        cartItem.stockEntryId === item.stockEntryId
      );

      if (existingItem) {
        // Incrementar cantidad del item existente y recalcular precios
        const newQuantity = existingItem.quantity + item.quantity;
        
        // Crear stock entry para el cálculo unificado
        const stockEntryForCalc = {
          id: item.stockEntryId,
          product_id: item.product.id,
          barcode: '',
          current_quantity: 999,
          initial_quantity: 999,
          expiration_date: null,
          created_at: new Date().toISOString(),
          purchase_price: 0,
          sale_price_unit: existingItem.unitPrice,
  
          sale_price_wholesale: existingItem.wholesalePrice || null
        };
        
        const pricingInfo = calculateUnifiedPricing(stockEntryForCalc, newQuantity, item.saleFormat);

        return prevCart.map(cartItem =>
          cartItem.product.id === item.product.id && cartItem.stockEntryId === item.stockEntryId
            ? {
              ...cartItem,
              quantity: newQuantity,
              appliedPrice: pricingInfo.appliedPrice,
              appliedPriceType: pricingInfo.priceType as 'unit' | 'wholesale',
              totalPrice: pricingInfo.totalPrice,
              savings: pricingInfo.savings
            }
            : cartItem
        );
      } else {
        // Añadir nuevo item al carrito con estructura completa
        const baseItem = {
          product: item.product,
          stockEntryId: item.stockEntryId,
          quantity: item.quantity,
          saleFormat: item.saleFormat,
          unitPrice: item.price,

          wholesalePrice: item.wholesalePrice
        };

        // Crear stock entry para el cálculo unificado
        const stockEntryForCalc = {
          id: item.stockEntryId,
          product_id: item.product.id,
          barcode: '',
          current_quantity: 999,
          initial_quantity: 999,
          expiration_date: null,
          created_at: new Date().toISOString(),
          purchase_price: 0,
          sale_price_unit: item.price,

          sale_price_wholesale: item.wholesalePrice || null
        };
        
        const pricingInfo = calculateUnifiedPricing(stockEntryForCalc, item.quantity, item.saleFormat);

        return [...prevCart, {
          ...baseItem,
          appliedPrice: pricingInfo.appliedPrice,
          appliedPriceType: pricingInfo.priceType as 'unit' | 'wholesale',
          totalPrice: pricingInfo.totalPrice,
          savings: pricingInfo.savings
        }];
      }
    });

    // Limpiar producto escaneado y recuperar foco
    setScannedProduct(undefined);
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  const renderQuickSaleContent = () => (
    <div className="flex flex-col lg:flex-row gap-6 p-4 min-h-full">
      {/* Panel izquierdo - Campo de escaneo y información */}
      <div className="lg:w-2/3 space-y-6">
        {/* Campo de escaneo continuo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-black">Escaneo Rápido</h2>
              <p className="text-sm text-gray-600">Escanee productos para añadirlos al carrito</p>
            </div>
          </div>

          <div className="relative">
            <input
              ref={scanInputRef}
              type="text"
              value={scanInput}
              onChange={handleScanInputChange}
              onKeyDown={handleScanInputKeyDown}
              className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-gray-50"
              placeholder="Escanee código de barras (automático) o escriba para buscar..."
              autoFocus
              disabled={isScanning}
            />
            {isScanning && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Mensaje de error */}
          {scanError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{scanError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instrucciones */}
          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-black">Escáner de Código:</p>
                <p className="text-gray-600">Se procesa automáticamente sin presionar Enter</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="font-medium text-black">Entrada Manual:</p>
                <p className="text-gray-600">Escriba lentamente o presione Enter para buscar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Información de productos encontrados */}
        {searchTerm && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-sm text-gray-600">
              Mostrando resultados para: <span className="font-medium text-black">"{searchTerm}"</span>
            </div>
          </div>
        )}
      </div>

      {/* Panel derecho - Carrito de compras */}
      <div className="lg:w-1/3">
        <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L4 5H2m5 8v8a2 2 0 002 2h8a2 2 0 002-2v-8" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">Carrito de Compras</h3>
              <p className="text-sm text-gray-600">{cart.length} items</p>
            </div>
          </div>

          {/* Lista de items del carrito */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L4 5H2m5 8v8a2 2 0 002 2h8a2 2 0 002-2v-8" />
                </svg>
                <p>Carrito vacío</p>
                <p className="text-sm">Escanee productos para comenzar</p>
              </div>
            ) : (
              cart.map((item, index) => (
                <div key={`${item.product.id}-${item.stockEntryId}-${index}`} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start space-x-3">
                    {/* Imagen del producto */}
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Información del producto */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-black truncate">{item.product.name}</h4>
                      <p className="text-xs text-gray-600">{item.product.brand_name}</p>
                      
                      {/* Stock Entry Information */}
                      {item.stockEntry && (
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Lote:</span>
                            <span className="font-medium text-black">#{String(item.stockEntryId).slice(-4)}</span>
                          </div>
                          {item.stockEntry.barcode && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Código:</span>
                              <span className="font-medium text-black">{item.stockEntry.barcode}</span>
                            </div>
                          )}
                          {item.stockEntry.expiration_date && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Vence:</span>
                              <span className={`font-medium ${(() => {
                                const expirationDate = new Date(item.stockEntry.expiration_date!);
                                const today = new Date();
                                const diffDays = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                if (diffDays <= 0) return 'text-red-600';
                                if (diffDays <= 7) return 'text-orange-600';
                                if (diffDays <= 30) return 'text-yellow-600';
                                return 'text-green-600';
                              })()}`}>
                                {new Date(item.stockEntry.expiration_date).toLocaleDateString('es-CL', { 
                                  day: '2-digit', 
                                  month: '2-digit' 
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-1 mt-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-black">
                            <span style={{color: '#000000'}}>{formatAsCLP(item.appliedPrice)}</span>
                            {item.appliedPriceType === 'wholesale' && (
                              <span className="text-xs text-purple-600 ml-1">🎉 Mayorista</span>
                            )}
                          </p>
                          {item.wholesalePrice && item.quantity >= 3 && item.appliedPriceType !== 'wholesale' && (
                            <span className="text-xs text-purple-500 bg-purple-50 px-1 rounded">
                              ¡Mayorista disponible!
                            </span>
                          )}
                        </div>
                        {item.savings && item.savings > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            💰 Ahorro: {formatAsCLP(item.savings)}
                          </p>
                        )}
                        {item.appliedPriceType === 'wholesale' && (
                          <p className="text-xs text-purple-600">
                            Precio mayorista aplicado (3+ unidades)
                          </p>
                        )}
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.stockEntryId, item.product.id, item.quantity - 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="text-sm font-medium text-black min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItemQuantity(item.stockEntryId, item.product.id, item.quantity + 1)}
                          className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-300"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeFromCart(item.stockEntryId, item.product.id)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Subtotal */}
                      <p className="text-sm font-semibold text-black mt-1">
                        Subtotal: {formatAsCLP(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total y botón de finalizar */}
          {cart.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-black">Total:</span>
                <span className="text-xl font-bold text-black">{formatAsCLP(getTotalAmount())}</span>
              </div>

              <button
                onClick={handleFinalizeSale}
                className="w-full py-4 px-4 bg-green-600 text-white rounded-lg shadow-sm text-lg font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              >
                Finalizar Venta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'scanner':
        return renderQuickSaleContent();

      case 'sales':
        return (
          <div className="space-y-6 p-4">
            {/* Título para desktop */}
            <div className="hidden md:block bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-black">Historial de Ventas</h2>
                  <p className="text-sm text-gray-600">
                    Revise todas las transacciones realizadas en el día de hoy
                  </p>
                </div>
              </div>
            </div>

            <SalesHistory />
          </div>
        );

      case 'catalog':
      default:
        return (
          <div className="space-y-6 p-4">
            {/* Categorías de Productos */}
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <ProductCategories
                productTypes={productTypes}
                products={products}
              />
            </Suspense>

            {/* Filtrado por Marcas */}
            <Suspense fallback={<div className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <ProductBrands
                brands={brands}
                products={products}
              />
            </Suspense>

            {/* Indicador de búsqueda activa */}
            {searchTerm && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <div className="text-sm text-gray-600">
                  Mostrando resultados para: <span className="font-medium text-black">"{searchTerm}"</span>
                </div>
              </div>
            )}

            {/* Catálogo de productos */}
            <Suspense fallback={<div className="h-64 bg-gray-200 rounded-lg animate-pulse"></div>}>
              <ProductCatalog
                products={products}
                searchTerm={searchTerm}
                categoryFilter={categoryFilter}
                brandFilter={brandFilter}
                onAddToCart={addToCart}
              />
            </Suspense>
          </div>
        );
    }
  };

  return (
    <div className="min-h-full">
      {/* Navegación por tabs para desktop (oculta en mobile) */}
      <DesktopNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenido principal con padding bottom para la barra móvil */}
      <div className="pb-20 md:pb-0 min-h-full">
        {renderContent()}
      </div>

      {/* Barra de navegación móvil (solo visible en mobile) */}
      <MobileNavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Botón flotante del carrito (solo visible en catalog) */}
      {activeTab === 'catalog' && (
        <FloatingCartButton
          cartItems={cart}
          totalItems={getTotalItems()}
          onUpdateQuantity={updateCartItemQuantity}
          onRemoveItem={removeFromCart}
          onSaleCompleted={handleSaleCompleted}
        />
      )}

      {/* Modal de venta */}
      <SaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        mode={saleModalMode}
        scannedItem={scannedProduct}
        onItemAddedToCart={handleItemAddedToCart}
        cartItems={cart}
        onSaleCompleted={handleSaleCompleted}
      />

      {/* Modal del carrito */}
      <CartModal
        isOpen={cartModalOpen}
        onClose={() => setCartModalOpen(false)}
        cartItems={cart}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeFromCart}
        onSaleCompleted={handleSaleCompleted}
      />
    </div>
  );
}