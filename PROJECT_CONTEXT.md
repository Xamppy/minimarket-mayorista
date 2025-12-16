# PROJECT_CONTEXT.md

## 1. RESUMEN DEL PROYECTO

**Objetivo Principal:**
Sistema de Punto de Venta (POS) y Gestión de Inventario diseñado para un Minimarket Mayorista ("Minimarket Don Ale"). La aplicación permite gestionar productos, marcas, categorías, inventario (entradas de stock), y realizar ventas rápidas a través de una interfaz optimizada para vendedores.

**Estado Actual:**
-   **Funcional:**
    -   Gestión de Productos, Marcas y Categorías.
    -   Sistema de Entrada de Stock (Lotes con fecha de vencimiento y precios diferenciados).
    -   Punto de Venta (POS) para vendedores con búsqueda rápida y carrito.
    -   Lógica de Venta FIFO (First-In-First-Out) para gestión de stock.
    -   Precios Mayoristas automáticos (si cantidad >= 3 unidades).
    -   Generación de Códigos de Barras (formato GS1 Chile).
    -   Autenticación (Login, Roles: Administrador, Vendedor).
-   **En Construcción / Mejora:**
    -   Reportes (estructura básica presente).
    -   Impresión de Tickets (módulo `escpos` presente pero integración completa por verificar).
    -   Optimización de consultas (uso de RPC y SQL raw).

## 2. STACK TECNOLÓGICO

**Frontend:**
-   **Framework:** Next.js 15.3.3 (App Router).
-   **Lenguaje:** TypeScript.
-   **Estilos:** Tailwind CSS v4, PostCSS.
-   **Componentes UI:** Headless UI, Radix UI, Lucide React (iconos).
-   **Gráficos:** Recharts.
-   **Notificaciones:** React Hot Toast.

**Backend:**
-   **Runtime:** Node.js (vía Next.js API Routes).
-   **Base de Datos:** PostgreSQL.
-   **Driver BD:** `pg` (node-postgres) - Uso de consultas SQL nativas (Raw SQL).
-   **Autenticación:** JWT (`jsonwebtoken`), `bcryptjs` para hashing de contraseñas.

**Infraestructura / Herramientas:**
-   **Contenedores:** Docker (inferido por `postgresql-mcp-server` y variables de entorno).
-   **Linting:** ESLint.

## 3. ARQUITECTURA Y ESTRUCTURA

**Patrón de Diseño:**
-   **Arquitectura Modular por Funcionalidad (Feature-based):** Dentro de `app/dashboard`, las carpetas se organizan por dominio (`admin`, `vendedor`, `reports`).
-   **Backend-for-Frontend (BFF):** Las API Routes (`app/api`) actúan como backend dedicado para el frontend Next.js.
-   **Repository Pattern (Implícito):** No hay una capa de repositorio formal, pero las consultas SQL están encapsuladas en los handlers de las rutas API.

**Estructura de Directorios Clave:**

```
/
├── app/
│   ├── api/                 # Endpoints del Backend
│   │   ├── auth/            # Login/Logout
│   │   ├── products/        # CRUD Productos
│   │   ├── sales/           # Lógica transaccional de ventas
│   │   ├── rpc/             # Remote Procedure Calls (Consultas optimizadas)
│   │   └── ...
│   ├── dashboard/           # Área privada de la aplicación
│   │   ├── admin/           # Panel de Administración
│   │   ├── vendedor/        # Panel POS (Punto de Venta)
│   │   └── reports/         # Visualización de datos
│   ├── login/               # Página de acceso
│   └── ...
├── database/                # Scripts SQL (Migraciones, Schemas)
├── components/              # Componentes UI compartidos
├── lib/                     # Utilidades y configuraciones (DB, Auth)
└── public/                  # Assets estáticos
```

## 4. MODELO DE DATOS (Esquema Inferido)

El sistema utiliza una base de datos relacional PostgreSQL.

**Entidades Principales:**

1.  **Products (`products`)**
    -   `id` (UUID): Identificador único.
    -   `name` (VARCHAR): Nombre del producto.
    -   `brand_name` (VARCHAR): Nombre de la marca (Legacy/Denormalized).
    -   `product_type_id` (UUID): FK a `product_types`.
    -   `barcode` (VARCHAR): Código de barras.
    -   `image_url` (TEXT): URL de la imagen.
    -   `created_at` (TIMESTAMP).

