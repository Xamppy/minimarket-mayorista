// Script para debuggear los datos de ventas directamente
const { Client } = require('pg');

// Configuración de base de datos con valores por defecto
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'minimarket',
  user: 'postgres',
  password: '', // Intentaremos sin contraseña primero
  ssl: false,
};

async function debugSalesData() {
  // Probar diferentes configuraciones de base de datos
  const configs = [
    { host: 'localhost', port: 5432, database: 'minimarket', user: 'postgres', password: '', ssl: false },
    { host: 'localhost', port: 5432, database: 'minimarket', user: 'postgres', password: 'postgres', ssl: false },
    { host: 'localhost', port: 5432, database: 'minimarket', user: 'postgres', password: 'minimarket123', ssl: false },
    { host: 'localhost', port: 5432, database: 'minimarket_db', user: 'minimarket_user', password: 'minimarket123', ssl: false },
    { host: 'localhost', port: 5432, database: 'minimarket', user: 'minimarket_user', password: 'minimarket123', ssl: false },
  ];
  
  let client = null;
  let workingConfig = null;
  
  // Probar cada configuración
  for (const config of configs) {
    try {
      console.log(`Probando: ${config.user}@${config.host}:${config.port}/${config.database}`);
      client = new Client(config);
      await client.connect();
      console.log('¡Conexión exitosa!');
      workingConfig = config;
      break;
    } catch (error) {
      console.log('Falló:', error.message);
      try {
        await client?.end();
      } catch (e) {}
      client = null;
    }
  }
  
  if (!client || !workingConfig) {
    console.log('No se pudo conectar con ninguna configuración');
    return;
  }
  
  try {
    
    // Calcular fechas de las últimas 12 horas
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - (12 * 60 * 60 * 1000));
    
    console.log('\n=== PERÍODO DE CONSULTA ===');
    console.log('Desde:', twelveHoursAgo.toISOString());
    console.log('Hasta:', now.toISOString());
    
    // Consulta todas las ventas de las últimas 12 horas
    const result = await client.query(
      `SELECT id, total_amount, sale_date, user_id 
       FROM sales 
       WHERE sale_date >= $1 
         AND sale_date <= $2 
       ORDER BY sale_date DESC`,
      [twelveHoursAgo.toISOString(), now.toISOString()]
    );
    
    console.log('\n=== RESULTADOS DE LA CONSULTA ===');
    console.log('Número de ventas encontradas:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\n=== DETALLE DE VENTAS ===');
      result.rows.forEach((sale, index) => {
        console.log(`Venta ${index + 1}:`);
        console.log(`  ID: ${sale.id}`);
        console.log(`  Total: ${sale.total_amount} (tipo: ${typeof sale.total_amount})`);
        console.log(`  Fecha: ${sale.sale_date}`);
        console.log(`  Usuario: ${sale.user_id}`);
        console.log('---');
      });
      
      // Calcular total
      const total = result.rows.reduce((sum, sale) => {
        const amount = parseFloat(sale.total_amount);
        console.log(`Sumando: ${sum} + ${amount}`);
        return sum + amount;
      }, 0);
      
      console.log('\n=== CÁLCULO FINAL ===');
      console.log('Total calculado:', total);
    } else {
      console.log('No se encontraron ventas en las últimas 12 horas');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    
    // Intentar con diferentes credenciales
    if (error.message.includes('authentication failed')) {
      console.log('\nIntentando con diferentes credenciales...');
      
      const alternativeConfigs = [
        { ...dbConfig, password: 'postgres' },
        { ...dbConfig, password: 'minimarket123' },
        { ...dbConfig, user: 'minimarket_user', password: 'minimarket123' },
      ];
      
      for (const config of alternativeConfigs) {
        try {
          console.log(`Probando: ${config.user}@${config.host}:${config.port}/${config.database}`);
          const testClient = new Client(config);
          await testClient.connect();
          console.log('¡Conexión exitosa con estas credenciales!');
          console.log('Configuración correcta:', config);
          await testClient.end();
          break;
        } catch (testError) {
          console.log('Falló:', testError.message);
        }
      }
    }
  } finally {
    try {
      await client.end();
    } catch (e) {
      // Ignorar errores al cerrar
    }
  }
}

debugSalesData();