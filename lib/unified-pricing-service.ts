/**
 * Unified Pricing Service
 * Centralized pricing calculation logic for consistent wholesale pricing across all flows
 */

import { 
  PriceCalculationInput, 
  PriceCalculationResult, 
  PricingInfo, 
  StockEntry,
  EnhancedCartItem 
} from './cart-types';

// Constants
export const WHOLESALE_THRESHOLD = 3;
export const MAX_WHOLESALE_PRICE = 999999.99;
export const MIN_WHOLESALE_PRICE = 0.01;

/**
 * Main unified pricing calculation function
 * Works consistently across scanner, catalog, and cart flows
 */
export function calculateUnifiedPricing(
  stockEntry: StockEntry, 
  quantity: number,
  saleFormat: 'unitario' = 'unitario'
): PricingInfo {
  // Validate inputs
  if (quantity < 0) {
    throw new Error('La cantidad no puede ser negativa');
  }

  if (quantity === 0) {
    return {
      unitPrice: stockEntry.sale_price_unit,
      appliedPrice: stockEntry.sale_price_unit,
      priceType: 'unit',
      totalPrice: 0,
      savings: 0,
      wholesaleAvailable: !!(stockEntry.sale_price_wholesale && stockEntry.sale_price_wholesale > 0),
      wholesaleThreshold: WHOLESALE_THRESHOLD,
      wholesalePrice: stockEntry.sale_price_wholesale || undefined
    };
  }

  const baseUnitPrice = stockEntry.sale_price_unit;
  const wholesalePrice = stockEntry.sale_price_wholesale;

  // Validar que el precio unitario sea válido
  if (!baseUnitPrice || isNaN(baseUnitPrice) || baseUnitPrice <= 0) {
    throw new Error(`Precio unitario inválido: ${baseUnitPrice}`);
  }

  // For unitario format, check wholesale pricing
  let appliedPrice = baseUnitPrice;
  let priceType: 'unit' | 'wholesale' = 'unit';
  let savings = 0;

  // Apply wholesale pricing if conditions are met
  if (quantity >= WHOLESALE_THRESHOLD && wholesalePrice && wholesalePrice > 0) {
    appliedPrice = wholesalePrice;
    priceType = 'wholesale';
    savings = (baseUnitPrice - wholesalePrice) * quantity;
  }

  const totalPrice = appliedPrice * quantity;

  return {
    unitPrice: baseUnitPrice,
    appliedPrice,
    priceType,
    totalPrice,
    savings,
    wholesaleAvailable: !!(wholesalePrice && wholesalePrice > 0),
    wholesaleThreshold: WHOLESALE_THRESHOLD,
    wholesalePrice: wholesalePrice || undefined
  };
}

/**
 * Calculate pricing for cart item updates
 * Handles dynamic recalculation when quantities change
 */
export function recalculateCartItemPricing(
  cartItem: EnhancedCartItem,
  newQuantity: number
): PricingInfo {
  const stockEntry: StockEntry = {
    id: cartItem.stockEntry.id,
    product_id: cartItem.product.id,
    barcode: cartItem.stockEntry.barcode,
    current_quantity: cartItem.stockEntry.current_quantity,
    initial_quantity: cartItem.stockEntry.current_quantity, // Approximation
    expiration_date: cartItem.stockEntry.expiration_date,
    created_at: cartItem.stockEntry.created_at,
    purchase_price: 0, // Not needed for pricing calculation
    sale_price_unit: cartItem.stockEntry.sale_price_unit,

    sale_price_wholesale: cartItem.stockEntry.sale_price_wholesale
  };

  return calculateUnifiedPricing(stockEntry, newQuantity, 'unitario');
}

/**
 * Get wholesale pricing information for display
 * Shows potential savings and pricing tiers
 */
export function getWholesalePricingInfo(stockEntry: StockEntry): {
  hasWholesalePrice: boolean;
  wholesalePrice?: number;
  threshold: number;
  potentialSavings?: number;
  savingsPercentage?: number;
} {
  const hasWholesalePrice = !!(stockEntry.sale_price_wholesale && stockEntry.sale_price_wholesale > 0);
  
  if (!hasWholesalePrice) {
    return {
      hasWholesalePrice: false,
      threshold: WHOLESALE_THRESHOLD
    };
  }

  const unitPrice = stockEntry.sale_price_unit;
  const wholesalePrice = stockEntry.sale_price_wholesale!;
  const potentialSavings = unitPrice - wholesalePrice;
  const savingsPercentage = (potentialSavings / unitPrice) * 100;

  return {
    hasWholesalePrice: true,
    wholesalePrice,
    threshold: WHOLESALE_THRESHOLD,
    potentialSavings,
    savingsPercentage
  };
}

/**
 * Validate quantity against stock entry limits
 */