2.  **Stock Entries (`stock_entries`)** - *Núcleo del inventario*
    -   `id` (UUID): Identificador del lote.
    -   `product_id` (UUID): FK a `products`.
    -   `current_quantity` (INT): Cantidad actual disponible.
    -   `sale_price_unit` (DECIMAL): Precio de venta unitario.
    -   `sale_price_wholesale` (DECIMAL): Precio de venta mayorista.
    -   `expiration_date` (DATE): Fecha de vencimiento (clave para FIFO).
    -   `entry_date` (TIMESTAMP): Fecha de ingreso.

3.  **Sales (`sales`)**
    -   `id` (UUID): Identificador de la venta.
    -   `user_id` (UUID): Vendedor que realizó la venta.
    -   `total_amount` (DECIMAL): Monto total.
    -   `payment_method` (VARCHAR): 'cash', 'card', 'transfer', etc.
    -   `created_at` (TIMESTAMP).

4.  **Sale Items (`sale_items`)**
    -   `sale_id` (UUID): FK a `sales`.
    -   `product_id` (UUID): FK a `products`.
    -   `quantity` (INT): Cantidad vendida.
    -   `unit_price` (DECIMAL): Precio unitario aplicado.
    -   `total_price` (DECIMAL): Subtotal (`quantity * unit_price`).
    -   `sale_type` (VARCHAR): 'regular' o 'wholesale' (mayorista).

5.  **Catalogos Auxiliares:**
    -   `product_types` (Categorías).
    -   `brands` (Marcas).
    -   `generated_barcodes` (Códigos internos).

## 5. FUNCIONALIDADES CLAVE (Lógica de Negocio)

**1. Sistema de Venta FIFO (First-In-First-Out):**
-   Al vender un producto, el sistema busca automáticamente los lotes (`stock_entries`) disponibles.
-   Prioriza los lotes con **fecha de vencimiento más próxima** (o fecha de ingreso más antigua si no hay vencimiento).
-   Si la venta requiere más cantidad de la que hay en un lote, toma de múltiples lotes secuencialmente.

**2. Precios Mayoristas Automáticos:**
-   Cada lote de entrada (`stock_entry`) tiene un precio unitario y un precio mayorista.
-   **Regla:** Si la cantidad a vender de un lote específico es **>= 3 unidades**, se aplica automáticamente el `sale_price_wholesale`.
-   Esto permite tener precios dinámicos según el lote de origen.

**3. Punto de Venta (POS):**
-   Interfaz optimizada para búsqueda rápida (por nombre, marca, categoría).
-   Carrito de compras local (Client-side state).
-   Validación de stock en tiempo real antes de confirmar la venta.
-   Soporte para venta de "lotes específicos" (selección manual de un stock entry en lugar de FIFO automático).

**4. Gestión de Códigos de Barras:**
-   Generador integrado de códigos formato EAN-13 / GS1 Chile.
-   Algoritmo de dígito verificador implementado en SQL (`generate_gs1_chile_barcode`).

## 6. PUNTOS DE ATENCIÓN (Deuda Técnica & TODOs)

1.  **Consultas SQL Raw:**
    -   El proyecto usa `pg` con strings SQL directos. Aunque se usan parámetros (`$1`, `$2`) para evitar inyección SQL, el mantenimiento de queries complejas (como en `api/sales/route.ts`) es propenso a errores.
    -   *Recomendación:* Considerar un Query Builder (Kysely) o un ORM ligero (Drizzle) a futuro.

2.  **Manejo de Transacciones:**
    -   La lógica de venta (`api/sales/route.ts`) maneja transacciones manualmente (`BEGIN`, `COMMIT`, `ROLLBACK`). Es crítico asegurar que todos los caminos de error hagan rollback correctamente para evitar inconsistencias de stock.

3.  **Validación de Tipos:**
    -   Al no usar un ORM, los tipos de retorno de la BD son `any` o interfaces manuales. Se debe tener cuidado con los cambios de esquema que no se reflejen en las interfaces de TypeScript.

4.  **Migración de Datos:**
    -   Existen scripts como `migrate-existing-data.sql` que sugieren una transición reciente de un esquema más simple a uno relacional. Verificar que no queden datos "huérfanos" o inconsistentes (ej. productos sin `brand_id`).

5.  **Logs y Depuración:**
    -   Hay varios `console.log` en producción (ej. en `api/sales/route.ts`). Deberían reemplazarse por un logger estructurado o limpiarse.
