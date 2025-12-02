'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function CreateVendedorForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/users/create-vendedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.error || 'No se pudo crear el vendedor');
      }
      toast.success('Cuenta creada. La contraseña inicial ha sido enviada al correo del nuevo vendedor.');
      setEmail('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Crear Cuenta de Vendedor</h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
          disabled={loading}
          className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md disabled:bg-gray-400"
        >
          {loading ? 'Creando...' : 'Crear Vendedor'}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-2">Se enviará una contraseña temporal al correo y el vendedor deberá cambiarla al iniciar sesión.</p>
    </div>
  );
}
