/**
 * Thermal Printer Configuration and Utilities
 * Optimized for 80mm thermal printers with 72mm printable area
 */

import {
  ThermalPrintConfig,
  ThermalPrintStyles,
  PrintCapabilities,
  THERMAL_PRINTER_PRESETS,
} from "../types/thermal-print";

// Re-export types for backward compatibility
export type TicketPrintConfig = ThermalPrintConfig;
export type { ThermalPrintStyles, PrintCapabilities };

// Default configuration for 80mm thermal printers
export const THERMAL_PRINT_CONFIG: ThermalPrintConfig =
  THERMAL_PRINTER_PRESETS.standard80mm.config;

// CSS-in-JS styles for thermal printing (Optimized for 203 DPI thermal printers - Expert Mode)
export const getThermalPrintStyles = (
  config: ThermalPrintConfig = THERMAL_PRINT_CONFIG
): ThermalPrintStyles => {
  return {
    pageConfig: `
      @page {
        size: ${config.paperWidth}mm auto;
        margin: 0;
        padding: 0;
      }
    `,
    bodyStyles: `
      margin: 0;
      padding: 0;
      font-family: Tahoma, Verdana, Segoe, sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
      color: #000000 !important;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      text-shadow: none;
      filter: contrast(200%);
      font-variant-numeric: tabular-nums;
    `,
    ticketContainer: `
      width: ${config.printableWidth}mm;
      max-width: ${config.printableWidth}mm;
      min-width: ${config.printableWidth}mm;
      margin: 0 auto;
      padding: ${config.spacing.padding}mm;
      padding-left: 5mm;
      padding-right: 2mm;
      box-sizing: border-box;
      font-family: Tahoma, Verdana, Segoe, sans-serif;
      font-size: 12px;
      font-weight: 600;
      display: block;
      color: #000000 !important;
      -webkit-font-smoothing: none !important;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: geometricPrecision;
      filter: contrast(200%);
      font-variant-numeric: tabular-nums;
      overflow: hidden;
    `,
    typography: {
      header: `
        font-size: ${config.fontSize.header}px;
        font-weight: 700;
        line-height: 1.3;
        margin: 0;
        padding: 0;
        color: #000000 !important;
        text-shadow: none;
        filter: none;
      `,
      section: `
        font-size: ${config.fontSize.section}px;
        font-weight: 700;
        line-height: 1.3;
        margin: 0;
        padding: 0;
        color: #000000 !important;
        text-shadow: none;
        filter: none;
      `,
      body: `
        font-size: ${config.fontSize.body}px;
        font-weight: 600;
        line-height: 1.3;
        margin: 0;
        padding: 0;
        color: #000000 !important;
        text-shadow: none;
        filter: none;
      `,
      small: `
        font-size: ${config.fontSize.small}px;
        font-weight: 600;
        line-height: 1.3;
        margin: 0;
        padding: 0;
        color: #000000 !important;
        text-shadow: none;
        filter: none;
      `,
    },
    layout: {
      separator: `
        border-bottom: 1px dashed #000000;
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
        color: #000000 !important;
        font-weight: 600;
      `,
      textCenter: `
        text-align: center;
        color: #000000 !important;
        font-weight: 600;
      `,
      textBold: `
        font-weight: 700;
        color: #000000 !important;
      `,
    },
  };
};

