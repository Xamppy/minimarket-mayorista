import { createClient } from '../../utils/supabase/server';  
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ReportsClient from './components/ReportsClient';

export default async function ReportsPage() {
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
            Solo los administradores pueden ver los reportes.
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📊 Reportes de Ventas</h1>
          <p className="text-gray-600 mt-2">
            Análisis y estadísticas del negocio - <strong>{user.email}</strong>
          </p>
        </div>

        {/* Componente Cliente con los reportes */}
        <ReportsClient />
      </div>
    </div>
  );
} 