'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReportsClient from './components/ReportsClient';
import ReportsErrorBoundary from './components/ReportsErrorBoundary';
import { getCurrentUser, isAuthenticated, logout } from '../../utils/auth/api';

interface User {
  id: string;
  email: string;
  role: string;
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si hay token
        const authenticated = await isAuthenticated();
        if (!authenticated) {
          router.push('/');
          return;
        }

        // Obtener datos del usuario
        const userData = await getCurrentUser();
        setUser(userData.user);
        setRole(userData.user.role);

        // Verificar si el rol es 'administrator'
        if (userData.user.role !== 'administrator') {
          setError('access_denied');
          setLoading(false);
          return;
        }
        
      } catch (err) {
        console.error('Error de autenticación:', err);
        // Token inválido o expirado - limpiar estado y redirigir
        setUser(null);
        setRole('');
        logout(router);
        return;
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  if (error === 'access_denied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h1>
          <p className="text-gray-700 mb-4">
            No tienes permisos para acceder a esta página. 
            Solo los administradores pueden ver los reportes.
          </p>
          <p className="text-sm text-gray-500">
            Usuario: <strong>{user?.email || 'No disponible'}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Rol actual: <strong>{role || 'Sin rol asignado'}</strong>
          </p>
        </div>
      </div>
    );
  }

  // Verificación adicional de seguridad
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📊 Reportes de Ventas</h1>
              <p className="text-gray-600 mt-2">
                Análisis y estadísticas del negocio
              </p>
            </div>
            <div>
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver a Admin
              </Link>
            </div>
          </div>
        </div>

        {/* Componente Cliente con los reportes */}
        <ReportsErrorBoundary>
          <ReportsClient />
        </ReportsErrorBoundary>
      </div>
    </div>
  );
}