// Utility function to generate complete CSS for thermal printing
export const generateThermalPrintCSS = (
  config: ThermalPrintConfig = THERMAL_PRINT_CONFIG
): string => {
  const styles = getThermalPrintStyles(config);

  return `
    @media print {
      ${styles.pageConfig}
      
      /* Force printer compatibility - CRITICAL: Reset browser margins */
      @page {
        size: ${config.paperWidth}mm auto;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      /* Reset all elements for thermal printing - except padding for safe area */
      * {
        margin: 0 !important;
        box-shadow: none !important;
        color: #000 !important;
        background: transparent !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        text-shadow: none !important;
        filter: none !important;
      }
      
      /* Optimize body for printing - CRITICAL: No margin/padding on body */
      body {
        ${styles.bodyStyles}
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: geometricPrecision !important;
        width: ${config.paperWidth}mm !important;
        max-width: ${config.paperWidth}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        display: flex !important;
        justify-content: center !important;
      }
      
      /* Main ticket container - SAFE PRINT AREA with left/right margins */
      .thermal-ticket {
        ${styles.ticketContainer}
        page-break-inside: avoid;
        orphans: 3;
        widows: 3;
        margin: 0 !important;
        width: ${config.printableWidth}mm !important;
        max-width: ${config.printableWidth}mm !important;
        min-width: ${config.printableWidth}mm !important;
        padding-left: 5mm !important;
        padding-right: 2mm !important;
        padding-top: 2mm !important;
        padding-bottom: 2mm !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
      }
      
      /* Typography classes */
      .thermal-header {
        ${styles.typography.header}
        ${styles.layout.textCenter}
        page-break-after: avoid;
      }
      
      .thermal-section {
        ${styles.typography.section}
        page-break-after: avoid;
      }
      
      .thermal-body {
        ${styles.typography.body}
      }
      
      .thermal-small {
        ${styles.typography.small}
      }
      
      /* Layout classes */
      .thermal-separator {
        ${styles.layout.separator}
        page-break-inside: avoid;
      }
      
      .thermal-row {
        ${styles.layout.flexRow}
        page-break-inside: avoid;
      }
      
      .thermal-center {
        ${styles.layout.textCenter}
      }
      
      .thermal-bold {
        ${styles.layout.textBold}
      }
      
      /* Hide screen-only elements */
      .no-print {
        display: none !important;
      }
      
      /* Text handling for thermal printers */
      .thermal-wrap {
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
        overflow-wrap: break-word;
      }
      
      /* Product item optimization */
      .thermal-product-item {
        margin-bottom: ${config.spacing.sectionGap}mm;
        page-break-inside: avoid;
        orphans: 2;
        widows: 2;
      }
      
      /* Price row optimization */
      .thermal-price-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
        page-break-inside: avoid;
      }
      
      .thermal-price-left {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .thermal-price-right {
        text-align: right;
        white-space: nowrap;
        margin-left: 2mm;
      }
      
      /* Printer specific optimizations */
      .thermal-ticket * {
        font-variant-ligatures: none !important;
        font-feature-settings: normal !important;
        text-shadow: none !important;
        filter: none !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: geometricPrecision !important;
      }
      
      /* Standard thermal printer optimizations */
      .thermal-separator {
        border-bottom: 1px solid #000 !important;
          margin: ${config.spacing.sectionGap}mm 0 !important;
          width: 100% !important;
          height: 0 !important;
          page-break-inside: avoid !important;
        }
        
        .thermal-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: baseline !important;
          width: 100% !important;
          margin: 2mm 0 !important;
          page-break-inside: avoid !important;
          min-height: ${config.fontSize.body * 1.2}px !important;
        }
        
        .thermal-price-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: baseline !important;
          width: 100% !important;
          margin: 1mm 0 !important;
          page-break-inside: avoid !important;
          font-weight: bold !important;
        }
        
        .thermal-center {
          text-align: center !important;
          width: 100% !important;
        }
        
        .thermal-header {
          font-size: ${config.fontSize.header}px !important;
          font-weight: bold !important;
          text-align: center !important;
          margin-bottom: ${config.spacing.sectionGap}mm !important;
          letter-spacing: 1px !important;
        }
      }
      
      /* Force black text for thermal printers */
      .thermal-ticket, .thermal-ticket * {
        color: #000000 !important;
        background-color: transparent !important;
        border-color: #000000 !important;
      }
      
      /* Ensure proper spacing for thermal printers */
      .thermal-ticket > * + * {
        margin-top: 1mm;
      }
      
      /* Thermal printer paper feed optimization */
      .thermal-ticket {
        page-break-before: auto;
        page-break-after: auto;
        page-break-inside: avoid;
        orphans: 1;
        widows: 1;
      }
      
      /* Optimize for 203 DPI thermal printers (keep sizes, no shrink to preserve sharpness) */
      @media print and (resolution: 203dpi) {
        .thermal-ticket {
          font-size: ${config.fontSize.body}px;
        }
        
        .thermal-header {
          font-size: ${config.fontSize.header}px;
        }
        
        .thermal-section {
          font-size: ${config.fontSize.section}px;
        }
      }
      
      /* Optimize for high DPI thermal printers */
      @media print and (min-resolution: 300dpi) {
        .thermal-ticket {
          font-size: ${config.fontSize.body + 1}px;
        }
      }
    }
    
    @media screen {
      /* Screen preview styles */
      body[data-thermal-page="1"] {
        background-color: #f5f5f5 !important;
        color: #000000 !important;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        padding: 20px;
        font-family: 'Courier New', 'Consolas', 'Monaco', monospace;
      }

      /* Force light scheme when viewing a thermal ticket, regardless of OS/browser dark mode */
      html:has(body[data-thermal-page="1"]) {
        color-scheme: light !important;
      }

      /* Ensure all text renders black on screen for the ticket page */
      body[data-thermal-page="1"] *,
      body[data-thermal-page="1"] .thermal-ticket,
      body[data-thermal-page="1"] .thermal-ticket * {
        color: #000000 !important;
      }
      
      /* Override dark mode specifically for thermal ticket pages */
      @media (prefers-color-scheme: dark) {
        body[data-thermal-page="1"] {
          background-color: #f5f5f5 !important;
          color: #000000 !important;
        }
      }
      
      body[data-thermal-page="1"] .thermal-ticket {
        ${styles.ticketContainer}
        background: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        border: 1px solid #ddd;
        color: #000000 !important;
        width: ${config.printableWidth}mm !important;
        max-width: ${config.printableWidth}mm !important;
        min-width: ${config.printableWidth}mm !important;
      }
      
      /* Ensure all text within ticket is black */
      body[data-thermal-page="1"] .thermal-ticket, body[data-thermal-page="1"] .thermal-ticket * {
        color: #000000 !important;
      }
      
      /* Apply thermal styles for screen preview */
      body[data-thermal-page="1"] .thermal-header {
        ${styles.typography.header}
        ${styles.layout.textCenter}
        font-size: ${config.fontSize.header + 2}px !important;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-section {
        ${styles.typography.section}
        font-size: ${config.fontSize.section + 2}px !important;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-body {
        ${styles.typography.body}
        font-size: ${config.fontSize.body + 1}px !important;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-small {
        ${styles.typography.small}
        font-size: ${config.fontSize.small + 1}px !important;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-separator {
        ${styles.layout.separator}
        border-color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-row {
        ${styles.layout.flexRow}
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-center {
        ${styles.layout.textCenter}
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-bold {
        ${styles.layout.textBold}
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-wrap {
        word-wrap: break-word;
        word-break: break-word;
        hyphens: auto;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-product-item {
        margin-bottom: ${config.spacing.sectionGap}mm;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-price-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        width: 100%;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-price-left {
        flex: 1;
        text-align: left;
        color: #000000 !important;
      }
      
      body[data-thermal-page="1"] .thermal-price-right {
        text-align: right;
        white-space: nowrap;
        color: #000000 !important;
      }
    }
  `;
};

