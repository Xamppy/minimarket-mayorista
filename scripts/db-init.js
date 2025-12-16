const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Cargar variables de entorno si estamos en local (en producción ya estarán cargadas)
// Nota: en producción Docker, dotenv podría no necesitarse si las vars están en el sistema
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // Ignorar error si dotenv no está instalado o archivo no existe (producción)
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('🔌 Conectando a la base de datos...');
    
    // Lista de archivos SQL a ejecutar en orden
    const sqlFiles = [
      'database/init_completo.sql'
    ];

    for (const file of sqlFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        console.log(`📄 Ejecutando ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        await client.query(sql);
        console.log(`✅ ${file} ejecutado correctamente.`);
      } else {
        console.warn(`⚠️ Archivo ${file} no encontrado, saltando...`);
      }
    }

    console.log('🚀 Inicialización de base de datos completada.');
  } catch (err) {
    console.error('❌ Error durante la inicialización:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
