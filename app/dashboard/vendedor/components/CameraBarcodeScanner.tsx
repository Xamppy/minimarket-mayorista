'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function CameraBarcodeScanner({ isOpen, onClose, onScan }: CameraBarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Play beep sound using Web Audio API
  const playBeep = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1000; // 1000 Hz beep
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      // Ignore audio errors silently
    }
  }, []);

  // Handle successful scan
  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    // Prevent double scans within 2 seconds
    if (now - lastScanRef.current < 2000) {
      return;
    }
    lastScanRef.current = now;
    
    playBeep();
    onScan(decodedText);
  }, [onScan, playBeep]);

  // Initialize scanner
  const initializeScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    setIsInitializing(true);
    setError(null);

    try {
      const html5Qrcode = new Html5Qrcode('camera-scanner-container');
      scannerRef.current = html5Qrcode;

      // Try to get the back camera (environment facing)
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
      };

      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        handleScanSuccess,
        () => {
          // QR code scan error (ignore, this fires when no code is detected)
        }
      );

      setHasPermission(true);
    } catch (err) {
      console.error('Camera scanner error:', err);
      setHasPermission(false);
      
      if (err instanceof Error) {
        if (err.message.includes('Permission denied') || err.message.includes('NotAllowedError')) {
          setError('Permiso de cámara denegado. Por favor, permita el acceso a la cámara en la configuración de su navegador.');
        } else if (err.message.includes('NotFoundError') || err.message.includes('No camera')) {
          setError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setError(`Error al inicializar la cámara: ${err.message}`);
        }
      } else {
        setError('Error desconocido al inicializar la cámara.');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [handleScanSuccess]);

  // Cleanup scanner
  const cleanupScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.error('Error cleaning up scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  // Handle open/close
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the container is rendered
      const timer = setTimeout(() => {
        initializeScanner();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      cleanupScanner();
      setError(null);
      setHasPermission(null);
    }
  }, [isOpen, initializeScanner, cleanupScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupScanner();
    };
  }, [cleanupScanner]);

  // Handle close button
  const handleClose = useCallback(() => {
    cleanupScanner();
    onClose();
  }, [cleanupScanner, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Escanear Código</h3>
              <p className="text-blue-100 text-xs">Apunte la cámara al código de barras</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cerrar escáner"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scanner Container */}
        <div className="relative" ref={containerRef}>
          {/* Camera viewport */}
          <div 
            id="camera-scanner-container" 
            className="w-full bg-black"
            style={{ minHeight: '300px' }}
          />

          {/* Loading overlay */}
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4" />
              <p className="text-white text-sm">Iniciando cámara...</p>
            </div>
          )}

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 p-6">
              <div className="p-3 bg-red-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-white text-center text-sm mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setHasPermission(null);
                  initializeScanner();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Scan overlay/frame */}
          {hasPermission && !isInitializing && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-white/50 rounded-lg relative">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                
                {/* Scan line animation */}
                <div className="absolute inset-x-2 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t">
          <p className="text-center text-gray-600 text-xs">
            Coloque el código de barras dentro del recuadro
          </p>
        </div>
      </div>
    </div>
  );
}
