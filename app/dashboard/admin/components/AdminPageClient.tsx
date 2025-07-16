'use client';

import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import ProductsTable from './ProductsTable';
import WholesalePricingReports from './WholesalePricingReports';

interface ProductWithStock {
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

interface AdminPageClientProps {
  initialProducts: ProductWithStock[];
  brands: Brand[];
  productTypes: ProductType[];
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AdminPageClient({ 
  initialProducts, 
  brands, 
  productTypes 
}: AdminPageClientProps) {
  const [products, setProducts] = useState<ProductWithStock[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      // Recargar la página para obtener datos actualizados
      window.location.reload();
    } catch (error) {
      console.error('Error al actualizar productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductsUpdated = () => {
    fetchProducts();
  };

  const tabs = [
    {
      name: 'Productos',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      component: (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Productos ({products.length})
            </h2>
          </div>
          
          {loading && (
            <div className="text-center py-4">
              <p className="text-gray-600">Actualizando productos...</p>
            </div>
          )}
          
          {products.length > 0 ? (
            <ProductsTable 
              products={products}
              brands={brands}
              productTypes={productTypes}
              onProductsUpdated={handleProductsUpdated}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No hay productos registrados.</p>
              <p className="text-sm">Añade el primer producto usando el formulario.</p>
            </div>
          )}
        </div>
      )
    },
    {
      name: 'Reportes Mayoristas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      component: <WholesalePricingReports />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          {tabs.map((tab) => (
            <Tab
              key={tab.name}
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              <div className="flex items-center justify-center space-x-2">
                {tab.icon}
                <span>{tab.name}</span>
              </div>
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-6">
          {tabs.map((tab, tabIndex) => (
            <Tab.Panel
              key={tabIndex}
              className={classNames(
                'rounded-xl bg-white p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              {tab.component}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
} 