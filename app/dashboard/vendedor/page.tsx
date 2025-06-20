import { createClient } from '../../utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import VendorPageWrapper from './components/VendorPageWrapper';
import FixedSearchBar from './components/FixedSearchBar';

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
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const resolvedSearchParams = await searchParams;
  const searchTerm = resolvedSearchParams.search || '';
  const categoryFilter = resolvedSearchParams.category || '';
  const brandFilter = resolvedSearchParams.brand || '';

  // Obtener tipos de productos para las categorías
  const { data: productTypes } = await supabase
    .from('product_types')
    .select('id, name')
    .order('name');

  // Obtener todas las marcas para el filtrado
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name');

  // Obtener todos los productos con información relacionada de marcas y tipos (igual que en admin)
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      image_url,
      brands (
        name
      ),
      product_types (
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (productsError) {
    return renderPage(user, [], productsError, searchTerm, categoryFilter, brandFilter, productTypes || [], brands || []);
  }

  // Obtener stock total para cada producto (igual que en admin)
  const productsWithStock = await Promise.all(
    (products || []).map(async (product) => {
      const { data: stockData } = await supabase
        .from('stock_entries')
        .select('current_quantity')
        .eq('product_id', product.id);
      
      const total_stock = stockData?.reduce((sum, entry) => sum + (entry.current_quantity || 0), 0) || 0;
      
      return {
        id: product.id,
        name: product.name,
        brand_name: (product.brands as any)?.name || 'Sin marca',
        type_name: (product.product_types as any)?.name || 'Sin tipo',
        image_url: product.image_url,
        total_stock
      };
    })
  );

  let filteredProducts = productsWithStock;

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

  return renderPage(user, filteredProducts, null, searchTerm, categoryFilter, brandFilter, productTypes || [], brands || []);
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
      {/* Header sticky con barra de búsqueda integrada */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-3 max-w-7xl mx-auto">
          {/* Primera fila: Título y estado */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-lg md:text-2xl font-bold text-black truncate">
                Vendedor
              </h1>
              <p className="text-xs md:text-sm text-gray-600 truncate">
                {user.email}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Indicador de estado online */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-600 hidden sm:inline">Online</span>
              </div>
            </div>
          </div>
          
          {/* Segunda fila: Barra de búsqueda fija */}
          <div className="w-full relative">
            <Suspense fallback={
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
            }>
              <FixedSearchBar />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Contenido principal scrolleable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 md:py-6 max-w-7xl mx-auto">
          {/* Wrapper del contenido */}
          <VendorPageWrapper
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
    </div>
  );
}