// Archivo de prueba para debuggear el endpoint de sales
const { NextRequest, NextResponse } = require('next/server');
const { Client } = require('pg');

// Simulación de la función withVendedorAuth para testing
const withVendedorAuth = async (request, handler) => {
  const mockUser = {
    id: '288c3a64-4c73-42ee-945d-209a24758033',
    email: 'admin@minimarket.cl',
    role: 'administrator'
  };
  return handler(request, mockUser);
};

const dbConfig = {
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: process.env.POSTGRES_SSL === 'true',
};

// Función de prueba simplificada
export async function POST(request) {
  console.log('=== INICIANDO TEST POST /api/sales ===');
  
  return withVendedorAuth(request, async (req, user) => {
    console.log('=== DENTRO DE withVendedorAuth ===');
    console.log('Usuario:', user);
    
    try {
      console.log('=== INICIANDO TRY BLOCK ===');
      
      const formData = await req.formData();
      console.log('FormData obtenido exitosamente');
      
      // Log detallado de los datos recibidos
      console.log('=== DATOS RECIBIDOS ===');
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value} (type: ${typeof value})`);
      }
      
      const productIdString = formData.get('productId');
      const quantity = parseInt(formData.get('quantity'));
      const saleFormat = formData.get('saleFormat');
      const stockEntryIdString = formData.get('stockEntryId');
      const priceString = formData.get('price');
      
      console.log('=== DATOS PROCESADOS ===');
      console.log('productId:', productIdString);
      console.log('quantity:', quantity);
      console.log('saleFormat:', saleFormat);
      console.log('stockEntryId:', stockEntryIdString);
      console.log('price:', priceString);
      
      // Validaciones básicas
      console.log('=== INICIANDO VALIDACIONES ===');
      const validationErrors = [];
      
      if (!productIdString) {
        validationErrors.push('ID del producto es requerido');
      }
      
      if (!quantity || isNaN(quantity)) {
        validationErrors.push('Cantidad inválida');
      }
      
      if (!saleFormat) {
        validationErrors.push('Formato de venta es requerido');
      }
      
      console.log('Errores de validación:', validationErrors);
      
      if (validationErrors.length > 0) {
        console.log('=== RETORNANDO ERROR DE VALIDACIÓN ===');
        return NextResponse.json({ 
          error: {
            message: 'Datos de entrada inválidos',
            details: validationErrors,
            status: 400
          }
        }, { status: 400 });
      }
      
      console.log('=== VALIDACIONES PASARON ===');
      
      // Simular éxito
      console.log('=== RETORNANDO ÉXITO ===');
      return NextResponse.json({
        success: true,
        message: 'Test exitoso',
        data: {
          productId: productIdString,
          quantity,
          saleFormat,
          stockEntryId: stockEntryIdString,
          price: priceString
        }
      });
      
    } catch (error) {
      console.error('=== ERROR EN TRY BLOCK ===');
      console.error('Tipo:', error.constructor.name);
      console.error('Mensaje:', error.message);
      console.error('Stack:', error.stack);
      
      return NextResponse.json({
        success: false,
        error: {
          message: 'Error interno del servidor',
          details: error.message,
          status: 500
        }
      }, { status: 500 });
    }
  });
}

console.log('=== ARCHIVO TEST CARGADO ===');