/**
 * Custom hook for thermal printing functionality
 */

import { useEffect, useCallback, useState } from 'react';
import { 
  THERMAL_PRINT_CONFIG, 
  generateThermalPrintCSS, 
  getBrowserPrintCapabilities,
  detectThermalPrinterSettings,
  thermalPrint
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
  const [hasAutoPrinted, setHasAutoPrinted] = useState(false);

  const browserCapabilities = getBrowserPrintCapabilities();
  const thermalSettings = detectThermalPrinterSettings();

  // Inject thermal print styles into the document
  const injectStyles = useCallback(() => {
    if (typeof window === 'undefined') return;

    const styleId = 'thermal-print-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.type = 'text/css';
      document.head.appendChild(styleElement);
    }

    // Always update the content in case config changed
    styleElement.textContent = generateThermalPrintCSS(config);
  }, [config]);

  // Remove thermal print styles from the document
  const removeStyles = useCallback(() => {
    if (typeof window === 'undefined') return;

    const styleElement = document.getElementById('thermal-print-styles');
    if (styleElement) {
      styleElement.remove();
    }
  }, []);

  // Print function with enhanced error handling and retry logic
  const print = useCallback(async (retryCount: number = 0): Promise<void> => {
    if (typeof window === 'undefined') {
      throw new Error('Print function can only be called in browser environment');
    }

    const retryDelay = 1000; // 1 second

    try {
      setIsPrinting(true);
      setPrintError(null);
      onPrintStart?.();

      // Ensure styles are injected before printing
      const styleId = 'thermal-print-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.type = 'text/css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = generateThermalPrintCSS(config);

      // Wait for ticket element to be available with timeout
      let ticketElement = document.querySelector('.thermal-ticket');
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!ticketElement && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        ticketElement = document.querySelector('.thermal-ticket');
        attempts++;
      }
      
      if (!ticketElement) {
        throw new Error('Ticket element not found for printing after waiting');
      }

      // Check if ticket has content
      const hasContent = ticketElement.textContent && ticketElement.textContent.trim().length > 0;
      if (!hasContent) {
        throw new Error('Ticket appears to be empty');
      }

      // Use optimized delay from thermal settings
      await new Promise(resolve => setTimeout(resolve, thermalSettings.printDelay));

      // Enhanced thermal printing with better feedback
      try {
        console.log('Initiating thermal print...');
        
        // Add print event listeners for better feedback
        const handleBeforePrint = () => {
          console.log('Print dialog opened');
          setPrintError(null);
        };
        
        const handleAfterPrint = () => {
          console.log('Print dialog closed');
          window.removeEventListener('beforeprint', handleBeforePrint);
          window.removeEventListener('afterprint', handleAfterPrint);
          onPrintEnd?.();
        };

        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        
        // Use enhanced thermal print function
        await thermalPrint();
        
        // Cleanup timeout in case events don't fire
        setTimeout(() => {
          window.removeEventListener('beforeprint', handleBeforePrint);
          window.removeEventListener('afterprint', handleAfterPrint);
        }, 15000);
        
      } catch (printError) {
        console.warn('Thermal print failed, falling back to basic print:', printError);
        
        // Fallback to basic print
        window.print();
        
        // Wait for print dialog
        await new Promise(resolve => setTimeout(resolve, 500));
        onPrintEnd?.();
      }
    } catch (error) {
      const printError = error instanceof Error ? error : new Error('Unknown print error');
      console.error('Print error:', printError);

      // Retry logic for transient errors using thermal settings
      if (retryCount < thermalSettings.retryAttempts && (
        printError.message.includes('not found') ||
        printError.message.includes('empty') ||
        printError.message.includes('ready')
      )) {
        console.log(`Print attempt ${retryCount + 1} failed, retrying in ${retryDelay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return print(retryCount + 1);
      }

      setPrintError(printError.message);
      onPrintError?.(printError);
      throw printError;
    } finally {
      setIsPrinting(false);
    }
  }, [config, onPrintStart, onPrintEnd, onPrintError, thermalSettings.printDelay, thermalSettings.retryAttempts]);

  // Auto-print functionality with element availability check
  useEffect(() => {
    if (autoprint && !isPrinting && !hasAutoPrinted) {
      const checkAndPrint = () => {
        // Check if the thermal ticket element exists
        const ticketElement = document.querySelector('.thermal-ticket');
        if (ticketElement) {
          setHasAutoPrinted(true);
          print().catch(error => {
            console.error('Auto-print failed:', error);
          });
        } else {
          // If element doesn't exist yet, wait a bit more and try again
          setTimeout(checkAndPrint, 100);
        }
      };

      const timer = setTimeout(checkAndPrint, autoprintDelay);
      return () => clearTimeout(timer);
    }
  }, [autoprint, autoprintDelay, print, isPrinting, hasAutoPrinted]);

  // Inject styles on mount (only once)
  useEffect(() => {
    // Inject styles immediately on mount
    if (typeof window !== 'undefined') {
      const styleId = 'thermal-print-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.type = 'text/css';
        document.head.appendChild(styleElement);
      }
      styleElement.textContent = generateThermalPrintCSS(config);
    }
    
    // Cleanup on unmount
    return () => {
      if (typeof window !== 'undefined') {
        const styleElement = document.getElementById('thermal-print-styles');
        if (styleElement) {
          styleElement.remove();
        }
      }
    };
  }, [config]); // Only depend on config

  // Handle print media query changes
  useEffect(() => {
    if (typeof window === 'undefined' || !browserCapabilities.supportsCSSPrint) return;

    const printMediaQuery = window.matchMedia('print');
    
    const handlePrintChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        // Print mode activated - ensure styles are current
        const styleElement = document.getElementById('thermal-print-styles') as HTMLStyleElement;
        if (styleElement) {
          styleElement.textContent = generateThermalPrintCSS(config);
        }
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
  }, [config, browserCapabilities.supportsCSSPrint]);

  return {
    print,
    isPrinting,
    printError,
    browserCapabilities,
    injectStyles,
    removeStyles,
  };
};