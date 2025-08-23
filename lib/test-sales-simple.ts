/**
 * Prueba Simple del Sistema de Gestión de Ventas
 * 
 * Este archivo ejecuta pruebas básicas con salida visible para verificar
 * que el sistema de gestión de ventas funciona correctamente.
 */

import { 
  processCartSale, 
  validateCartItemsUtility,
  createCustomSalesConfig,
  processCartSaleWithValidation 
} from './reusable-sales-manager';
import type { CartItem } from './reusable-sales-manager';

// Función para mostrar resultados de prueba
function mostrarResultado(nombre: string, resultado: any, exito: boolean = true) {
  console.log(`\n=== ${nombre} ===`);
  console.log(`Estado: ${exito ? '✅ ÉXITO' : '❌ ERROR'}`);
  console.log('Resultado:', JSON.stringify(resultado, null, 2));
  console.log('=' .repeat(50));
}

// Función principal de pruebas
async function ejecutarPruebasSimples() {
  console.log('🚀 Iniciando Pruebas del Sistema de Gestión de Ventas\n');

  try {
    // Prueba 1: Validación de carrito vacío
    console.log('📋 Prueba 1: Validación de carrito vacío');
    const carritoVacio: CartItem[] = [];
    const validacionVacia = await validateCartItemsUtility(carritoVacio);
    mostrarResultado('Validación Carrito Vacío', validacionVacia, !validacionVacia.isValid);

    // Prueba 2: Validación de carrito válido
    console.log('📋 Prueba 2: Validación de carrito válido');
    const carritoValido: CartItem[] = [
      {
        productId: '1',
        quantity: 2,
        saleFormat: 'unitario'
      },
      {
        productId: '2', 
        quantity: 1,
        saleFormat: 'display'
      }
    ];
    const validacionValida = await validateCartItemsUtility(carritoValido);
    mostrarResultado('Validación Carrito Válido', validacionValida, validacionValida.isValid);

    // Prueba 3: Validación de carrito inválido
    console.log('📋 Prueba 3: Validación de carrito inválido');
    const carritoInvalido: CartItem[] = [
      {
        productId: '',
        quantity: -1,
        saleFormat: 'unitario'
      }
    ];
    const validacionInvalida = await validateCartItemsUtility(carritoInvalido);
    mostrarResultado('Validación Carrito Inválido', validacionInvalida, !validacionInvalida.isValid);

    // Prueba 4: Configuración personalizada
    console.log('📋 Prueba 4: Configuración personalizada');
    const configPersonalizada = createCustomSalesConfig({
      autoGenerateTicket: true,
      ticketBaseUrl: 'https://test.com/ticket',
      dbConfig: {
        host: 'localhost',
        port: 5432,
        database: 'minimarket_test',
        user: 'test_user',
        password: 'test_pass'
      }
    });
    mostrarResultado('Configuración Personalizada', configPersonalizada);

    // Prueba 5: Procesamiento de venta (simulado)
    console.log('📋 Prueba 5: Procesamiento de venta simulado');
    try {
      const resultadoVenta = await processCartSale(
        carritoValido,
        'test-user-123',
        'test@example.com'
      );
      mostrarResultado('Procesamiento de Venta', resultadoVenta, resultadoVenta.success);
    } catch (error) {
      mostrarResultado('Procesamiento de Venta (Error Esperado)', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        nota: 'Este error es esperado si no hay conexión a la base de datos'
      }, false);
    }

    // Prueba 6: Venta con validación automática (simulado)
    console.log('📋 Prueba 6: Venta con validación automática');
    try {
      const resultadoValidacion = await processCartSaleWithValidation(
        carritoValido,
        'test-user-456',
        'test2@example.com'
      );
      mostrarResultado('Venta con Validación', resultadoValidacion, resultadoValidacion.success);
    } catch (error) {
      mostrarResultado('Venta con Validación (Error Esperado)', {
        error: error instanceof Error ? error.message : 'Error desconocido',
        nota: 'Este error es esperado si no hay conexión a la base de datos'
      }, false);
    }

  } catch (error) {
    console.error('❌ Error general en las pruebas:', error);
  }

  console.log('\n🏁 Pruebas completadas');
}

// Ejecutar las pruebas
ejecutarPruebasSimples().catch(console.error);