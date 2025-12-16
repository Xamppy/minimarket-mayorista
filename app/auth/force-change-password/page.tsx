'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Label } from '@/app/components/ui/Label';
import { Input } from '@/app/components/ui/Input';

export default function ForceChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/force-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'No se pudo cambiar la contraseña');
      }
      toast.success('Contraseña actualizada. Ingresando...');
      router.push('/dashboard/vendedor');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cambio de Contraseña</h1>
        <p className="text-gray-600 mb-6">Debes cambiar tu contraseña para continuar.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block">Contraseña Actual</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label className="mb-1 block">Nueva Contraseña</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword}
            className="w-full bg-indigo-600 text-white py-2 rounded-md disabled:bg-gray-400"
          >
            {loading ? 'Guardando...' : 'Cambiar Contraseña'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/auth/forgot-password" className="text-sm text-indigo-600 hover:underline">¿Olvidaste tu contraseña?</a>
        </div>
      </div>
    </div>
  );
}