// Utility function to safely truncate text at word boundaries
export const truncateText = (
  text: string | null | undefined,
  maxLength: number
): string => {
  // Handle null, undefined, or non-string values
  if (!text || typeof text !== "string") return "";

  if (text.length <= maxLength) return text;

  // Try to break at word boundaries
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
};

// Utility function to format product name for thermal printing
export const formatProductName = (
  name: string | null | undefined,
  maxLength: number = 30
): string => {
  if (!name || typeof name !== "string") return "Producto desconocido";

  // Clean up the product name
  const cleanName = name.trim().replace(/\s+/g, " ");

  // If it fits, return as is
  if (cleanName.length <= maxLength) return cleanName;

  // Try to truncate at word boundaries
  return truncateText(cleanName, maxLength);
};

// Utility function to format brand name for thermal printing
export const formatBrandName = (brand: string | null | undefined): string => {
  if (!brand || typeof brand !== "string") return "Sin marca";
  return brand.trim();
};

// Utility function to format barcode for thermal printing
export const formatBarcode = (barcode: string | null | undefined): string => {
  if (!barcode || typeof barcode !== "string") return "N/A";
  return barcode.trim();
};

// Utility function to format wholesale pricing information
export const formatWholesaleInfo = (item: {
  is_wholesale?: boolean;
  savings?: number;
  quantity_sold: number;
}): { showWholesale: boolean; savingsText: string; wholesaleLabel: string } => {
  const showWholesale = Boolean(
    item.is_wholesale && item.savings && item.savings > 0
  );
  const savingsText = showWholesale ? formatCurrency(item.savings || 0) : "";
  const wholesaleLabel = item.quantity_sold >= 3 ? "MAYORISTA" : "";

  return {
    showWholesale,
    savingsText,
    wholesaleLabel,
  };
};

