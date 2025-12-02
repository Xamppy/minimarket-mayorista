'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Label } from '@/app/components/ui/Label';
import { Input } from '@/app/components/ui/Input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'No se pudo enviar el código');
      }
      setSent(true);
      toast.success('Si el email existe, te enviaremos un código de recuperación.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h1>
        <p className="text-gray-600 mb-6">Ingresa tu correo y te enviaremos un código para restablecer tu contraseña.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1 block">Correo electrónico</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !email}
            className="w-full bg-indigo-600 text-white py-2 rounded-md disabled:bg-gray-400"
          >
            {loading ? 'Enviando...' : 'Enviar Código'}
          </button>
        </form>
        {sent && (
          <div className="mt-4 text-sm text-gray-600">
            <p>Revisa tu bandeja de entrada. Cuando tengas el código, continúa a <a href="/auth/reset-password" className="text-indigo-600 hover:underline">Restablecer Contraseña</a>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
