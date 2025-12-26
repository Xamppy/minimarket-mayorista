'use client';

import { useState } from 'react';
import ActionButton from './ActionButton';
import StockModal from './StockModal';
import EditProductModal from './EditProductModal';

interface Product {
  id: string;
  name: string;
  brand_name: string;
  type_name: string;
  image_url: string | null;
  total_stock: number;
  min_stock?: number;
  barcode?: string;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface ProductsTableProps {
  products: Product[];
  brands: Brand[];
  productTypes: ProductType[];
  onProductsUpdated: () => void;
}

// Product thumbnail with error handling - Desktop size
function ProductThumbnail({ src, alt, size = 'sm' }: { src: string | null; alt: string; size?: 'sm' | 'lg' }) {
  const [hasError, setHasError] = useState(false);
  
  const sizeClasses = size === 'lg' ? 'w-16 h-16' : 'w-10 h-10';

  const PlaceholderIcon = () => (
    <svg className={`${size === 'lg' ? 'w-8 h-8' : 'w-5 h-5'} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  if (!src || hasError) {
    return (
      <div className={`${sizeClasses} rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0`}>
        <PlaceholderIcon />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses} rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0`}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// Stock badge component
function StockBadge({ stock, minStock, size = 'sm' }: { stock: number; minStock?: number; size?: 'sm' | 'lg' }) {
  const getStockStyles = () => {
    if (stock === 0) return 'bg-red-100 text-red-700';
    if (stock <= (minStock || 10)) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1.5 text-sm' 
    : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${getStockStyles()} ${sizeClasses}`}>
      {stock} {size === 'lg' && 'unidades'}
    </span>
  );
}

export default function ProductsTable({ 
  products, 
  brands, 
  productTypes, 
  onProductsUpdated 
}: ProductsTableProps) {
  const [stockModalState, setStockModalState] = useState<{
    isOpen: boolean;
    productId: string;
    productName: string;
    productBarcode: string;
  }>({
    isOpen: false,
    productId: '',
    productName: '',
    productBarcode: ''
  });

  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({
    isOpen: false,
    product: null
  });

  const handleManageStock = (productId: string, productName: string, productBarcode: string) => {
    setStockModalState({
      isOpen: true,
      productId,
      productName,
      productBarcode
    });
  };

  const handleEditProduct = (product: Product) => {
    setEditModalState({
      isOpen: true,
      product
    });
  };

  const handleCloseStockModal = () => {
    setStockModalState({
      isOpen: false,
      productId: '',
      productName: '',
      productBarcode: ''
    });
  };

  const handleCloseEditModal = () => {
    setEditModalState({
      isOpen: false,
      product: null
    });
  };

  const handleProductUpdated = () => {
    onProductsUpdated();
  };

  const handleProductDeleted = () => {
    onProductsUpdated();
  };

  return (
    <>
      {/* ===================== MOBILE VIEW - Cards ===================== */}
      <div className="block md:hidden space-y-3">
        {products.map((product) => (
          <div 
            key={product.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            {/* Header: Image + Product Info */}
            <div className="flex gap-4">
              {/* Product Image - 64x64 */}
              <ProductThumbnail src={product.image_url} alt={product.name} size="lg" />
              
              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {product.brand_name} • {product.type_name}
                </p>
              </div>
            </div>

            {/* Status Bar: Stock + Barcode */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <StockBadge stock={product.total_stock} minStock={product.min_stock} size="lg" />
              {product.barcode && (
                <span className="text-xs text-gray-400 font-mono">
                  {product.barcode}
                </span>
              )}
            </div>

            {/* Action Buttons - 3 Column Grid */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                onClick={() => handleManageStock(product.id, product.name, product.barcode || '')}
                className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Stock
              </button>
              
              <button
                onClick={() => handleEditProduct(product)}
                className="flex items-center justify-center gap-1 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </button>
              
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${product.name}"?`)) {
                    handleProductDeleted();
                  }
                }}
                className="flex items-center justify-center gap-1 px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ===================== DESKTOP VIEW - Table ===================== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-14">
                {/* Image column */}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Producto
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Marca
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Stock
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {products.map((product) => (
              <tr 
                key={product.id} 
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Image Thumbnail */}
                <td className="px-4 py-3">
                  <ProductThumbnail src={product.image_url} alt={product.name} size="sm" />
                </td>
                {/* Product Name */}
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900">
                    {product.name}
                  </div>
                  {product.barcode && (
                    <div className="text-xs text-gray-400 mt-0.5 font-mono">
                      {product.barcode}
                    </div>
                  )}
                </td>
                {/* Brand */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {product.brand_name}
                </td>
                {/* Type */}
                <td className="px-4 py-3 text-sm text-gray-600">
                  {product.type_name}
                </td>
                {/* Stock - Right aligned */}
                <td className="px-4 py-3 text-right">
                  <StockBadge stock={product.total_stock} minStock={product.min_stock} size="sm" />
                </td>
                {/* Actions - Right aligned */}
                <td className="px-4 py-3 text-right">
                  <ActionButton
                    product={product}
                    onManageStock={handleManageStock}
                    onEditProduct={handleEditProduct}
                    onProductDeleted={handleProductDeleted}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <StockModal
        isOpen={stockModalState.isOpen}
        onClose={handleCloseStockModal}
        productId={stockModalState.productId}
        productName={stockModalState.productName}
        productBarcode={stockModalState.productBarcode}
      />

      <EditProductModal
        isOpen={editModalState.isOpen}
        onClose={handleCloseEditModal}
        product={editModalState.product}
        brands={brands}
        productTypes={productTypes}
        onProductUpdated={handleProductUpdated}
      />
    </>
  );
}