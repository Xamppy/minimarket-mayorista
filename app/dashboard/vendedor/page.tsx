import { createClient } from '../../utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import VendorPageWrapper from './components/VendorPageWrapper';

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-black">Dashboard del Vendedor</h1>
          <p className="text-black mt-2">
            Bienvenido, <strong>{user.email}</strong>
          </p>
        </div>

        {/* Contenido del dashboard */}
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
  );
}