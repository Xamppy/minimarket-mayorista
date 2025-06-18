'use client';

import { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name?: string;
  total_stock: number;
  image_url: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  saleFormat: 'unitario' | 'caja' | 'display' | 'pallet';
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted: () => void;
  initialProduct?: Product | null;
}

export default function CartModal({ isOpen, onClose, onSaleCompleted, initialProduct }: CartModalProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saleSuccess, setSaleSuccess] = useState<{ success: boolean; saleId?: string }>({ success: false });
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Agregar producto inicial al carrito cuando se abre el modal
  useEffect(() => {
    if (isOpen && initialProduct && !cartItems.some(item => item.product.id === initialProduct.id)) {
      const newItem: CartItem = {
        product: initialProduct,
        quantity: 1,
        saleFormat: 'unitario'
      };
      setCartItems([newItem]);
    }
  }, [isOpen, initialProduct]);

  if (!isOpen) return null;

  const addToCart = (product: Product) => {
    const existingItem = cartItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Si ya existe, incrementar cantidad
      setCartItems(cartItems.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: Math.min(item.quantity + 1, product.total_stock) }
          : item
      ));
    } else {
      // Si no existe, agregar nuevo item
      const newItem: CartItem = {
        product,
        quantity: 1,
        saleFormat: 'unitario'
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCartItems(cartItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems(cartItems.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: Math.min(newQuantity, item.product.total_stock) }
        : item
    ));
  };

  const updateSaleFormat = (productId: string, newFormat: 'unitario' | 'caja' | 'display' | 'pallet') => {
    setCartItems(cartItems.map(item => 
      item.product.id === productId 
        ? { ...item, saleFormat: newFormat }
        : item
    ));
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cartItems.length === 0) {
      setError('El carrito está vacío. Agrega al menos un producto.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Validar stock para todos los productos
      for (const item of cartItems) {
        if (item.quantity > item.product.total_stock) {
          throw new Error(`Stock insuficiente para ${item.product.name}. Solo hay ${item.product.total_stock} unidades disponibles.`);
        }
      }

      // Para ahora, vamos a procesar las ventas una por una usando el endpoint existente
      let lastSaleId = '';
      
      for (const item of cartItems) {
        const formData = new FormData();
        formData.append('productId', item.product.id);
        formData.append('quantity', item.quantity.toString());
        formData.append('saleFormat', item.saleFormat);

        const response = await fetch('/api/sales', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `Error al procesar la venta de ${item.product.name}`);
        }

        lastSaleId = result.saleId;
      }

      // Éxito
      setSaleSuccess({ success: true, saleId: lastSaleId });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetCart = () => {
    setCartItems([]);
    setError('');
    setSaleSuccess({ success: false });
  };

  const handleClose = () => {
    resetCart();
    onClose();
  };

  const handlePrintTicket = (saleId: string) => {
    const ticketWindow = window.open(`/ticket/${saleId}`, '_blank', 'width=400,height=600,scrollbars=yes');
    
    if (!ticketWindow) {
      alert('No se pudo abrir la ventana de impresión. Verifique que no esté bloqueando ventanas emergentes.');
      return;
    }
  };

  const handleCompleteSale = () => {
    onSaleCompleted();
    onClose();
    resetCart();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-black">
            Carrito de Compras
            {cartItems.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({getTotalItems()} productos)
              </span>
            )}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {saleSuccess.success ? (
          /* Pantalla de éxito */
          <div className="space-y-4">
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <svg className="mx-auto h-12 w-12 text-green-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                ¡Venta Exitosa!
              </h3>
              <p className="text-green-700">
                La venta se ha procesado correctamente.
              </p>
              <p className="text-sm text-green-600 mt-2">
                Último Ticket #{saleSuccess.saleId}
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => saleSuccess.saleId && handlePrintTicket(saleSuccess.saleId)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
              >
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V9a2 2 0 00-2-2H9a2 2 0 00-2 2v.01" />
                </svg>
                Imprimir Último Ticket
              </button>

              <button
                type="button"
                onClick={handleCompleteSale}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continuar sin Imprimir
              </button>
            </div>
          </div>
        ) : (
          /* Carrito de compras */
          <div className="space-y-6">
            {/* Lista de productos en el carrito */}
            {cartItems.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-black">Productos en el carrito:</h3>
                  <button
                    onClick={() => setShowAddProduct(!showAddProduct)}
                    className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                    disabled={loading}
                  >
                    + Agregar Producto
                  </button>
                </div>
                
                {cartItems.map((item) => (
                  <div key={item.product.id} className="bg-gray-50 rounded-lg p-4 border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-black">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">Marca: {item.product.brand_name}</p>
                        {item.product.type_name && (
                          <p className="text-sm text-gray-500">Tipo: {item.product.type_name}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Stock disponible: {item.product.total_stock} unidades
                        </p>
                      </div>
                      
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700 ml-4"
                        disabled={loading}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cantidad */}
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                          min="1"
                          max={item.product.total_stock}
                          disabled={loading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                        />
                      </div>
                      
                      {/* Formato */}
                      <div>
                        <label className="block text-sm font-medium text-black mb-1">
                          Formato
                        </label>
                        <select
                          value={item.saleFormat}
                          onChange={(e) => updateSaleFormat(item.product.id, e.target.value as any)}
                          disabled={loading}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black"
                        >
                          <option value="unitario">Unitario</option>
                          <option value="caja">Caja</option>
                          <option value="display">Display</option>
                          <option value="pallet">Pallet</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p>El carrito está vacío</p>
                <p className="text-sm">Agrega productos desde el catálogo</p>
              </div>
            )}

            {/* Mensaje de error */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              
              {cartItems.length > 0 && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || cartItems.length === 0}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : `Confirmar Venta (${getTotalItems()} productos)`}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 