import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import VendorPageClient from './components/VendorPageClient';
import { authenticatedFetchServer } from '../../utils/auth/server-api';
import { getCurrentUserServer } from '../../utils/auth/server';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brand_name: string;
  total_stock: number;
  type_name?: string;
}

interface ProductType {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface PageProps {
  searchParams: Promise<{ search?: string; category?: string; brand?: string }>;
}

export default async function VendedorDashboardPage({ searchParams }: PageProps) {
  try {
    const resolvedSearchParams = await searchParams;
    const searchTerm = resolvedSearchParams.search || '';
    const categoryFilter = resolvedSearchParams.category || '';
    const brandFilter = resolvedSearchParams.brand || '';

    // Obtener datos del usuario autenticado
    const userData = await getCurrentUserServer();
    if (!userData) {
      redirect('/');
    }

    // Verificar si el rol es 'vendedor' o 'administrator'
    if (userData.user.role !== 'vendedor' && userData.user.role !== 'administrator') {
      redirect('/');
    }

    // Obtener tipos de productos para las categorías
    const productTypesResponse = await authenticatedFetchServer('/api/product-types', {
      method: 'GET'
    });
    const productTypes = productTypesResponse.ok ? await productTypesResponse.json() : [];

    // Obtener todas las marcas para el filtrado
    const brandsResponse = await authenticatedFetchServer('/api/brands', {
      method: 'GET'
    });
    const brands = brandsResponse.ok ? await brandsResponse.json() : [];

    // Obtener productos con stock usando RPC
    const productsResponse = await authenticatedFetchServer('/api/rpc/get_products_with_stock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!productsResponse.ok) {
      const error = await productsResponse.text();
      return renderPage(userData.user, [], { message: error }, searchTerm, categoryFilter, brandFilter, productTypes, brands);
    }

    const productsWithStock = await productsResponse.json();

    // Extraer el array de productos de la respuesta de manera segura
    let productsArray = [];
    if (Array.isArray(productsWithStock)) {
      productsArray = productsWithStock;
    } else if (productsWithStock && Array.isArray(productsWithStock.result)) {
      productsArray = productsWithStock.result;
    } else if (productsWithStock && productsWithStock.data && Array.isArray(productsWithStock.data)) {
      productsArray = productsWithStock.data;
    }

    // Mapear los datos para que coincidan con la interfaz esperada
    const mappedProducts = productsArray.map((product: any) => ({
      id: product.id,
      name: product.name,
      brand_name: product.brand_name || 'Sin marca',
      type_name: product.product_type_name || 'Sin tipo',
      image_url: product.image_url,
      total_stock: parseInt(product.stock_quantity) || 0
    }));

    let filteredProducts = mappedProducts;

    // Filtrar por búsqueda si hay término
    if (searchTerm.trim()) {
      filteredProducts = filteredProducts.filter((product: Product) => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por categoría si hay filtro
    if (categoryFilter.trim()) {
      filteredProducts = filteredProducts.filter((product: Product) => 
        product.type_name?.toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    // Filtrar por marca si hay filtro
    if (brandFilter.trim()) {
      filteredProducts = filteredProducts.filter((product: Product) => 
        product.brand_name?.toLowerCase() === brandFilter.toLowerCase()
      );
    }

    return renderPage(userData.user, filteredProducts, null, searchTerm, categoryFilter, brandFilter, productTypes, brands);
  } catch (error) {
    console.error('Error en VendedorDashboardPage:', error);
    redirect('/');
  }
}

function renderPage(
  user: any, 
  products: Product[], 
  productsError: any, 
  searchTerm: string, 
  categoryFilter: string,
  brandFilter: string,
  productTypes: ProductType[],
  brands: Brand[]
) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header con información del usuario */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-lg md:text-2xl font-bold text-black truncate">
                Vendedor - Venta Rápida
              </h1>
              <p className="text-xs md:text-sm text-gray-600 truncate">
                {user?.email || 'Usuario'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {user?.role === 'administrator' && (
                <Link
                  href="/dashboard/admin"
                  className="inline-flex items-center px-3 py-1.5 border border-indigo-600 rounded-md text-xs sm:text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                  </svg>
                  Volver al Admin
                </Link>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600 hidden sm:inline">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal con el componente client */}
      <div className="flex-1 overflow-hidden">
        <VendorPageClient
          products={products}
          searchTerm={searchTerm}
          categoryFilter={categoryFilter}
          brandFilter={brandFilter}
          productTypes={productTypes}
          brands={brands}
          productsError={productsError}
        />
      </div>
    </div>
  );
}