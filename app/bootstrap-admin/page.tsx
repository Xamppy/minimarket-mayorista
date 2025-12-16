'use client';

import React, { useState } from 'react';

export default function BootstrapAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'administrator' | 'vendedor'>('administrator');
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-bootstrap-secret': secret } : {}),
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message = data?.error?.message || 'Error al crear usuario';
        throw new Error(message);
      }

      setSuccess('Usuario creado correctamente. Ahora puedes iniciar sesión.');
      setEmail('');
      setPassword('');
      setSecret('');
      setRole('administrator');
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow-md rounded p-6">
        <h1 className="text-xl font-bold mb-4">Crear cuenta de inicio</h1>
        <p className="text-sm text-gray-600 mb-4">
          Usa este formulario para crear el primer administrador. Si ya existe un administrador, necesitarás el secreto de arranque.
        </p>

        {error && (
          <div className="mb-3 p-2 rounded bg-red-100 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-3 p-2 rounded bg-green-100 text-green-700 text-sm">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="admin@tu-dominio.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="TuClaveSegura123!"
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres, debe incluir letras y números.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'administrator' | 'vendedor')}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="administrator">administrator</option>
              <option value="vendedor">vendedor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Secreto (si ya existe admin)</label>
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="BOOTSTRAP_ADMIN_SECRET"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded px-4 py-2 text-white text-sm font-semibold ${loading ? 'bg-gray-500' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Creando...' : 'Crear usuario'}
          </button>
        </form>

        <div className="text-xs text-gray-500 mt-4">
          Ruta API: <code>/api/auth/bootstrap</code>
        </div>
      </div>
    </div>
  );
}
