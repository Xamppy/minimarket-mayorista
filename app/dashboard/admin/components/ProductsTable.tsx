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

// Product thumbnail with error handling
function ProductThumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [hasError, setHasError] = useState(false);

  const PlaceholderIcon = () => (
    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );

  if (!src || hasError) {
    return (
      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <PlaceholderIcon />
      </div>
    );
  }

  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
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
      <div className="overflow-x-auto">
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
                  <ProductThumbnail src={product.image_url} alt={product.name} />
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
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    product.total_stock === 0 
                      ? 'bg-red-100 text-red-700'
                      : product.total_stock <= (product.min_stock || 10)
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {product.total_stock}
                  </span>
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