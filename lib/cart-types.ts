/**
 * Enhanced Cart System Types
 * Unified interfaces for consistent cart management across all product addition methods
 */

export interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brand_name: string;
  total_stock: number;
  type_name?: string;
}

export interface StockEntry {
  id: string;
  product_id: string;
  barcode: string;
  current_quantity: number;
  initial_quantity: number;
  expiration_date: string | null;
  created_at: string;
  purchase_price: number;
  sale_price_unit: number;

  sale_price_wholesale: number | null;
}

export interface EnhancedStockEntry extends StockEntry {
  // Calculated fields
  daysUntilExpiration: number | null;
  isExpiringSoon: boolean;
  fifoRank: number;
  wholesaleAvailable: boolean;
  
  // Display helpers
  displayName: string;
  statusColor: 'green' | 'yellow' | 'red';
  priorityScore: number;
}

export interface PricingInfo {
  unitPrice: number;
  appliedPrice: number;
  priceType: 'unit' | 'wholesale';
  totalPrice: number;
  savings: number;
  wholesaleAvailable: boolean;
  wholesaleThreshold: number;
  wholesalePrice?: number;
}

export interface CartItemValidation {
  maxQuantity: number;
  isValid: boolean;
  warnings: string[];
  errors: string[];
}

export interface EnhancedCartItem {
  // Core item information
  product: Product;
  stockEntry: {
    id: string;
    barcode: string;
    current_quantity: number;
    expiration_date: string | null;
    sale_price_unit: number;

    sale_price_wholesale: number | null;
    created_at: string;
  };
  
  // Quantity and format
  quantity: number;
  saleFormat: 'unitario' | 'display' | 'pallet';
  
  // Pricing information
  pricing: PricingInfo;
  
  // Validation
  validation: CartItemValidation;
  
  // Metadata
  addedAt: string;
  addedVia: 'scanner' | 'catalog' | 'manual';
}

export interface ProductWithStockDetails extends Product {
  stockEntries: StockEntry[];
  hasWholesalePrice: boolean;
  wholesaleThreshold: number;
  pricing: {
    minUnitPrice: number;
    maxUnitPrice: number;
    minWholesalePrice: number | null;
    maxWholesalePrice: number | null;
  };
}

export interface AddToCartOptions {
  method: 'scanner' | 'catalog' | 'manual';
  stockEntryId?: string;
  quantity: number;
  saleFormat: 'unitario';
  autoSelectStockEntry?: boolean;
}

export interface CartResult {
  success: boolean;
  item?: EnhancedCartItem;
  error?: string;
  warnings?: string[];
}

export interface PriceCalculationInput {
  quantity: number;
  unitPrice: number;

  wholesalePrice?: number;
  wholesaleThreshold?: number;
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

export interface StockEntrySelectionOptions {
  product: Product;
  availableStockEntries: StockEntry[];
  recommendedEntry: StockEntry;
  defaultQuantity: number;
  showPricingComparison: boolean;
}

// Legacy cart item interface for backward compatibility
export interface CartItem {
  product: Product;
  stockEntryId: string;
  quantity: number;
  saleFormat: 'unitario' | 'display' | 'pallet';
  unitPrice: number;

  wholesalePrice?: number;
  appliedPrice: number;
  appliedPriceType: 'unit' | 'wholesale';
  totalPrice: number;
  savings?: number;
}

// Utility types
export type CartItemId = string;
export type ProductId = string;
export type StockEntryId = string;

// Cart state management
export interface CartState {
  items: EnhancedCartItem[];
  totalItems: number;
  totalAmount: number;
  totalSavings: number;
  hasWholesaleItems: boolean;
  lastUpdated: string;
}

// Cart actions
export type CartAction = 
  | { type: 'ADD_ITEM'; payload: { item: EnhancedCartItem } }
  | { type: 'UPDATE_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { itemId: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'RECALCULATE_PRICING' };

// Error types
export interface CartError extends Error {
  code: 'INSUFFICIENT_STOCK' | 'INVALID_QUANTITY' | 'PRODUCT_NOT_FOUND' | 'PRICING_ERROR';
  details?: any;
}