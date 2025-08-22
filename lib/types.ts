// Database Types for Wholesale Pricing Feature

export interface StockEntry {
  id: string;
  product_id: string;
  barcode?: string;
  initial_quantity: number;
  current_quantity: number;
  purchase_price?: number;
  sale_price_unit?: number;

  sale_price_wholesale?: number; // New wholesale price field
  expiration_date?: string;
  created_at: string;
}

export interface PricingInfo {
  unitPrice?: number;
  wholesalePrice?: number;
  applicablePrice: number;
  priceType: 'unit' | 'wholesale';
  savings?: number; // Amount saved when using wholesale pricing
}

export interface SaleItem {
  id: string;
  sale_id: string;
  stock_entry_id: string;
  quantity_sold: number;
  price_at_sale: number;
  sale_format: 'unitario' | 'display' | 'pallet';
  // Extended for wholesale pricing
  applied_price_type?: 'unit' | 'wholesale';
  wholesale_savings?: number;
}

export interface CartItem {
  stockEntryId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;

  wholesalePrice?: number;
  appliedPrice: number;
  appliedPriceType: 'unit' | 'wholesale';
  totalPrice: number;
  savings?: number; // Savings from wholesale pricing
  priceBreakdown: {
    basePrice: number;
    finalPrice: number;
    discountAmount?: number;
  };
}

export interface Product {
  id: string;
  name: string;
  brand_id?: number;
  type_id?: number;
  image_url?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  seller_id: string;
  total_amount: number;
  created_at: string;
  // Extended for wholesale pricing analytics
  total_wholesale_savings?: number;
  items_with_wholesale?: number;
}

// Utility types for wholesale pricing calculations
export interface PriceCalculationInput {
  quantity: number;
  unitPrice?: number;
  wholesalePrice?: number;
  wholesaleThreshold?: number; // Default: 3 units
}

export interface PriceCalculationResult {
  applicablePrice: number;
  priceType: 'unit' | 'wholesale';
  totalPrice: number;
  savings: number;
  breakdown: {
    basePrice: number;
    discountedPrice: number;
    quantity: number;
  };
}

// Form data types
export interface StockEntryFormData {
  productId: string;
  quantity: string;
  barcode: string;
  purchasePrice: string;
  unitPrice: string;

  wholesalePrice?: string; // New field for wholesale pricing
  expirationDate?: string;
}

export interface WholesalePriceValidation {
  isValid: boolean;
  error?: string;
  normalizedValue?: number;
}