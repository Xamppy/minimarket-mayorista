import { createClient } from '../../utils/supabase/server';  
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ProductForm from './components/ProductForm';
import AdminPageClient from './components/AdminPageClient';

interface Product {
  id: string;
  name: string;
  image_url: string | null;
  brands?: {
    name: string;
  };
  product_types?: {
    name: string;
  };
}

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



export default async function AdminDashboardPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Obtener rol del usuario usando la función RPC
  const { data: role, error } = await supabase.rpc('get_user_role', { user_id: user.id });

  // Manejo de errores en la llamada RPC
  if (error) {
    console.error('Error al obtener rol del usuario:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error del Sistema</h1>
          <p className="text-gray-700 mb-4">
            No se pudo verificar tu rol de usuario. Por favor, contacta al administrador del sistema.
          </p>
          <p className="text-sm text-gray-500">
            Usuario: <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-red-500">
            Error: {error.message || 'Error desconocido'}
          </p>
        </div>
      </div>
    );
  }

  // Verificar si el rol es 'administrador'
  if (!role || role !== 'administrador') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-700 mb-4">
            No tienes permisos para acceder a esta página. 
            Solo los administradores pueden ver el dashboard.
          </p>
          <p className="text-sm text-gray-500">
            Usuario: <strong>{user.email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Rol actual: <strong>{role || 'Sin rol asignado'}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Obtener todos los productos con información relacionada de marcas y tipos
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

  // Obtener stock total para cada producto
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

  // Obtener todas las marcas para el formulario
  const { data: brands } = await supabase
    .from('brands')
    .select('id, name')
    .order('name') as { data: Brand[] | null; error: any };

  // Obtener todos los tipos de productos para el formulario
  const { data: productTypes } = await supabase
    .from('product_types')
    .select('id, name')
    .order('name') as { data: ProductType[] | null; error: any };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Administrador</h1>
          <p className="text-gray-600 mt-2">
            Bienvenido, <strong>{user.email}</strong>
          </p>
          {/* Información de depuración del rol */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Debug - Información del usuario:</strong>
            </p>
            <p className="text-sm text-blue-700">
              ID de usuario: <code className="bg-blue-100 px-1 rounded">{user.id}</code>
            </p>
            <p className="text-sm text-blue-700">
              Rol obtenido: <code className="bg-blue-100 px-1 rounded">{role}</code>
            </p>
            <p className="text-sm text-blue-700">
              Tipo de rol: <code className="bg-blue-100 px-1 rounded">{typeof role}</code>
            </p>
          </div>
        </div>

        {/* Formulario para Registrar Producto en Catálogo */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Registrar Producto en Catálogo General
            </h2>
            <ProductForm 
              brands={brands || []}
              productTypes={productTypes || []}
            />
          </div>
        </div>

        {/* Lista de Productos en Tabla */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {productsError ? (
            <div className="text-red-600 bg-red-50 p-4 rounded-md">
              <p className="font-medium">Error al cargar productos:</p>
              <p className="text-sm">{productsError.message}</p>
            </div>
          ) : (
            <AdminPageClient
              initialProducts={productsWithStock.map((product: ProductWithStock) => ({
                id: product.id,
                name: product.name,
                brand_name: product.brand_name,
                type_name: product.type_name,
                image_url: product.image_url,
                total_stock: product.total_stock
              }))}
              brands={brands || []}
              productTypes={productTypes || []}
            />
          )}
        </div>
      </div>
    </div>
  );
} 