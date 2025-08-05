/**
 * Thermal Printer Configuration and Utilities
 * Optimized for 80mm thermal printers with 72mm printable area
 */

import { 
  ThermalPrintConfig, 
  ThermalPrintStyles, 
  PrintCapabilities,
  THERMAL_PRINTER_PRESETS 
} from '../types/thermal-print';

// Re-export types for backward compatibility
export type TicketPrintConfig = ThermalPrintConfig;
export type { ThermalPrintStyles, PrintCapabilities };

// Default configuration for 80mm thermal printers
export const THERMAL_PRINT_CONFIG: ThermalPrintConfig = THERMAL_PRINTER_PRESETS.standard80mm.config;

// CSS-in-JS styles for thermal printing
export const getThermalPrintStyles = (config: ThermalPrintConfig = THERMAL_PRINT_CONFIG): ThermalPrintStyles => {
  return {
    pageConfig: `
      @page {
        size: ${config.paperWidth}mm auto;
        margin: 0;
      }
    `,
    bodyStyles: `
      margin: 0;
      padding: 0;
      font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
      font-size: ${config.fontSize.body}px;
      line-height: ${config.spacing.lineHeight};
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    `,
    ticketContainer: `
      width: ${config.printableWidth}mm;
      max-width: ${config.printableWidth}mm;
      margin: 0;
      padding: ${config.spacing.padding}mm;
      box-sizing: border-box;
      font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
    `,
    typography: {
      header: `
        font-size: ${config.fontSize.header}px;
        font-weight: bold;
        line-height: ${config.spacing.lineHeight};
        margin: 0;
        padding: 0;
      `,
      section: `
        font-size: ${config.fontSize.section}px;
        font-weight: bold;
        line-height: ${config.spacing.lineHeight};
        margin: 0;
        padding: 0;
      `,
      body: `
        font-size: ${config.fontSize.body}px;
        font-weight: normal;
        line-height: ${config.spacing.lineHeight};
        margin: 0;
        padding: 0;
      `,
      small: `
        font-size: ${config.fontSize.small}px;
        font-weight: normal;
        line-height: ${config.spacing.lineHeight};
        margin: 0;
        padding: 0;
      `,
    },
    layout: {
      separator: `
        border-bottom: 1px dashed #000;
        margin: ${config.spacing.sectionGap}mm 0;
        width: 100%;
        height: 0;
      `,
      flexRow: `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin: 1mm 0;
      `,
      textCenter: `
        text-align: center;
      `,
      textBold: `
        font-weight: bold;
      `,
    },
  };
};

// Utility function to generate complete CSS for thermal printing
export const generateThermalPrintCSS = (config: ThermalPrintConfig = THERMAL_PRINT_CONFIG): string => {
  const styles = getThermalPrintStyles(config);
  
  return `
    @media print {
      ${styles.pageConfig}
      
      * {
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        color: #000 !important;
        background: transparent !important;
      }
      
      body {
        ${styles.bodyStyles}
      }
      
      .thermal-ticket {
        ${styles.ticketContainer}
      }
      
      .thermal-header {
        ${styles.typography.header}
        ${styles.layout.textCenter}
      }
      
      .thermal-section {
        ${styles.typography.section}
      }
      
      .thermal-body {
        ${styles.typography.body}
      }
      
      .thermal-small {
        ${styles.typography.small}
      }
      
      .thermal-separator {
        ${styles.layout.separator}
      }
      
      .thermal-row {
        ${styles.layout.flexRow}
      }
      
      .thermal-center {
        ${styles.layout.textCenter}
      }
      
      .thermal-bold {
        ${styles.layout.textBold}
      }
      
      .no-print {
        display: none !important;
      }
      
      /* Ensure text wrapping for long content */
      .thermal-wrap {
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
      }
      
      /* Product item specific styles */
      .thermal-product-item {
        margin-bottom: ${config.spacing.sectionGap}mm;
        page-break-inside: avoid;
      }
      
      /* Price alignment */
      .thermal-price-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
      }
      
      .thermal-price-left {
        flex: 1;
        text-align: left;
      }
      
      .thermal-price-right {
        text-align: right;
        white-space: nowrap;
      }
    }
    
    @media screen {
      body {
        background-color: #f5f5f5;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
      }
      
      .thermal-ticket {
        ${styles.ticketContainer}
        background: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
      }
    }
  `;
};

// Utility function to truncate text intelligently
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  
  // Try to break at word boundaries
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
};

// Utility function to format currency for thermal printing
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Utility function to format date for thermal printing
export const formatDateForThermal = (date: Date): { date: string; time: string } => {
  const formattedDate = date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  const formattedTime = date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return { date: formattedDate, time: formattedTime };
};

// Utility function to calculate optimal text width for thermal printing
export const calculateOptimalTextWidth = (config: ThermalPrintConfig = THERMAL_PRINT_CONFIG): number => {
  // Approximate character width in mm for monospace font at body size
  const charWidthMm = 0.6; // Approximate for 11px Courier New
  return Math.floor(config.printableWidth / charWidthMm);
};

// Browser detection for print optimization
export const getBrowserPrintCapabilities = (): PrintCapabilities => {
  const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
  
  return {
    isChrome: userAgent.includes('Chrome'),
    isFirefox: userAgent.includes('Firefox'),
    isSafari: userAgent.includes('Safari') && !userAgent.includes('Chrome'),
    isEdge: userAgent.includes('Edge'),
    supportsCSSPrint: typeof window !== 'undefined' && 'matchMedia' in window,
  };
};