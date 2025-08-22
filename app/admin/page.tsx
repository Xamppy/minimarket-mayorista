import { redirect } from 'next/navigation';

/**
 * Página de redirección para administradores
 * Redirige automáticamente a /dashboard/admin
 */
export default function AdminRedirectPage() {
  redirect('/dashboard/admin');
}