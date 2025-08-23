# Gestor de Ventas Reutilizable - Documentación

## Descripción General

El `ReusableSalesManager` es una clase completa para gestionar ventas en sistemas de carrito de compras, con funcionalidades avanzadas como:

- ✅ Descuento automático de stock con principio FIFO
- ✅ Generación automática de tickets de venta
- ✅ Validación completa de datos de tickets
- ✅ Manejo de transacciones de base de datos
- ✅ Funciones de utilidad para integración fácil

## Instalación y Configuración

### 1. Importar el módulo

```typescript
import { 
  ReusableSalesManager,
  processCartSale,
  generateSaleTicket,
  validateSaleTicket,
  getDefaultSalesConfig,
  createCustomSalesConfig
} from './lib/reusable-sales-manager';
```

### 2. Configuración de Base de Datos

Asegúrate de tener las siguientes variables de entorno configuradas:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=minimarket
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu_password
POSTGRES_SSL=false
```

## Uso Básico

### Ejemplo 1: Procesar Venta Simple

```typescript
import { processCartSale, createUserContextFromRequest } from './lib/reusable-sales-manager';

// Datos del carrito
const cartItems = [
  {
    productId: "123",
    quantity: 2,
    saleFormat: "unitario",
    specificPrice: 15.50 // Opcional
  },
  {
    productId: "456",
    quantity: 1,
    saleFormat: "display"
  }
];

// Contexto del usuario
const userContext = createUserContextFromRequest("user123", "vendedor@tienda.com");

// Procesar la venta
const result = await processCartSale(cartItems, userContext);

if (result.success) {
  console.log(`Venta exitosa! ID: ${result.saleId}`);
  console.log(`Ticket disponible en: ${result.ticketUrl}`);
  console.log(`Total: $${result.totalAmount}`);
} else {
  console.error(`Error: ${result.error?.message}`);
}
```

### Ejemplo 2: Venta con Configuración Personalizada

```typescript
import { processCartSale, createCustomSalesConfig } from './lib/reusable-sales-manager';

// Configuración personalizada
const customConfig = createCustomSalesConfig({
  enableAutoTicketGeneration: true,
  ticketBaseUrl: "https://mitienda.com/tickets",
  enableLogging: true,
  database: {
    host: "mi-servidor-db.com",
    port: 5432,
    database: "mi_tienda"
  }
});

// Procesar venta con configuración personalizada
const result = await processCartSale(cartItems, userContext, customConfig);
```

### Ejemplo 3: Venta con Validación Automática de Ticket

```typescript
import { processCartSaleWithValidation } from './lib/reusable-sales-manager';

// Procesar venta y validar ticket automáticamente
const result = await processCartSaleWithValidation(cartItems, userContext);

if (result.success) {
  console.log(`Venta procesada: ${result.saleId}`);
  
  // Verificar validación del ticket
  if (result.ticketValidation?.isValid) {
    console.log("✅ Ticket validado correctamente");
  } else {
    console.warn("⚠️ Errores en ticket:", result.ticketValidation?.errors);
  }
}
```

## Uso Avanzado

### Ejemplo 4: Usar la Clase Directamente

```typescript
import { ReusableSalesManager, getDefaultSalesConfig } from './lib/reusable-sales-manager';

// Crear instancia del gestor
const salesManager = new ReusableSalesManager(getDefaultSalesConfig());

// Procesar venta
const saleResult = await salesManager.processSale(cartItems, userContext);

// Generar ticket por separado si es necesario
if (saleResult.success && saleResult.saleId) {
  const ticketResult = await salesManager.generateTicket(saleResult.saleId);
  
  if (ticketResult.success) {
    console.log("Ticket generado:", ticketResult.ticketUrl);
  }
}
```

### Ejemplo 5: Validación Manual de Tickets

```typescript
import { validateSaleTicket } from './lib/reusable-sales-manager';

// Validar un ticket existente
const validation = await validateSaleTicket("sale_123");

if (validation.isValid) {
  console.log("✅ Ticket válido");
} else {
  console.log("❌ Errores encontrados:");
  validation.errors.forEach(error => console.log(`- ${error}`));
}
```

## Integración con APIs

### Ejemplo 6: Endpoint de API para Procesar Ventas

```typescript
// app/api/process-sale/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { 
  processCartSale, 
  formatSaleResultForAPI,
  validateCartItemsUtility,
  createUserContextFromRequest 
} from '@/lib/reusable-sales-manager';

