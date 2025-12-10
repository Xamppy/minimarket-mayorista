'use client';

import { useState, useEffect, useRef } from 'react';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  total_stock: number;
  image_url: string | null;
}

interface BarcodeScannerProps {
  onProductFound: (product: Product) => void;
  onError: (error: string) => void;
}

export default function BarcodeScanner({ onProductFound, onError }: BarcodeScannerProps) {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastInputTime, setLastInputTime] = useState<number>(0);
  const [scanBuffer, setScanBuffer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático inteligente
  useEffect(() => {
    let userIsInteracting = false;
    let lastInteractionTime = 0;

    const handleUserInteraction = () => {
      userIsInteracting = true;
      lastInteractionTime = Date.now();
    };

    const focusInput = () => {
      const currentTime = Date.now();
      const timeSinceLastInteraction = currentTime - lastInteractionTime;
      
      // Solo enfocar si:
      // 1. El usuario no está interactuando activamente con otros elementos
      // 2. Ha pasado suficiente tiempo desde la última interacción (3 segundos)
      // 3. No hay otro elemento enfocado que sea parte de la interfaz
      if (
        inputRef.current && 
        (!userIsInteracting || timeSinceLastInteraction > 3000) &&
        (document.activeElement === document.body || 
         document.activeElement === inputRef.current ||
         document.activeElement?.tagName === 'HTML')
      ) {
        inputRef.current.focus();
      }
      
      // Resetear flag de interacción después de 3 segundos
      if (timeSinceLastInteraction > 3000) {
        userIsInteracting = false;
      }
    };

    // Foco inicial
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    // Detectar interacciones del usuario
    const interactionEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { passive: true });
    });

    // Mantener foco con menos frecuencia y más inteligencia
    const intervalId = setInterval(focusInput, 2000);

    // Limpiar en cleanup
    return () => {
      clearInterval(intervalId);
      interactionEvents.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  // Detectar entrada rápida (típica de escáner)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const currentTime = Date.now();
    
    setBarcode(value);
    
    // Si hay más de 3 caracteres y el tiempo entre entrada es menor a 100ms, 
    // probablemente es un escáner
    if (value.length > 3 && (currentTime - lastInputTime) < 100) {
      setScanBuffer(value);
    }
    
    setLastInputTime(currentTime);
  };

  // Manejar Enter o entrada rápida completa
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      await processBarcode(barcode);
    }
  };

  // Detectar cuando se completa la entrada del escáner
  useEffect(() => {
    if (scanBuffer.length > 0) {
      const timeoutId = setTimeout(async () => {
        if (scanBuffer === barcode && barcode.length > 3) {
          await processBarcode(barcode);
        }
      }, 150); // Esperar un poco para asegurar que la entrada esté completa

      return () => clearTimeout(timeoutId);
    }
  }, [scanBuffer, barcode]);

  const processBarcode = async (scannedBarcode: string) => {
    if (!scannedBarcode.trim() || isScanning) return;

    setIsScanning(true);
    
    try {
      console.log('--- FRONTEND SCAN ---');
      console.log('Sending Code:', scannedBarcode.trim());
      
      const response = await fetch(`/api/products/by-barcode?barcode=${encodeURIComponent(scannedBarcode.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al buscar producto');
      }

      if (data.product) {
        onProductFound(data.product);
        setBarcode(''); // Limpiar después de encontrar producto
        setScanBuffer('');
      } else {
        onError(`No se encontró producto con código de barras: ${scannedBarcode}`);
        // No limpiar el campo para que el usuario pueda ver el código
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      onError(errorMessage);
    } finally {
      setIsScanning(false);
      // Refocar el input solo si no hay otros elementos activos
      setTimeout(() => {
        if (inputRef.current && 
            (document.activeElement === document.body || 
             document.activeElement?.tagName === 'HTML')) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleClearBarcode = () => {
    setBarcode('');
    setScanBuffer('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center space-x-4">
        {/* Icono de escáner */}
        <div className="flex-shrink-0">
          <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m0 14v1m8-8h-1M5 12H4m15.071-7.071l-.707.707M5.636 5.636l-.707-.707m12.728 12.728l-.707.707M5.636 18.364l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        </div>

        {/* Campo de entrada */}
        <div className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escanear código de barras..."
            disabled={isScanning}
            className="w-full px-4 py-3 text-lg border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 text-black font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Botón limpiar */}
        {barcode && (
          <button
            onClick={handleClearBarcode}
            disabled={isScanning}
            className="flex-shrink-0 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Limpiar
          </button>
        )}

        {/* Indicador de escaneo */}
        {isScanning && (
          <div className="flex-shrink-0">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="mt-4 text-sm text-gray-600">
        <p>
          <strong>Instrucciones:</strong> 
          Escanee el código de barras del producto o escriba manualmente y presione Enter.
        </p>
        <p className="mt-1">
          El campo se enfoca automáticamente cuando no está usando otros controles, permitiendo escaneo continuo sin interrumpir su navegación.
        </p>
      </div>
    </div>
  );
} 