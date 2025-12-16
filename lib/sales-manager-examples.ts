/**
 * Ejemplos prácticos de uso del Gestor de Ventas Reutilizable
 * 
 * Este archivo contiene ejemplos completos y funcionales para diferentes
 * escenarios de uso del ReusableSalesManager.
 */

import {
  ReusableSalesManager,
  processCartSale,
  processCartSaleWithValidation,
  generateSaleTicket,
  validateSaleTicket,
  getDefaultSalesConfig,
  createCustomSalesConfig,
  validateCartItemsUtility,
  formatSaleResultForAPI,
  createUserContextFromRequest,
  type CartItem,
  type UserContext,
  type SaleResult
} from './reusable-sales-manager';

// ============================================================================
// EJEMPLO 1: Venta Simple de Carrito
// ============================================================================

export async function ejemploVentaSimple() {
  console.log('🛒 Ejemplo 1: Venta Simple de Carrito');
  
  // Datos del carrito de ejemplo
  const cartItems: CartItem[] = [
    {
      productId: "prod_001",
      quantity: 2,
      saleFormat: "unitario",
      specificPrice: 15.50
    },
    {
      productId: "prod_002",
      quantity: 1,
      saleFormat: "display"
    },
    {
      productId: "prod_003",
      quantity: 5,
      saleFormat: "unitario" // Venta al por mayor (>= 3 unidades)
    }
  ];

  // Contexto del usuario vendedor
  const userContext: UserContext = createUserContextFromRequest(
    "user_123", 
    "vendedor@minimarket.com",
    "cashier"
  );

  try {
    // Procesar la venta
    const result = await processCartSale(cartItems, userContext);

    if (result.success) {
      console.log('✅ Venta procesada exitosamente!');
      console.log(`   ID de Venta: ${result.saleId}`);
      console.log(`   Total: $${result.totalAmount}`);
      console.log(`   Ticket: ${result.ticketUrl}`);
      console.log(`   Items procesados: ${result.itemsProcessed?.length}`);
      console.log(`   Actualizaciones de stock: ${result.stockUpdates?.length}`);
      
      if (result.ticketData) {
        console.log(`   Ticket generado con ${result.ticketData.sale_items.length} items`);
      }
    } else {
      console.error('❌ Error procesando venta:', result.error?.message);
      if (result.error?.details) {
        console.error('   Detalles:', result.error.details);
      }
    }
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// ============================================================================
// EJEMPLO 2: Venta con Validación Automática
// ============================================================================

export async function ejemploVentaConValidacion() {
  console.log('🔍 Ejemplo 2: Venta con Validación Automática');
  
  const cartItems: CartItem[] = [
    {
      productId: "prod_004",
      quantity: 3,
      saleFormat: "pallet",
      specificPrice: 45.00
    }
  ];

  const userContext = createUserContextFromRequest(
    "user_456", 
    "supervisor@minimarket.com",
    "supervisor"
  );

  try {
    // Procesar venta con validación automática del ticket
    const result = await processCartSaleWithValidation(cartItems, userContext);

    if (result.success) {
      console.log('✅ Venta procesada exitosamente!');
      console.log(`   ID: ${result.saleId}, Total: $${result.totalAmount}`);
      
      // Verificar validación del ticket
      if (result.ticketValidation) {
        if (result.ticketValidation.isValid) {
          console.log('✅ Ticket validado correctamente');
        } else {
          console.warn('⚠️ Errores en la validación del ticket:');
          result.ticketValidation.errors.forEach(error => {
            console.warn(`   - ${error}`);
          });
        }
      }
    } else {
      console.error('❌ Error:', result.error?.message);
    }
  } catch (error) {
    console.error('💥 Error inesperado:', error);
  }
}

// ============================================================================
// EJEMPLO 3: Configuración Personalizada
// ============================================================================

export async function ejemploConfiguracionPersonalizada() {
  console.log('⚙️ Ejemplo 3: Configuración Personalizada');
  
  // Crear configuración personalizada
  const customConfig = createCustomSalesConfig({
    enableAutoTicketGeneration: true,
    ticketBaseUrl: "https://mitienda.com/tickets",
    enableLogging: true,
    maxRetries: 5,
    retryDelay: 2000,
    database: {
      host: process.env.CUSTOM_DB_HOST || 'localhost',
      port: parseInt(process.env.CUSTOM_DB_PORT || '5432'),
      database: 'mi_tienda_personalizada',
      user: process.env.CUSTOM_DB_USER || 'postgres',
      password: process.env.CUSTOM_DB_PASSWORD || ''
    }
  });

  const cartItems: CartItem[] = [
    {
      productId: "prod_005",
      quantity: 1,
      saleFormat: "unitario"
    }
  ];

  const userContext = createUserContextFromRequest(
    "user_789", 
    "admin@mitienda.com",
    "admin"
  );

  try {
    const result = await processCartSale(cartItems, userContext, customConfig);
    
    if (result.success) {
      console.log('✅ Venta con configuración personalizada exitosa!');
      console.log(`   Ticket URL personalizada: ${result.ticketUrl}`);
    } else {
      console.error('❌ Error:', result.error?.message);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// ============================================================================
// EJEMPLO 4: Uso Directo de la Clase
// ============================================================================

export async function ejemploUsoDirectoClase() {
  console.log('🏗️ Ejemplo 4: Uso Directo de la Clase');
  
  // Crear instancia del gestor
  const salesManager = new ReusableSalesManager(getDefaultSalesConfig());
  
  const cartItems: CartItem[] = [
    {
      productId: "prod_006",
      quantity: 2,
      saleFormat: "display",
      specificPrice: 25.75
    }
  ];

  const userContext = createUserContextFromRequest(
    "user_direct", 
    "directo@minimarket.com"
  );

  try {
    // Procesar venta
    console.log('📦 Procesando venta...');
    const saleResult = await salesManager.processSale(cartItems, userContext);
    
    if (saleResult.success && saleResult.saleId) {
      console.log(`✅ Venta procesada: ${saleResult.saleId}`);
      
      // Generar ticket por separado
      console.log('🎫 Generando ticket...');
      const ticketResult = await salesManager.generateTicket(saleResult.saleId);
      
      if (ticketResult.success) {
        console.log(`✅ Ticket generado: ${ticketResult.ticketUrl}`);
        
        // Validar ticket generado
        console.log('🔍 Validando ticket...');
        const validation = await salesManager.validateGeneratedTicket(
          saleResult.saleId, 
          ticketResult.ticketData!
        );
        
        if (validation.isValid) {
          console.log('✅ Ticket válido');
        } else {
          console.warn('⚠️ Errores en ticket:', validation.errors);
        }
      } else {
        console.error('❌ Error generando ticket:', ticketResult.error);
      }
    } else {
      console.error('❌ Error procesando venta:', saleResult.error?.message);
    }
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// ============================================================================
// EJEMPLO 5: Validación Previa del Carrito
// ============================================================================

export async function ejemploValidacionPrevia() {
  console.log('✅ Ejemplo 5: Validación Previa del Carrito');
  
  // Carrito con algunos errores intencionados
  const cartItemsConErrores: CartItem[] = [
    {
      productId: "", // Error: ID vacío
      quantity: 2,
      saleFormat: "unitario"
    },
    {
      productId: "prod_007",
      quantity: 0, // Error: cantidad cero
      saleFormat: "display"
    },
    {
      productId: "prod_008",
      quantity: 1,
      saleFormat: "" as any, // Error: formato vacío
      specificPrice: -5 // Error: precio negativo
    }
  ];

  // Validar items antes de procesar
  const validation = validateCartItemsUtility(cartItemsConErrores);
  
  if (!validation.isValid) {
    console.log('❌ Errores encontrados en el carrito:');
    validation.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    console.log('🔧 Corrigiendo errores...');
    
    // Carrito corregido
    const cartItemsCorregido: CartItem[] = [
      {
        productId: "prod_007",
        quantity: 2,
        saleFormat: "unitario"
      },
      {
        productId: "prod_008",
        quantity: 1,
        saleFormat: "display",
        specificPrice: 15.50
      }
    ];
    
    const validationCorregida = validateCartItemsUtility(cartItemsCorregido);
    
    if (validationCorregida.isValid) {
      console.log('✅ Carrito corregido, procediendo con la venta...');
      
      const userContext = createUserContextFromRequest(
        "user_validation", 
        "validacion@minimarket.com"
      );
      
      const result = await processCartSale(cartItemsCorregido, userContext);
      
      if (result.success) {
        console.log(`✅ Venta exitosa: ${result.saleId}`);
      }
    }
  } else {
    console.log('✅ Carrito válido');
  }
}

// ============================================================================
// EJEMPLO 6: Manejo de Errores Avanzado
// ============================================================================

export async function ejemploManejoErrores() {
  console.log('🚨 Ejemplo 6: Manejo de Errores Avanzado');
  
  const cartItems: CartItem[] = [
    {
      productId: "prod_inexistente", // Este producto no existe
      quantity: 1,
      saleFormat: "unitario"
    }
  ];

  const userContext = createUserContextFromRequest(
    "user_error", 
    "error@minimarket.com"
  );

  try {
    const result = await processCartSale(cartItems, userContext);
    
    if (!result.success && result.error) {
      // Manejo específico por tipo de error
      switch (result.error.status) {
        case 400:
          console.log('🔍 Error de validación:');
          console.log(`   Mensaje: ${result.error.message}`);
          if (result.error.details) {
            console.log(`   Detalles: ${result.error.details}`);
          }
          break;
          
        case 404:
          console.log('🔍 Recurso no encontrado:');
          console.log(`   ${result.error.message}`);
          console.log('   Sugerencia: Verificar que el producto existe');
          break;
          
        case 409:
          console.log('🔍 Conflicto (posiblemente stock insuficiente):');
          console.log(`   ${result.error.message}`);
          console.log('   Sugerencia: Reducir cantidad o verificar stock');
          break;
          
        case 500:
          console.log('🔍 Error interno del servidor:');
          console.log(`   ${result.error.message}`);
          console.log('   Sugerencia: Contactar soporte técnico');
          break;
          
        default:
          console.log('🔍 Error desconocido:');
          console.log(`   Código: ${result.error.status}`);
          console.log(`   Mensaje: ${result.error.message}`);
      }
    }
  } catch (error) {
    console.error('💥 Error no controlado:', error);
  }
}

// ============================================================================
// EJEMPLO 7: Formateo para API
// ============================================================================

export async function ejemploFormateoAPI() {
  console.log('🌐 Ejemplo 7: Formateo para API');
  
  const cartItems: CartItem[] = [
    {
      productId: "prod_api",
      quantity: 1,
      saleFormat: "unitario"
    }
  ];

  const userContext = createUserContextFromRequest(
    "user_api", 
    "api@minimarket.com"
  );

  try {
    const result = await processCartSale(cartItems, userContext);
    
    // Formatear resultado para respuesta de API
    const apiResponse = formatSaleResultForAPI(result);
    
    console.log('📤 Respuesta formateada para API:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Simular respuesta HTTP
    const httpStatus = result.success ? 200 : (result.error?.status || 500);
    console.log(`📡 Status HTTP: ${httpStatus}`);
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

// ============================================================================
// FUNCIÓN PRINCIPAL PARA EJECUTAR TODOS LOS EJEMPLOS
// ============================================================================

export async function ejecutarTodosLosEjemplos() {
  console.log('🚀 Ejecutando todos los ejemplos del Gestor de Ventas\n');
  
  const ejemplos = [
    ejemploVentaSimple,
    ejemploVentaConValidacion,
    ejemploConfiguracionPersonalizada,
    ejemploUsoDirectoClase,
    ejemploValidacionPrevia,
    ejemploManejoErrores,
    ejemploFormateoAPI
  ];
  
  for (let i = 0; i < ejemplos.length; i++) {
    try {
      await ejemplos[i]();
      console.log('\n' + '='.repeat(80) + '\n');
    } catch (error) {
      console.error(`💥 Error en ejemplo ${i + 1}:`, error);
      console.log('\n' + '='.repeat(80) + '\n');
    }
  }
  
  console.log('✅ Todos los ejemplos completados');
}

// ============================================================================
// UTILIDADES ADICIONALES PARA TESTING
// ============================================================================

/**
 * Función de utilidad para crear datos de prueba
 */
export function crearDatosDePrueba() {
  return {
    cartItemsBasico: [
      {
        productId: "test_001",
        quantity: 1,
        saleFormat: "unitario" as const
      }
    ] as CartItem[],
    
    cartItemsComplejo: [
      {
        productId: "test_002",
        quantity: 3,
        saleFormat: "unitario" as const,
        specificPrice: 12.50
      },
      {
        productId: "test_003",
        quantity: 1,
        saleFormat: "display" as const
      },
      {
        productId: "test_004",
        quantity: 2,
        saleFormat: "pallet" as const,
        specificPrice: 45.00
      }
    ] as CartItem[],
    
    userContextTest: createUserContextFromRequest(
      "test_user",
      "test@minimarket.com",
      "tester"
    )
  };
}

/**
 * Función para medir performance de las operaciones
 */
export async function medirPerformance() {
  console.log('⏱️ Midiendo performance del gestor de ventas');
  
  const { cartItemsBasico, userContextTest } = crearDatosDePrueba();
  
  const inicio = Date.now();
  
  try {
    const result = await processCartSale(cartItemsBasico, userContextTest);
    
    const tiempoTotal = Date.now() - inicio;
    
    console.log(`⏱️ Tiempo total: ${tiempoTotal}ms`);
    console.log(`✅ Resultado: ${result.success ? 'Exitoso' : 'Error'}`);
    
    if (result.success) {
      console.log(`📊 Items procesados: ${result.itemsProcessed?.length || 0}`);
      console.log(`📊 Actualizaciones de stock: ${result.stockUpdates?.length || 0}`);
    }
    
  } catch (error) {
    console.error('💥 Error en medición:', error);
  }
}

// Exportar todo para uso externo
export default {
  ejemploVentaSimple,
  ejemploVentaConValidacion,
  ejemploConfiguracionPersonalizada,
  ejemploUsoDirectoClase,
  ejemploValidacionPrevia,
  ejemploManejoErrores,
  ejemploFormateoAPI,
  ejecutarTodosLosEjemplos,
  crearDatosDePrueba,
  medirPerformance
};