export function validateQuantity(
  stockEntry: StockEntry,
  requestedQuantity: number
): {
  isValid: boolean;
  maxQuantity: number;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const maxQuantity = stockEntry.current_quantity;

  // Check basic quantity validation
  if (requestedQuantity <= 0) {
    errors.push('La cantidad debe ser mayor a 0');
  }

  if (requestedQuantity > maxQuantity) {
    errors.push(`Stock insuficiente. Solo hay ${maxQuantity} unidades disponibles.`);
  }

  // Check expiration warnings
  if (stockEntry.expiration_date) {
    const expirationDate = new Date(stockEntry.expiration_date);
    const today = new Date();
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
      warnings.push(`Producto vence pronto (${daysUntilExpiration} días)`);
    } else if (daysUntilExpiration <= 0) {
      errors.push('Este producto está vencido');
    }
  }

  // Check wholesale pricing opportunities
  const wholesaleInfo = getWholesalePricingInfo(stockEntry);
  if (wholesaleInfo.hasWholesalePrice && requestedQuantity >= WHOLESALE_THRESHOLD) {
    warnings.push(`¡Precio mayorista aplicado! Ahorro: $${wholesaleInfo.potentialSavings?.toFixed(0)}`);
  } else if (wholesaleInfo.hasWholesalePrice && requestedQuantity > 0 && requestedQuantity < WHOLESALE_THRESHOLD) {
    const needed = WHOLESALE_THRESHOLD - requestedQuantity;
    warnings.push(`Agregue ${needed} unidad${needed > 1 ? 'es' : ''} más para precio mayorista`);
  }

  return {
    isValid: errors.length === 0,
    maxQuantity,
    warnings,
    errors
  };
}

/**
 * Format pricing information for display
 */
export function formatPricingForDisplay(pricingInfo: PricingInfo): {
  priceText: string;
  totalText: string;
  savingsText?: string;
  priceTypeLabel: string;
  showWholesaleBadge: boolean;
} {
  const priceTypeLabels = {
    unit: 'Precio Unitario',
    wholesale: 'Precio Mayorista'
  };

  const priceText = `$${pricingInfo.appliedPrice.toLocaleString('es-CL')}`;
  const totalText = `$${pricingInfo.totalPrice.toLocaleString('es-CL')}`;
  const priceTypeLabel = priceTypeLabels[pricingInfo.priceType];
  const showWholesaleBadge = pricingInfo.priceType === 'wholesale';
  
  let savingsText: string | undefined;
  if (pricingInfo.savings > 0) {
    savingsText = `Ahorro: $${pricingInfo.savings.toLocaleString('es-CL')}`;
  }

  return {
    priceText,
    totalText,
    savingsText,
    priceTypeLabel,
    showWholesaleBadge
  };
}

/**
 * Calculate cart totals with wholesale pricing
 */
export function calculateCartTotals(cartItems: EnhancedCartItem[]): {
  totalItems: number;
  totalAmount: number;
  totalSavings: number;
  hasWholesaleItems: boolean;
  wholesaleItemsCount: number;
} {
  let totalItems = 0;
  let totalAmount = 0;
  let totalSavings = 0;
  let wholesaleItemsCount = 0;

  cartItems.forEach(item => {
    totalItems += item.quantity;
    totalAmount += item.pricing.totalPrice;
    totalSavings += item.pricing.savings;
    
    if (item.pricing.priceType === 'wholesale') {
      wholesaleItemsCount++;
    }
  });

  return {
    totalItems,
    totalAmount,
    totalSavings,
    hasWholesaleItems: wholesaleItemsCount > 0,
    wholesaleItemsCount
  };
}

/**
 * Legacy compatibility function for existing calculateItemPrice calls
 */
export function calculateItemPrice(input: PriceCalculationInput): PriceCalculationResult {
  const { quantity, unitPrice, wholesalePrice, wholesaleThreshold = WHOLESALE_THRESHOLD } = input;

  // Handle edge cases
  if (quantity < 0) {
    throw new Error('La cantidad no puede ser negativa');
  }
  
  if (quantity === 0) {
    return {
      applicablePrice: unitPrice || 0,
      priceType: 'unit' as const,
      totalPrice: 0,
      savings: 0,
      breakdown: {
        basePrice: unitPrice || 0,
        discountedPrice: unitPrice || 0,
        quantity: 0
      }
    };
  }

  if (quantity > 10000) {
    throw new Error('La cantidad es demasiado alta (máximo 10,000 unidades)');
  }

  const baseUnitPrice = unitPrice || 0;
  let applicablePrice = baseUnitPrice;
  let priceType: 'unit' | 'wholesale' = 'unit';

  // Check if wholesale pricing applies
  if (quantity >= wholesaleThreshold && wholesalePrice && wholesalePrice > 0) {
    applicablePrice = wholesalePrice;
    priceType = 'wholesale';
  }

  const totalPrice = applicablePrice * quantity;
  const baseTotal = baseUnitPrice * quantity;
  const savings = Math.max(0, baseTotal - totalPrice);

  return {
    applicablePrice,
    priceType,
    totalPrice,
    savings,
    breakdown: {
      basePrice: baseUnitPrice,
      discountedPrice: applicablePrice,
      quantity
    }
  };
}