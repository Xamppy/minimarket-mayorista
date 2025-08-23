// Usar fetch nativo de Node.js (disponible desde v18)

// Función para probar la API de ventas
async function testSalesAPI() {
  try {
    console.log('=== INICIANDO PRUEBA DE API DE VENTAS ===');
    
    // Primero, intentar hacer login para obtener las cookies de autenticación
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'vendedor@minimarket.com',
        password: 'password123'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    const loginResult = await loginResponse.json();
    console.log('Login result:', loginResult);
    
    if (!loginResponse.ok) {
      console.error('Error en login:', loginResult);
      return;
    }
    
    // Extraer cookies de autenticación
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies recibidas:', cookies);
    
    // Ahora intentar hacer una venta con datos válidos de la BD
    const formData = new FormData();
    formData.append('productId', 'f6f8a0c9-adec-4aa6-b753-ea0c81b2967c');
    formData.append('quantity', '1');
    formData.append('saleFormat', 'unitario');
    formData.append('stockEntryId', '03799dc9-de30-42e3-aef0-260b19219813');
    formData.append('price', '1500');
    
    console.log('\n=== ENVIANDO PETICIÓN DE VENTA ===');
    const salesResponse = await fetch('http://localhost:3000/api/sales', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': cookies || ''
      }
    });
    
    console.log('Sales response status:', salesResponse.status);
    console.log('Sales response headers:', Object.fromEntries(salesResponse.headers.entries()));
    
    const salesResult = await salesResponse.text();
    console.log('Sales response body (raw):', salesResult);
    
    try {
      const salesJson = JSON.parse(salesResult);
      console.log('Sales response body (parsed):', JSON.stringify(salesJson, null, 2));
    } catch (parseError) {
      console.error('Error parsing sales response:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error en prueba:', error);
  }
}

// Ejecutar la prueba
testSalesAPI();