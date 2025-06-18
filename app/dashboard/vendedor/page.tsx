import { createClient } from '../../utils/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import SearchBar from './components/SearchBar';
import VendorPageClient from './components/VendorPageClient';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brand_name: string;
  total_stock: number;
}

interface PageProps {
  searchParams: Promise<{ search?: string }>;
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

  // Obtener productos con stock total usando RPC y filtrar por búsqueda
  let query = supabase.rpc('get_products_with_stock');

  // Si hay término de búsqueda, filtrar los resultados
  if (searchTerm.trim()) {
    // Como la función RPC no permite filtros directos, obtenemos todos los productos
    // y luego filtramos en el cliente. Para mejor rendimiento, podrías crear
    // una función RPC que acepte parámetros de búsqueda.
    const { data: allProducts, error: productsError } = await query;
    
    if (productsError) {
      return renderPage(user, [], productsError, searchTerm);
    }

    // Filtrar productos por nombre o marca
    const filteredProducts = allProducts?.filter((product: Product) => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand_name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return renderPage(user, filteredProducts, null, searchTerm);
  } else {
    const { data: products, error: productsError } = await query.order('name');
    return renderPage(user, products || [], productsError, searchTerm);
  }
}

function renderPage(user: any, products: Product[], productsError: any, searchTerm: string) {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black">Dashboard del Vendedor</h1>
          <p className="text-black mt-2">
            Bienvenido, <strong>{user.email}</strong>
          </p>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>}>
            <SearchBar />
          </Suspense>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-black">
              Catálogo de Productos ({products?.length || 0})
            </h2>
            {searchTerm && (
              <div className="text-sm text-black">
                Resultados para: <span className="font-medium">"{searchTerm}"</span>
              </div>
            )}
          </div>
          
          {productsError ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              <p className="font-medium">Error al cargar productos:</p>
              <p className="text-sm">{productsError.message}</p>
            </div>
                      ) : (
              <VendorPageClient 
                products={products.map(product => ({
                  id: product.id,
                  name: product.name,
                  brand_name: product.brand_name,
                  total_stock: product.total_stock,
                  image_url: product.image_url
                }))} 
                searchTerm={searchTerm}
              />
            )}
        </div>
      </div>
    </div>
  );
} 