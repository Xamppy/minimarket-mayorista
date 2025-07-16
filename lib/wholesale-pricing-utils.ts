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

  // Validaciones mejoradas de entrada
  if (quantity <= 0) {
    throw new Error('La cantidad debe ser mayor a 0');
  }

  if (quantity > 10000) {
    throw new Error('La cantidad es demasiado alta (máximo 10,000 unidades)');
  }

  // Default to unit price if no pricing is available
  if (!unitPrice && !boxPrice && !wholesalePrice) {
    throw new Error('Al menos un precio debe estar disponible para calcular el total');
  }

  if (unitPrice && unitPrice < 0) {
    throw new Error('El precio unitario no puede ser negativo');
  }

  if (boxPrice && boxPrice < 0) {
    throw new Error('El precio por caja no puede ser negativo');
  }

  if (wholesalePrice && wholesalePrice < 0) {
    throw new Error('El precio mayorista no puede ser negativo');
  }

  const baseUnitPrice = unitPrice || 0;
  let applicablePrice = baseUnitPrice;
  let priceType: 'unit' | 'box' | 'wholesale' = 'unit';

  // Check if wholesale pricing applies (quantity >= threshold and wholesale price available)
  if (quantity >= wholesaleThreshold && wholesalePrice && wholesalePrice > 0) {
    applicablePrice = wholesalePrice;
    priceType = 'wholesale';
  }
  // Si no se aplica wholesale pricing, mantener el precio unitario por defecto
  // La lógica de precio de caja se maneja en el componente según el formato de venta

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

/**
 * Validates if wholesale pricing can be applied and provides user-friendly error messages
 */
export function validateWholesalePricingAvailability(
  stockEntry: StockEntry, 
  requestedQuantity: number
): { 
  canApplyWholesale: boolean; 
  message?: string; 
  fallbackPrice?: number;
  priceType: 'unit' | 'wholesale' | 'unavailable';
} {
  // Verificar si hay stock suficiente
  if (requestedQuantity > stockEntry.current_quantity) {
    return {
      canApplyWholesale: false,
      message: `Stock insuficiente. Solo quedan ${stockEntry.current_quantity} unidades disponibles.`,
      priceType: 'unavailable'
    };
  }

  // Verificar si el producto tiene precio mayorista
  if (!hasWholesalePrice(stockEntry)) {
    return {
      canApplyWholesale: false,
      message: 'Este producto no tiene precio mayorista disponible.',
      fallbackPrice: stockEntry.sale_price_unit,
      priceType: 'unit'
    };
  }

  // Verificar si la cantidad cumple el umbral
  if (requestedQuantity < WHOLESALE_THRESHOLD) {
    return {
      canApplyWholesale: false,
      message: `Se requieren al menos ${WHOLESALE_THRESHOLD} unidades para aplicar precio mayorista. Cantidad actual: ${requestedQuantity}`,
      fallbackPrice: stockEntry.sale_price_unit,
      priceType: 'unit'
    };
  }

  // Todo está bien para aplicar wholesale pricing
  return {
    canApplyWholesale: true,
    message: `¡Precio mayorista aplicado! Ahorro por unidad: $${((stockEntry.sale_price_unit || 0) - (stockEntry.sale_price_wholesale || 0)).toFixed(2)}`,
    fallbackPrice: stockEntry.sale_price_wholesale,
    priceType: 'wholesale'
  };
}