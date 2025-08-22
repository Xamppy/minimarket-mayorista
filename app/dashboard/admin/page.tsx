'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminDashboard from './components/AdminDashboard';
import AdminErrorBoundary from './components/AdminErrorBoundary';
import { getCurrentUser, authenticatedFetchJson, isAuthenticated, logout } from '../../utils/auth/api';

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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [productsError, setProductsError] = useState<Error | null>(null);

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

        // Cargar datos del dashboard
        await loadDashboardData();
        
      } catch (err) {
        console.error('Error de autenticación:', err);
        // Token inválido o expirado - limpiar estado y redirigir
        setUser(null);
        setRole('');
        logout(router);
        return; // Evitar renderizar el componente con user null
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      // Cargar productos, marcas y tipos en paralelo usando las funciones utilitarias
      const [productsData, brandsData, typesData] = await Promise.allSettled([
        authenticatedFetchJson('/api/products'),
        authenticatedFetchJson('/api/brands'),
        authenticatedFetchJson('/api/product-types')
      ]);

      // Procesar resultados de productos
      if (productsData.status === 'fulfilled') {
        setProducts(productsData.value.products || []);
      } else {
        console.error('Error al cargar productos:', productsData.reason);
        setProductsError(new Error('Error al cargar productos'));
      }

      // Procesar resultados de marcas
      if (brandsData.status === 'fulfilled') {
        console.log('Datos de marcas recibidos:', brandsData.value);
        setBrands(brandsData.value || []);
      } else {
        console.error('Error al cargar marcas:', brandsData.reason);
      }

      // Procesar resultados de tipos de productos
      if (typesData.status === 'fulfilled') {
        console.log('Datos de tipos recibidos:', typesData.value);
        setProductTypes(typesData.value || []);
      } else {
        console.error('Error al cargar tipos de productos:', typesData.reason);
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      setProductsError(new Error('Error al cargar datos'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
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
            Solo los administradores pueden ver el dashboard.
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

  if (error === 'auth_error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error del Sistema</h1>
          <p className="text-gray-700 mb-4">
            No se pudo verificar tu rol de usuario. Por favor, contacta al administrador del sistema.
          </p>
          <p className="text-sm text-gray-500">
            Usuario: <strong>{user?.email || 'No disponible'}</strong>
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
    <AdminErrorBoundary>
      <AdminDashboard
        user={user}
        role={role}
        products={products}
        brands={brands}
        productTypes={productTypes}
        productsError={productsError}
      />
    </AdminErrorBoundary>
  );
}