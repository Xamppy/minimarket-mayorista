'use client';

import { formatAsCLP } from '@/lib/formatters';

interface WholesalePricingIndicatorProps {
  unitPrice: number;
  wholesalePrice?: number | null;
  currentQuantity: number;
  wholesaleThreshold?: number;
  size?: 'small' | 'medium' | 'large';
  showSavings?: boolean;
}

export default function WholesalePricingIndicator({
  unitPrice,
  wholesalePrice,
  currentQuantity,
  wholesaleThreshold = 3,
  size = 'medium',
  showSavings = true
}: WholesalePricingIndicatorProps) {
  if (!wholesalePrice || wholesalePrice <= 0) {
    return null;
  }

  const isWholesaleActive = currentQuantity >= wholesaleThreshold;
  const savings = (unitPrice - wholesalePrice) * currentQuantity;
  const potentialSavings = (unitPrice - wholesalePrice) * wholesaleThreshold;

  const sizeClasses = {
    small: {
      container: 'text-xs px-2 py-1',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    medium: {
      container: 'text-sm px-3 py-2',
      icon: 'w-4 h-4',
      text: 'text-sm'
    },
    large: {
      container: 'text-base px-4 py-3',
      icon: 'w-5 h-5',
      text: 'text-base'
    }
  };

  const classes = sizeClasses[size];

  if (isWholesaleActive) {
    // Wholesale pricing is active
    return (
      <div className={`bg-purple-100 border border-purple-200 rounded-lg ${classes.container}`}>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <svg className={`${classes.icon} text-purple-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            <span className={`font-medium text-purple-800 ${classes.text}`}>
              🎉 Precio Mayorista Activo
            </span>
          </div>
        </div>
        <div className={`mt-1 ${classes.text}`}>
          <p className="text-purple-700">
            {formatAsCLP(wholesalePrice)} por unidad
          </p>
          {showSavings && savings > 0 && (
            <p className="text-green-700 font-medium">
              Ahorro: {formatAsCLP(savings)}
            </p>
          )}
        </div>
      </div>
    );
  } else {
    // Wholesale pricing is available but not active
    const unitsNeeded = wholesaleThreshold - currentQuantity;
    
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg ${classes.container}`}>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <svg className={`${classes.icon} text-yellow-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className={`font-medium text-yellow-800 ${classes.text}`}>
              💰 Precio Mayorista Disponible
            </span>
          </div>
        </div>
        <div className={`mt-1 ${classes.text}`}>
          <p className="text-yellow-700">
            {formatAsCLP(wholesalePrice)} por unidad ({wholesaleThreshold}+ unidades)
          </p>
          {currentQuantity > 0 && (
            <p className="text-orange-700">
              Agregue {unitsNeeded} más para activar
            </p>
          )}
          {showSavings && potentialSavings > 0 && (
            <p className="text-green-700 font-medium">
              Ahorro potencial: {formatAsCLP(potentialSavings)}
            </p>
          )}
        </div>
      </div>
    );
  }
}