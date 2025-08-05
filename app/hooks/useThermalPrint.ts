/**
 * Custom hook for thermal printing functionality
 */

import { useEffect, useCallback, useState } from 'react';
import { 
  THERMAL_PRINT_CONFIG, 
  generateThermalPrintCSS, 
  getBrowserPrintCapabilities
} from '../utils/thermal-printer';
import type { ThermalPrintConfig } from '../types/thermal-print';
import type { PrintCapabilities } from '../types/thermal-print';

interface UseThermalPrintOptions {
  config?: ThermalPrintConfig;
  autoprint?: boolean;
  autoprintDelay?: number;
  onPrintStart?: () => void;
  onPrintEnd?: () => void;
  onPrintError?: (error: Error) => void;
}

interface UseThermalPrintReturn {
  print: () => Promise<void>;
  isPrinting: boolean;
  printError: string | null;
  browserCapabilities: PrintCapabilities;
  injectStyles: () => void;
  removeStyles: () => void;
}

export const useThermalPrint = (
  options: UseThermalPrintOptions = {}
): UseThermalPrintReturn => {
  const {
    config = THERMAL_PRINT_CONFIG,
    autoprint = false,
    autoprintDelay = 500,
    onPrintStart,
    onPrintEnd,
    onPrintError,
  } = options;

  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [stylesInjected, setStylesInjected] = useState(false);

  const browserCapabilities = getBrowserPrintCapabilities();

  // Inject thermal print styles into the document
  const injectStyles = useCallback(() => {
    if (typeof window === 'undefined' || stylesInjected) return;

    const styleId = 'thermal-print-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.type = 'text/css';
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = generateThermalPrintCSS(config);
    setStylesInjected(true);
  }, [config, stylesInjected]);

  // Remove thermal print styles from the document
  const removeStyles = useCallback(() => {
    if (typeof window === 'undefined') return;

    const styleElement = document.getElementById('thermal-print-styles');
    if (styleElement) {
      styleElement.remove();
      setStylesInjected(false);
    }
  }, []);

  // Print function with error handling
  const print = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') {
      throw new Error('Print function can only be called in browser environment');
    }

    try {
      setIsPrinting(true);
      setPrintError(null);
      onPrintStart?.();

      // Ensure styles are injected before printing
      injectStyles();

      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 100));

      // Configure print settings based on browser capabilities
      if (browserCapabilities.isChrome || browserCapabilities.isEdge) {
        // Chrome and Edge support more print configuration
        const printOptions = {
          silent: false,
          printBackground: true,
          color: false,
          margin: {
            marginType: 'none' as const,
          },
          landscape: false,
          pagesPerSheet: 1,
          collate: true,
          copies: 1,
        };

        // Try to use the newer print API if available
        if ('print' in window) {
          window.print();
        }
      } else {
        // Fallback for other browsers
        window.print();
      }

      onPrintEnd?.();
    } catch (error) {
      const printError = error instanceof Error ? error : new Error('Unknown print error');
      setPrintError(printError.message);
      onPrintError?.(printError);
      throw printError;
    } finally {
      setIsPrinting(false);
    }
  }, [injectStyles, browserCapabilities, onPrintStart, onPrintEnd, onPrintError]);

  // Auto-print functionality
  useEffect(() => {
    if (autoprint && !isPrinting) {
      const timer = setTimeout(() => {
        print().catch(error => {
          console.error('Auto-print failed:', error);
        });
      }, autoprintDelay);

      return () => clearTimeout(timer);
    }
  }, [autoprint, autoprintDelay, print, isPrinting]);

  // Inject styles on mount
  useEffect(() => {
    injectStyles();
    
    // Cleanup on unmount
    return () => {
      removeStyles();
    };
  }, [injectStyles, removeStyles]);

  // Handle print media query changes
  useEffect(() => {
    if (typeof window === 'undefined' || !browserCapabilities.supportsCSSPrint) return;

    const printMediaQuery = window.matchMedia('print');
    
    const handlePrintChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Print mode activated
        injectStyles();
      }
    };

    // Modern browsers
    if (printMediaQuery.addEventListener) {
      printMediaQuery.addEventListener('change', handlePrintChange);
      return () => printMediaQuery.removeEventListener('change', handlePrintChange);
    } 
    // Legacy browsers
    else if (printMediaQuery.addListener) {
      printMediaQuery.addListener(handlePrintChange);
      return () => printMediaQuery.removeListener(handlePrintChange);
    }
  }, [injectStyles, browserCapabilities.supportsCSSPrint]);

  return {
    print,
    isPrinting,
    printError,
    browserCapabilities,
    injectStyles,
    removeStyles,
  };
};