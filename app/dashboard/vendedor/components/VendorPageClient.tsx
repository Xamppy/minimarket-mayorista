'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProductCards from './ProductCards';
import BarcodeScanner from './BarcodeScanner';
import CartModal from './CartModal';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name?: string;
  total_stock: number;
  image_url: string | null;
}

interface VendorPageClientProps {
  // Solo necesitamos las funciones de callback
}

export default function VendorPageClient({ }: VendorPageClientProps) {
  const router = useRouter();
  const [scannerModalState, setScannerModalState] = useState<{
    isOpen: boolean;
    selectedProduct: Product | null;
  }>({
    isOpen: false,
    selectedProduct: null
  });
  const [scannerError, setScannerError] = useState<string>('');

  const handleSaleCompleted = () => {
    // Refrescar la página para actualizar los datos
    router.refresh();
  };

  const handleProductFound = (product: Product) => {
    setScannerModalState({
      isOpen: true,
      selectedProduct: product
    });
    setScannerError(''); // Limpiar errores previos
  };

  const handleScannerError = (error: string) => {
    setScannerError(error);
    // Limpiar el error después de 5 segundos
    setTimeout(() => {
      setScannerError('');
    }, 5000);
  };

  const handleCloseScannerModal = () => {
    setScannerModalState({
      isOpen: false,
      selectedProduct: null
    });
  };

  const handleScannerSaleCompleted = () => {
    handleSaleCompleted();
    handleCloseScannerModal();
  };

  return (
    <>
      {/* Escáner de código de barras */}
      <BarcodeScanner 
        onProductFound={handleProductFound}
        onError={handleScannerError}
      />

      {/* Mensaje de error del escáner */}
      {scannerError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{scannerError}</p>
            </div>
          </div>
        </div>
      )}



      {/* Modal del carrito desde escáner */}
      <CartModal
        isOpen={scannerModalState.isOpen}
        onClose={handleCloseScannerModal}
        initialProduct={scannerModalState.selectedProduct}
        onSaleCompleted={handleScannerSaleCompleted}
      />
    </>
  );
} 