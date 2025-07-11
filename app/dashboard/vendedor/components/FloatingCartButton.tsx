'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CartModal from './CartModal';

export default function FloatingCartButton() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const router = useRouter();

  const handleOpenCart = () => {
    setIsCartOpen(true);
  };

  const handleCloseCart = () => {
    setIsCartOpen(false);
  };

  const handleSaleCompleted = () => {
    // Refrescar la página para actualizar los datos
    router.refresh();
    setIsCartOpen(false);
  };

  return (
    <>
      {/* Botón flotante adaptado al nuevo layout */}
      <button
        onClick={handleOpenCart}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 bg-blue-600 hover:bg-blue-700 text-white p-3 md:p-4 rounded-full shadow-lg transition-all duration-200 z-40 flex items-center justify-center group"
        title="Abrir Carrito"
      >
        <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
        {/* Texto visible solo en desktop */}
        <span className="ml-2 text-sm font-medium hidden md:inline">Carrito</span>
        
        {/* Badge de notificación (para futuro uso) */}
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          0
        </div>
      </button>

      {/* Modal del carrito */}
      <CartModal
        isOpen={isCartOpen}
        onClose={handleCloseCart}
        initialProduct={null}
        onSaleCompleted={handleSaleCompleted}
      />
    </>
  );
} 