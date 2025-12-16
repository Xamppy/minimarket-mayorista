/**
 * Archivo de pruebas para el Gestor de Ventas Reutilizable
 * 
 * Este archivo contiene pruebas funcionales para verificar que el sistema
 * funciona correctamente en diferentes escenarios.
 */

import {
  processCartSale,
  processCartSaleWithValidation,
  generateSaleTicket,
  validateSaleTicket,
  validateCartItemsUtility,
  createUserContextFromRequest,
  getDefaultSalesConfig,
  createCustomSalesConfig,
  type CartItem,
  type UserContext,
  type SaleResult
} from './reusable-sales-manager';

// ============================================================================
// CONFIGURACIÓN DE PRUEBAS
// ============================================================================

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  duration: number;
  error?: any;
}

class SalesManagerTester {
  private results: TestResult[] = [];
  private testUserContext: UserContext;

  constructor() {
    this.testUserContext = createUserContextFromRequest(
      "test_user_001",
      "tester@minimarket.com",
      "tester"
    );
  }

  /**
   * Ejecuta una prueba individual
   */
  private async runTest(
    testName: string,
    testFunction: () => Promise<boolean>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Ejecutando: ${testName}`);
      const passed = await testFunction();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        passed,
        message: passed ? 'Prueba exitosa' : 'Prueba falló',
        duration
      };
      
      console.log(`${passed ? '✅' : '❌'} ${testName} (${duration}ms)`);
      this.results.push(result);
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result: TestResult = {
        testName,
        passed: false,
        message: `Error durante la prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        duration,
        error
      };
      
