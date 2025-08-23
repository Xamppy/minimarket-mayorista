// Prueba simple de la API de ventas
async function testSalesAPISimple() {
  try {
    console.log('=== PRUEBA DIRECTA DE API DE VENTAS ===');
    
    // Hacer una petición directa a la API de ventas
    const formData = new FormData();
    formData.append('productId', 'f6f8a0c9-adec-4aa6-b753-ea0c81b2967c');
    formData.append('quantity', '1');
    formData.append('saleFormat', 'unitario');
    formData.append('stockEntryId', '03799dc9-de30-42e3-aef0-260b19219813');
    formData.append('price', '1500');
    
    console.log('Enviando petición POST a /api/sales...');
    const response = await fetch('http://localhost:3000/api/sales', {
      method: 'POST',
      body: formData
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response Body (raw):', responseText);
    
    try {
      const responseJson = JSON.parse(responseText);
      console.log('Response Body (parsed):', JSON.stringify(responseJson, null, 2));
    } catch (parseError) {
      console.error('Error parsing response:', parseError.message);
    }
    
  } catch (error) {
    console.error('Error en prueba:', error);
  }
}

// Ejecutar la prueba
testSalesAPISimple();