// Cargar las variables desde el archivo .env.local
require('dotenv').config({ path: './.env.local' });

console.log('--- Iniciando Prueba de Node.js Puro ---');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('URL Leída:', supabaseUrl);
console.log('Key Leída:', supabaseKey ? 'Sí, se encontró una key' : 'No, la key es undefined');

if (!supabaseUrl || !supabaseKey) {
  console.log('\nError: El script de Node.js puro NO PUDO leer las variables del archivo .env.local.');
} else {
  console.log('\nÉxito: El script de Node.js puro leyó las variables correctamente.');
}

console.log('--- Fin de la Prueba ---');