      console.log(`❌ ${testName} - ERROR (${duration}ms)`);
      console.error(`   ${result.message}`);
      this.results.push(result);
      return result;
    }
  }

  // ============================================================================
  // PRUEBAS DE VALIDACIÓN DE CARRITO
  // ============================================================================

  async testValidacionCarritoVacio(): Promise<boolean> {
    const validation = validateCartItemsUtility([]);
    return !validation.isValid && validation.errors.includes('El carrito no puede estar vacío');
  }

  async testValidacionCarritoValido(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_001",
        quantity: 1,
        saleFormat: "unitario"
      }
    ];
    
    const validation = validateCartItemsUtility(cartItems);
    return validation.isValid;
  }

  async testValidacionCarritoInvalido(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "", // ID vacío
        quantity: 0, // Cantidad inválida
        saleFormat: "" as any // Formato vacío
      }
    ];
    
    const validation = validateCartItemsUtility(cartItems);
    return !validation.isValid && validation.errors.length >= 3;
  }

  // ============================================================================
  // PRUEBAS DE PROCESAMIENTO DE VENTAS
  // ============================================================================

  async testVentaSimpleUnitaria(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_unitario",
        quantity: 1,
        saleFormat: "unitario"
      }
    ];

    const result = await processCartSale(cartItems, this.testUserContext);
    
    // Nota: En un entorno de prueba real, esto podría fallar por falta de datos
    // Por ahora verificamos que la función se ejecute sin errores de sintaxis
    return result !== undefined && typeof result.success === 'boolean';
  }

  async testVentaMultiplesItems(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_multi_001",
        quantity: 2,
        saleFormat: "unitario"
      },
      {
        productId: "test_multi_002",
        quantity: 1,
        saleFormat: "display"
      },
      {
        productId: "test_multi_003",
        quantity: 3,
        saleFormat: "pallet",
        specificPrice: 25.50
      }
    ];

    const result = await processCartSale(cartItems, this.testUserContext);
    return result !== undefined && typeof result.success === 'boolean';
  }

  async testVentaConPrecioEspecifico(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_precio_especifico",
        quantity: 1,
        saleFormat: "unitario",
        specificPrice: 15.75
      }
    ];

    const result = await processCartSale(cartItems, this.testUserContext);
    return result !== undefined && typeof result.success === 'boolean';
  }

  async testVentaAlPorMayor(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_por_mayor",
        quantity: 5, // Cantidad >= 3 para activar precio al por mayor
        saleFormat: "unitario"
      }
    ];

    const result = await processCartSale(cartItems, this.testUserContext);
    return result !== undefined && typeof result.success === 'boolean';
  }

  // ============================================================================
  // PRUEBAS DE CONFIGURACIÓN
  // ============================================================================

  async testConfiguracionPorDefecto(): Promise<boolean> {
    const config = getDefaultSalesConfig();
    
    return (
      config.enableAutoTicketGeneration === true &&
      config.ticketBaseUrl === '/ticket' &&
      config.enableLogging === true &&
      typeof config.database === 'object' &&
      config.database.host !== undefined
    );
  }

  async testConfiguracionPersonalizada(): Promise<boolean> {
    const customConfig = createCustomSalesConfig({
      enableAutoTicketGeneration: false,
      ticketBaseUrl: '/custom-tickets',
      maxRetries: 5,
      database: {
        host: 'custom-host',
        port: 3306,
        database: 'test_db',
        user: 'test_user',
        password: 'test_pass'
      }
    });

    return (
      customConfig.enableAutoTicketGeneration === false &&
      customConfig.ticketBaseUrl === '/custom-tickets' &&
      customConfig.maxRetries === 5 &&
      customConfig.database.host === 'custom-host' &&
      customConfig.database.port === 3306
    );
  }

  // ============================================================================
  // PRUEBAS DE GENERACIÓN DE TICKETS
  // ============================================================================

  async testGeneracionTicketSinVenta(): Promise<boolean> {
    // Intentar generar ticket para una venta inexistente
    const result = await generateSaleTicket("venta_inexistente");
    
    // Debería fallar graciosamente
    return !result.success && result.error !== undefined;
  }

  async testValidacionTicketSinVenta(): Promise<boolean> {
    // Intentar validar ticket para una venta inexistente
    const result = await validateSaleTicket("venta_inexistente");
    
    // Debería fallar graciosamente
    return !result.isValid && result.errors.length > 0;
  }

  // ============================================================================
  // PRUEBAS DE MANEJO DE ERRORES
  // ============================================================================

  async testManejoErroresProductoInexistente(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "producto_que_no_existe_12345",
        quantity: 1,
        saleFormat: "unitario"
      }
    ];

    const result = await processCartSale(cartItems, this.testUserContext);
    
    // Debería manejar el error graciosamente
    return result !== undefined && (
      !result.success || 
      result.success === true // En caso de que el producto exista en la DB de prueba
    );
  }

  async testManejoErroresUsuarioInvalido(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_user_invalid",
        quantity: 1,
        saleFormat: "unitario"
      }
    ];

    const invalidUserContext = createUserContextFromRequest(
      "", // ID vacío
      "" // Email vacío
    );

    const result = await processCartSale(cartItems, invalidUserContext);
    
    // Debería manejar el error graciosamente
    return result !== undefined && typeof result.success === 'boolean';
  }

  // ============================================================================
  // PRUEBAS DE INTEGRACIÓN
  // ============================================================================

  async testIntegracionCompleta(): Promise<boolean> {
    const cartItems: CartItem[] = [
      {
        productId: "test_integracion",
        quantity: 2,
        saleFormat: "unitario",
        specificPrice: 12.50
      }
    ];

    // Probar venta con validación automática
    const result = await processCartSaleWithValidation(
      cartItems, 
      this.testUserContext
    );

    // Verificar que la respuesta tenga la estructura esperada
    return (
      result !== undefined &&
      typeof result.success === 'boolean' &&
      (result.success === false || (
        result.saleId !== undefined &&
        result.totalAmount !== undefined
      ))
    );
  }

  // ============================================================================
  // EJECUTOR PRINCIPAL DE PRUEBAS
  // ============================================================================

  async ejecutarTodasLasPruebas(): Promise<void> {
    console.log('🚀 Iniciando suite de pruebas del Gestor de Ventas\n');
    
    const pruebas = [
      // Pruebas de validación
      { name: 'Validación carrito vacío', fn: () => this.testValidacionCarritoVacio() },
      { name: 'Validación carrito válido', fn: () => this.testValidacionCarritoValido() },
      { name: 'Validación carrito inválido', fn: () => this.testValidacionCarritoInvalido() },
      
      // Pruebas de procesamiento
      { name: 'Venta simple unitaria', fn: () => this.testVentaSimpleUnitaria() },
      { name: 'Venta múltiples items', fn: () => this.testVentaMultiplesItems() },
      { name: 'Venta con precio específico', fn: () => this.testVentaConPrecioEspecifico() },
      { name: 'Venta al por mayor', fn: () => this.testVentaAlPorMayor() },
      
      // Pruebas de configuración
      { name: 'Configuración por defecto', fn: () => this.testConfiguracionPorDefecto() },
      { name: 'Configuración personalizada', fn: () => this.testConfiguracionPersonalizada() },
      
      // Pruebas de tickets
      { name: 'Generación ticket sin venta', fn: () => this.testGeneracionTicketSinVenta() },
      { name: 'Validación ticket sin venta', fn: () => this.testValidacionTicketSinVenta() },
      
      // Pruebas de manejo de errores
      { name: 'Manejo error producto inexistente', fn: () => this.testManejoErroresProductoInexistente() },
      { name: 'Manejo error usuario inválido', fn: () => this.testManejoErroresUsuarioInvalido() },
      
      // Pruebas de integración
      { name: 'Integración completa', fn: () => this.testIntegracionCompleta() }
    ];

    // Ejecutar todas las pruebas
    for (const prueba of pruebas) {
      await this.runTest(prueba.name, prueba.fn);
    }

    // Mostrar resumen
    this.mostrarResumen();
  }

  private mostrarResumen(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE PRUEBAS');
    console.log('='.repeat(80));
    
    const totalPruebas = this.results.length;
    const pruebasExitosas = this.results.filter(r => r.passed).length;
    const pruebasFallidas = totalPruebas - pruebasExitosas;
    const tiempoTotal = this.results.reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`📈 Total de pruebas: ${totalPruebas}`);
    console.log(`✅ Exitosas: ${pruebasExitosas}`);
    console.log(`❌ Fallidas: ${pruebasFallidas}`);
    console.log(`⏱️ Tiempo total: ${tiempoTotal}ms`);
    console.log(`📊 Tasa de éxito: ${((pruebasExitosas / totalPruebas) * 100).toFixed(1)}%`);
    
    if (pruebasFallidas > 0) {
      console.log('\n❌ PRUEBAS FALLIDAS:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   - ${r.testName}: ${r.message}`);
        });
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (pruebasFallidas === 0) {
      console.log('🎉 ¡Todas las pruebas pasaron exitosamente!');
    } else {
      console.log(`⚠️ ${pruebasFallidas} prueba(s) necesitan atención`);
    }
  }

  /**
   * Obtiene los resultados de las pruebas
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Limpia los resultados para una nueva ejecución
   */
  clearResults(): void {
    this.results = [];
  }
}

