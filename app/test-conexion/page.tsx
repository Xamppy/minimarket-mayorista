import { createClient } from '../utils/supabase/server';
import { cookies } from 'next/headers';

interface Product {
  id: string;
  name?: string;
  title?: string;
}

export default async function TestConexionPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Obtener la sesión del usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Si no hay usuario autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Test de Conexión</h1>
          <p className="text-red-600">No has iniciado sesión.</p>
        </div>
      </div>
    );
  }

  // Si hay usuario, intentar obtener productos
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .limit(5) as { data: Product[] | null; error: any };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Test de Conexión</h1>
        
        {productsError ? (
          <div>
            <p className="text-yellow-600 mb-2">
              Conectado como <strong>{user.email}</strong>, pero no se pudieron cargar los productos.
            </p>
            <p className="text-sm text-gray-500">Error: {productsError.message}</p>
          </div>
        ) : (
          <div>
            <p className="text-green-600 font-semibold mb-4">
              ¡Conexión Exitosa! Conectado como <strong>{user.email}</strong>
            </p>
            
            {products && products.length > 0 ? (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Productos encontrados:</h2>
                <ul className="list-disc list-inside space-y-1">
                  {products.map((product, index) => (
                    <li key={index} className="text-gray-700">
                      {product.name || product.title || `Producto ${product.id}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-gray-600">No se encontraron productos en la tabla.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 