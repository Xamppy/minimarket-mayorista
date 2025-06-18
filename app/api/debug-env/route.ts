import { NextResponse } from 'next/server';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Imprimir en la consola del servidor (terminal donde corre npm run dev)
  console.log('[API DEBUG] Valor de NEXT_PUBLIC_SUPABASE_URL en el servidor:', supabaseUrl);
  console.log('[API DEBUG] Valor de NEXT_PUBLIC_SUPABASE_ANON_KEY en el servidor:', supabaseKey);
  console.log('[API DEBUG] Todas las variables NEXT_PUBLIC:', 
    Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>)
  );

  return NextResponse.json({
    message: 'Resultado del diagnóstico de variables de entorno en el servidor.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl || 'INDEFINIDO (undefined)',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'INDEFINIDO (undefined)',
    },
    allNextPublicVars: Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key] || 'INDEFINIDO';
        return acc;
      }, {} as Record<string, string>)
  });
} 