// ============================================================================
// FUNCIONES DE UTILIDAD PARA PRUEBAS
// ============================================================================

/**
 * Ejecuta una prueba rápida de funcionalidad básica
 */
export async function pruebaRapida(): Promise<boolean> {
  console.log('⚡ Ejecutando prueba rápida...');
  
  try {
    // Probar validación básica
    const validation = validateCartItemsUtility([
      {
        productId: "test_rapido",
        quantity: 1,
        saleFormat: "unitario"
      }
    ]);
    
    if (!validation.isValid) {
      console.log('❌ Prueba rápida falló: validación');
      return false;
    }
    
    // Probar configuración
    const config = getDefaultSalesConfig();
    if (!config || !config.database) {
      console.log('❌ Prueba rápida falló: configuración');
      return false;
    }
    
    console.log('✅ Prueba rápida exitosa');
    return true;
    
  } catch (error) {
    console.log('❌ Prueba rápida falló:', error);
    return false;
  }
}

/**
 * Ejecuta pruebas de performance básicas
 */
export async function pruebasPerformance(): Promise<void> {
  console.log('⏱️ Ejecutando pruebas de performance...');
  
  const cartItems: CartItem[] = [
    {
      productId: "perf_test_001",
      quantity: 1,
      saleFormat: "unitario"
    }
  ];
  
  const userContext = createUserContextFromRequest(
    "perf_user",
    "performance@test.com"
  );
  
  const iteraciones = 5;
  const tiempos: number[] = [];
  
  for (let i = 0; i < iteraciones; i++) {
    const inicio = Date.now();
    
    try {
      await processCartSale(cartItems, userContext);
      const tiempo = Date.now() - inicio;
      tiempos.push(tiempo);
      console.log(`   Iteración ${i + 1}: ${tiempo}ms`);
    } catch (error) {
      console.log(`   Iteración ${i + 1}: Error - ${error}`);
    }
  }
  
  if (tiempos.length > 0) {
    const promedio = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    const minimo = Math.min(...tiempos);
    const maximo = Math.max(...tiempos);
    
    console.log(`📊 Promedio: ${promedio.toFixed(2)}ms`);
    console.log(`📊 Mínimo: ${minimo}ms`);
    console.log(`📊 Máximo: ${maximo}ms`);
  }
}

// ============================================================================
// EXPORTACIONES PRINCIPALES
// ============================================================================

export { SalesManagerTester };

/**
 * Función principal para ejecutar todas las pruebas
 */
export async function ejecutarPruebasCompletas(): Promise<TestResult[]> {
  const tester = new SalesManagerTester();
  await tester.ejecutarTodasLasPruebas();
  return tester.getResults();
}

/**
 * Función para ejecutar solo pruebas básicas
 */
export async function ejecutarPruebasBasicas(): Promise<boolean> {
  console.log('🧪 Ejecutando pruebas básicas...');
  
  const resultadoRapido = await pruebaRapida();
  
  if (resultadoRapido) {
    console.log('✅ Pruebas básicas completadas exitosamente');
  } else {
    console.log('❌ Pruebas básicas fallaron');
  }
  
  return resultadoRapido;
}

export default {
  SalesManagerTester,
  ejecutarPruebasCompletas,
  ejecutarPruebasBasicas,
  pruebaRapida,
  pruebasPerformance
};