// Utility function to wrap text for thermal printing
export const wrapText = (text: string, maxWidth: number): string[] => {
  if (!text) return [""];

  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        // Word is longer than max width, force break
        lines.push(word.substring(0, maxWidth));
        currentLine = word.substring(maxWidth);
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [""];
};

// Utility function to format currency for thermal printing
export const formatCurrency = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

// Utility function to format date for thermal printing
export const formatDateForThermal = (
  date: Date
): { date: string; time: string } => {
  const formattedDate = date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const formattedTime = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { date: formattedDate, time: formattedTime };
};

// Utility function to calculate optimal text width for thermal printing
export const calculateOptimalTextWidth = (
  config: ThermalPrintConfig = THERMAL_PRINT_CONFIG
): number => {
  // Approximate character width in mm for monospace font at body size
  const charWidthMm = 0.6; // Approximate for 11px Courier New
  return Math.floor(config.printableWidth / charWidthMm);
};

// Browser detection for print optimization
export const getBrowserPrintCapabilities = (): PrintCapabilities => {
  const userAgent =
    typeof window !== "undefined" ? window.navigator.userAgent : "";

  return {
    isChrome: userAgent.includes("Chrome"),
    isFirefox: userAgent.includes("Firefox"),
    isSafari: userAgent.includes("Safari") && !userAgent.includes("Chrome"),
    isEdge: userAgent.includes("Edge"),
    supportsCSSPrint: typeof window !== "undefined" && "matchMedia" in window,
  };
};

// Check for thermal printer availability
export const checkThermalPrinterAvailability = async (): Promise<{
  available: boolean;
  printers: string[];
  recommendations: string[];
}> => {
  const recommendations = [
    "Asegúrate de que la impresora térmica esté encendida y conectada",
    "Verifica que los drivers de la impresora estén instalados correctamente",
    "En Windows: Ve a Configuración > Impresoras y escáneres",
    "Selecciona tu impresora térmica como predeterminada",
    'Configura el tamaño de papel a 80mm (3.15") en las propiedades de la impresora',
    "Si usas Chrome, asegúrate de seleccionar la impresora térmica en el diálogo de impresión",
  ];

  try {
    // Check if we can access printer information (limited in browsers for security)
    if (typeof window !== "undefined" && "navigator" in window) {
      // Modern browsers don't expose printer information directly
      // We can only provide general guidance
      return {
        available: true, // Assume available since we can't detect directly
        printers: ["Impresora térmica detectada en el sistema"],
        recommendations,
      };
    }
  } catch (error) {
    console.warn("Could not check printer availability:", error);
  }

  return {
    available: false,
    printers: [],
    recommendations,
  };
};

// Detect printer type and capabilities, then optimize settings
export const detectPrinterSettings = () => {
  const capabilities = getBrowserPrintCapabilities();

  // Default thermal printer settings
  let recommendedConfig = THERMAL_PRINT_CONFIG;
  let printDelay = 1000;
  let retryAttempts = 2;
  let printerType = "thermal";

  // Browser-specific optimizations
  if (capabilities.isChrome) {
    printDelay = 800;
    retryAttempts = 3;
  } else if (capabilities.isFirefox) {
    printDelay = 1200;
    retryAttempts = 2;
  } else if (capabilities.isSafari) {
    printDelay = 1500;
    retryAttempts = 1;
  }

  // Check for high DPI displays (might indicate better printer support)
  const pixelRatio =
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  if (pixelRatio > 1.5) {
    recommendedConfig = {
      ...THERMAL_PRINT_CONFIG,
      fontSize: {
        ...THERMAL_PRINT_CONFIG.fontSize,
        body: THERMAL_PRINT_CONFIG.fontSize.body + 1,
        small: THERMAL_PRINT_CONFIG.fontSize.small + 1,
      },
    };
  }

  return {
    config: recommendedConfig,
    printDelay,
    retryAttempts,
    capabilities,
    printerType,
    recommendations: [
      "Asegúrese de que la impresora esté conectada y configurada como predeterminada",
      printerType === "thermal"
        ? "Verifique que el papel térmico esté correctamente cargado"
        : "Verifique que el papel esté correctamente alineado",
      "Para mejores resultados, use Chrome o Edge como navegador",
      capabilities.supportsCSSPrint
        ? "Su navegador soporta impresión CSS avanzada"
        : "Su navegador tiene soporte limitado para impresión CSS",
    ],
  };
};