export async function POST(request: NextRequest) {
  try {
    const { cartItems, userId, userEmail } = await request.json();
    
    // Validar items del carrito
    const validation = validateCartItemsUtility(cartItems);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: { message: validation.errors.join(', '), status: 400 }
      }, { status: 400 });
    }
    
    // Crear contexto de usuario
    const userContext = createUserContextFromRequest(userId, userEmail);
    
    // Procesar la venta
    const result = await processCartSale(cartItems, userContext);
    
    // Formatear respuesta para API
    const apiResponse = formatSaleResultForAPI(result);
    
    return NextResponse.json(apiResponse, { 
      status: result.success ? 200 : 500 
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: { message: 'Error interno del servidor', status: 500 }
    }, { status: 500 });
  }
}
```

### Ejemplo 7: Endpoint para Generar Tickets

```typescript
// app/api/generate-ticket/[saleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSaleTicket } from '@/lib/reusable-sales-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { saleId: string } }
) {
  try {
    const result = await generateSaleTicket(params.saleId);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        ticketUrl: result.ticketUrl,
        ticketData: result.ticketData
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Error generando ticket'
    }, { status: 500 });
  }
}
```

## Tipos de Datos

### CartItem
```typescript
interface CartItem {
  productId: string;        // ID del producto
  quantity: number;         // Cantidad a vender
  saleFormat: string;       // "unitario", "display", "pallet"
  specificPrice?: number;   // Precio específico (opcional)
}
```

### UserContext
```typescript
interface UserContext {
  id: string;      // ID del usuario
  email: string;   // Email del usuario
  role?: string;   // Rol del usuario (opcional)
}
```

### SaleResult
```typescript
interface SaleResult {
  success: boolean;
  saleId?: string;
  ticketUrl?: string;
  totalAmount?: number;
  error?: {
    message: string;
    details?: string | string[];
    status: number;
  };
  stockUpdates?: StockUpdate[];
  itemsProcessed?: ProcessedItem[];
  ticketData?: TicketData;
}
```

## Manejo de Errores

### Errores Comunes y Soluciones

1. **"Stock insuficiente"**
   - Verificar disponibilidad antes de procesar
   - Implementar validación en el frontend

2. **"Producto no encontrado"**
   - Validar que el productId existe en la base de datos
   - Verificar que el producto esté activo

3. **"Error de conexión a base de datos"**
   - Verificar configuración de variables de entorno
   - Comprobar conectividad de red

4. **"Datos de ticket inválidos"**
   - Revisar que todos los campos requeridos estén presentes
   - Verificar formato de datos

### Ejemplo de Manejo de Errores

```typescript
const result = await processCartSale(cartItems, userContext);

if (!result.success) {
  switch (result.error?.status) {
    case 400:
      console.log("Error de validación:", result.error.message);
      break;
    case 404:
      console.log("Recurso no encontrado:", result.error.message);
      break;
    case 500:
      console.log("Error interno:", result.error.message);
      break;
    default:
      console.log("Error desconocido:", result.error?.message);
  }
}
```

## Configuración Avanzada

### Opciones de Configuración

```typescript
interface SalesManagerConfig {
  database: DatabaseConfig;
  enableAutoTicketGeneration: boolean;  // Generar tickets automáticamente
  ticketBaseUrl: string;                // URL base para tickets
  maxRetries: number;                   // Reintentos en caso de error
  retryDelay: number;                   // Delay entre reintentos (ms)
  enableLogging: boolean;               // Habilitar logs
}
```

### Configuración de Base de Datos

```typescript
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  connectionTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  query_timeout?: number;
  statement_timeout?: number;
}
```

## Mejores Prácticas

1. **Validación Previa**: Siempre validar items del carrito antes de procesar
2. **Manejo de Errores**: Implementar manejo robusto de errores
3. **Logging**: Habilitar logging en producción para debugging
4. **Configuración**: Usar variables de entorno para configuración sensible
5. **Transacciones**: El sistema maneja transacciones automáticamente
6. **Performance**: Usar conexiones de base de datos eficientemente

## Troubleshooting

### Problemas de Performance
- Verificar índices en tablas de base de datos
- Optimizar consultas SQL si es necesario
- Considerar connection pooling para alta concurrencia

### Problemas de Concurrencia
- El sistema usa transacciones para evitar condiciones de carrera
- En caso de alta concurrencia, considerar implementar locks

### Debugging
- Habilitar logging detallado: `enableLogging: true`
- Revisar logs de base de datos
- Usar herramientas de monitoreo de aplicaciones

## Soporte

Para reportar bugs o solicitar nuevas funcionalidades, contacta al equipo de desarrollo.