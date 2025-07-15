// Wholesale Pricing Utilities and Validation Functions
import { 
  StockEntry, 
  PricingInfo, 
  PriceCalculationInput, 
  PriceCalculationResult,
  WholesalePriceValidation 
} from './types';

// Constants
export const WHOLESALE_THRESHOLD = 3; // Minimum quantity for wholesale pricing
export const MAX_WHOLESALE_PRICE = 999999.99;
export const MIN_WHOLESALE_PRICE = 0.01;

/**
 * Validates wholesale price input
 */
export function validateWholesalePrice(price: string | number | null | undefined): WholesalePriceValidation {
  if (price === null || price === undefined || price === '') {
    return { isValid: true, normalizedValue: undefined };
  }

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numericPrice)) {
    return { 
      isValid: false, 
      error: 'El precio mayorista debe ser un número válido' 
    };
  }

  if (numericPrice < MIN_WHOLESALE_PRICE) {
    return { 
      isValid: false, 
      error: `El precio mayorista debe ser mayor a $${MIN_WHOLESALE_PRICE}` 
    };
  }

  if (numericPrice > MAX_WHOLESALE_PRICE) {
    return { 
      isValid: false, 
      error: `El precio mayorista no puede exceder $${MAX_WHOLESALE_PRICE}` 
    };
  }

  return { 
    isValid: true, 
    normalizedValue: Math.round(numericPrice * 100) / 100 // Round to 2 decimal places
  };
}

/**
 * Calculates the applicable price based on quantity and available pricing options
 */
export function calculateItemPrice(input: PriceCalculationInput): PriceCalculationResult {
  const { quantity, unitPrice, boxPrice, wholesalePrice, wholesaleThreshold = WHOLESALE_THRESHOLD } = input;

  // Default to unit price if no pricing is available
  if (!unitPrice && !boxPrice && !wholesalePrice) {
    throw new Error('Al menos un precio debe estar disponible');
  }

  const baseUnitPrice = unitPrice || 0;
  let applicablePrice = baseUnitPrice;
  let priceType: 'unit' | 'box' | 'wholesale' = 'unit';

  // Check if wholesale pricing applies (quantity >= threshold and wholesale price available)
  if (quantity >= wholesaleThreshold && wholesalePrice && wholesalePrice > 0) {
    applicablePrice = wholesalePrice;
    priceType = 'wholesale';
  } else if (boxPrice && boxPrice > 0) {
    // Use box price if available and no wholesale applies
    applicablePrice = boxPrice;
    priceType = 'box';
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

/**
 * Gets applicable price information for display purposes
 */
export function getApplicablePrice(stockEntry: StockEntry, quantity: number): PricingInfo {
  const calculation = calculateItemPrice({
    quantity,
    unitPrice: stockEntry.sale_price_unit,
    boxPrice: stockEntry.sale_price_box,
    wholesalePrice: stockEntry.sale_price_wholesale
  });

  return {
    unitPrice: stockEntry.sale_price_unit,
    boxPrice: stockEntry.sale_price_box,
    wholesalePrice: stockEntry.sale_price_wholesale,
    applicablePrice: calculation.applicablePrice,
    priceType: calculation.priceType,
    savings: calculation.savings
  };
}

/**
 * Formats pricing information for UI display
 */
export function formatPricingDisplay(pricingInfo: PricingInfo): {
  priceText: string;
  savingsText?: string;
  priceTypeLabel: string;
} {
  const { applicablePrice, priceType, savings } = pricingInfo;

  const priceTypeLabels = {
    unit: 'Precio Unitario',
    box: 'Precio por Caja',
    wholesale: 'Precio Mayorista'
  };

  const priceText = `$${applicablePrice?.toFixed(2) || '0.00'}`;
  const priceTypeLabel = priceTypeLabels[priceType];
  
  const savingsText = savings && savings > 0 
    ? `Ahorro: $${savings.toFixed(2)}` 
    : undefined;

  return {
    priceText,
    savingsText,
    priceTypeLabel
  };
}

/**
 * Type guard to check if a stock entry has wholesale pricing
 */
export function hasWholesalePrice(stockEntry: StockEntry): boolean {
  return !!(stockEntry.sale_price_wholesale && stockEntry.sale_price_wholesale > 0);
}

/**
 * Determines if wholesale pricing should be applied for a given quantity
 */
export function shouldApplyWholesalePrice(stockEntry: StockEntry, quantity: number): boolean {
  return hasWholesalePrice(stockEntry) && quantity >= WHOLESALE_THRESHOLD;
}