// Mantener compatibilidad con el nombre anterior
export const detectThermalPrinterSettings = detectPrinterSettings;

// Generate optimized CSS for specific thermal printer DPI
export const generateOptimizedThermalCSS = (dpi: number = 203): string => {
  const config = { ...THERMAL_PRINT_CONFIG };

  // Adjust font sizes based on DPI
  if (dpi >= 300) {
    // High DPI printers
    config.fontSize = {
      header: config.fontSize.header + 2,
      section: config.fontSize.section + 1,
      body: config.fontSize.body + 1,
      small: config.fontSize.small + 1,
    };
  } else if (dpi <= 150) {
    // Low DPI printers
    config.fontSize = {
      header: config.fontSize.header - 1,
      section: config.fontSize.section - 1,
      body: config.fontSize.body - 1,
      small: Math.max(config.fontSize.small - 1, 7), // Minimum 7px
    };
  }

  return generateThermalPrintCSS(config);
};

// Enhanced thermal printer print function
export const thermalPrint = async (): Promise<void> => {
  const settings = detectThermalPrinterSettings();
  const capabilities = getBrowserPrintCapabilities();

  return new Promise((resolve, reject) => {
    try {
      // Ensure document is ready
      if (document.readyState !== "complete") {
        window.addEventListener(
          "load",
          () => {
            setTimeout(() => {
              executeThermalPrint(capabilities, resolve, reject);
            }, settings.printDelay);
          },
          { once: true }
        );
      } else {
        setTimeout(() => {
          executeThermalPrint(capabilities, resolve, reject);
        }, settings.printDelay);
      }
    } catch (error) {
      reject(error);
    }
  });
};

// Execute thermal print with enhanced compatibility
const executeThermalPrint = (
  capabilities: PrintCapabilities,
  resolve: () => void,
  reject: (error: Error) => void
) => {
  try {
    // For thermal printers, we need to ensure the print dialog shows with correct settings
    if (capabilities.isChrome || capabilities.isEdge) {
      // Chrome/Edge: Try to use print with specific options
      const printOptions = {
        silent: false, // Always show dialog for thermal printer selection
        printBackground: true,
        color: false, // Thermal printers are monochrome
        margin: {
          marginType: "none" as const,
        },
        landscape: false,
        pagesPerSheet: 1,
        collate: true,
        copies: 1,
        pageRanges: [],
        headerFooterEnabled: false,
        shouldPrintBackgrounds: true,
        shouldPrintSelectionOnly: false,
      };

      // Use the enhanced print API if available
      if ("print" in window) {
        window.print();

        // Listen for afterprint event to know when printing is done
        const handleAfterPrint = () => {
          window.removeEventListener("afterprint", handleAfterPrint);
          resolve();
        };

        const handleBeforePrint = () => {
          window.removeEventListener("beforeprint", handleBeforePrint);
          // Print dialog opened successfully
        };

        window.addEventListener("afterprint", handleAfterPrint);
        window.addEventListener("beforeprint", handleBeforePrint);

        // Fallback timeout in case events don't fire
        setTimeout(() => {
          window.removeEventListener("afterprint", handleAfterPrint);
          window.removeEventListener("beforeprint", handleBeforePrint);
          resolve();
        }, 10000); // 10 second timeout
      }
    } else {
      // Firefox, Safari, and other browsers
      window.print();

      // For other browsers, we can't reliably detect print completion
      // so we resolve after a reasonable delay
      setTimeout(resolve, 1000);
    }
  } catch (error) {
    reject(
      error instanceof Error ? error : new Error("Print execution failed")
    );
  }
};

// Cross-browser print function with fallbacks (keeping for backward compatibility)
export const crossBrowserPrint = async (): Promise<void> => {
  return thermalPrint();
};

// Utility functions for backward compatibility with existing code
// These are wrappers around formatDateForThermal for easier usage

/**
 * Format a date to DD/MM/YYYY format
 * @param date - Date object or ISO string
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const { date: formattedDate } = formatDateForThermal(dateObj);
  return formattedDate;
};

/**
 * Format a date to HH:mm format
 * @param date - Date object or ISO string
 * @returns Formatted time string
 */
export const formatTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const { time: formattedTime } = formatDateForThermal(dateObj);
  return formattedTime;
};
