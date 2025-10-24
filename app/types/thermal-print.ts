/**
 * TypeScript types for thermal printing functionality
 */

export interface ThermalPrintConfig {
  paperWidth: number;
  printableWidth: number;
  fontSize: {
    header: number;
    section: number;
    body: number;
    small: number;
  };
  spacing: {
    sectionGap: number;
    lineHeight: number;
    padding: number;
  };
}

export interface ThermalPrintStyles {
  pageConfig: string;
  bodyStyles: string;
  ticketContainer: string;
  typography: {
    header: string;
    section: string;
    body: string;
    small: string;
  };
  layout: {
    separator: string;
    flexRow: string;
    textCenter: string;
    textBold: string;
  };
}

export interface PrintCapabilities {
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  supportsCSSPrint: boolean;
}

export interface PrintOptions {
  silent?: boolean;
  printBackground?: boolean;
  color?: boolean;
  margin?: {
    marginType: 'default' | 'none' | 'printableArea' | 'custom';
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  landscape?: boolean;
  pagesPerSheet?: number;
  collate?: boolean;
  copies?: number;
}

export interface ThermalTicketData {
  id: string;
  seller_id: string;
  total_amount: number;
  created_at: string;
  seller_email: string;
  sale_items: ThermalTicketItem[];
  formattedDate?: string;
  formattedTime?: string;
  totalSavings?: number;
  itemCount?: number;
}

export interface ThermalTicketItem {
  id: string;
  quantity_sold: number;
  price_at_sale: number;
  sale_format: string;
  product_name: string;
  brand_name: string;
  barcode: string;
  is_wholesale?: boolean;
  unit_price?: number;
  wholesale_price?: number;
  savings?: number;
}

export interface ThermalPrintError {
  code: 'PRINT_FAILED' | 'BROWSER_NOT_SUPPORTED' | 'STYLES_NOT_LOADED' | 'DATA_INVALID';
  message: string;
  details?: any;
}

export interface ThermalPrintEvent {
  type: 'print_start' | 'print_end' | 'print_error' | 'styles_injected' | 'styles_removed';
  timestamp: Date;
  data?: any;
}

// Utility type for CSS class names used in thermal printing
export type ThermalCSSClasses = 
  | 'thermal-ticket'
  | 'thermal-header'
  | 'thermal-section'
  | 'thermal-body'
  | 'thermal-small'
  | 'thermal-separator'
  | 'thermal-row'
  | 'thermal-center'
  | 'thermal-bold'
  | 'thermal-wrap'
  | 'thermal-product-item'
  | 'thermal-price-row'
  | 'thermal-price-left'
  | 'thermal-price-right'
  | 'no-print';

// Configuration presets for different thermal printer models
export interface ThermalPrinterPreset {
  name: string;
  description: string;
  config: ThermalPrintConfig;
}

export const THERMAL_PRINTER_PRESETS: Record<string, ThermalPrinterPreset> = {
  standard80mm: {
    name: 'Standard 80mm',
    description: 'Standard 80mm thermal printer (most common)',
    config: {
      paperWidth: 80,
      printableWidth: 78,
      fontSize: {
        header: 14,
        section: 12,
        body: 11,
        small: 9,
      },
      spacing: {
        sectionGap: 3,
        lineHeight: 1.1,
        padding: 1,
      },
    },
  },

  compact80mm: {
    name: 'Compact 80mm',
    description: 'Compact layout for 80mm thermal printer',
    config: {
      paperWidth: 80,
      printableWidth: 78,
      fontSize: {
        header: 13,
        section: 11,
        body: 10,
        small: 8,
      },
      spacing: {
        sectionGap: 2,
        lineHeight: 1.0,
        padding: 1,
      },
    },
  },
  highDensity80mm: {
    name: 'High Density 80mm',
    description: 'High density layout for 80mm thermal printer',
    config: {
      paperWidth: 80,
      printableWidth: 78,
      fontSize: {
        header: 12,
        section: 10,
        body: 9,
        small: 7,
      },
      spacing: {
        sectionGap: 1.5,
        lineHeight: 0.9,
        padding: 0.5,
      },
    },
  },
};