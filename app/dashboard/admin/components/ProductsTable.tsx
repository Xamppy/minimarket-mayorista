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
  }>({
    isOpen: false,
    productId: '',
    productName: ''
  });

  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    product: Product | null;
  }>({
    isOpen: false,
    product: null
  });

  const handleManageStock = (productId: string, productName: string) => {
    setStockModalState({
      isOpen: true,
      productId,
      productName
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
      productName: ''
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marca
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.brand_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.type_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                    {product.total_stock} unidades
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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