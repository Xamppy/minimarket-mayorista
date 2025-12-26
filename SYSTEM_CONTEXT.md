# SYSTEM_CONTEXT.md

## 1. Tech Stack & Infraestructura

### Frontend
- **Framework**: Next.js 13+ (App Router).
- **UI Library**: Tailwind CSS v4, Lucide React (iconos), Headless UI / Radix UI (componentes accesibles).
- **Gestión de Estado**: React Hooks (`useState`, `useEffect`, `useContext`) y paso de props.
- **Gráficos**: Recharts (para reportes de ventas).

### Backend
- **API Routes**: Endpoints en `app/api/` (ej: `/api/sales`, `/api/reports`).
- **Autenticación**: `next-auth` (implícito) / JWT manual con `jsonwebtoken` y cookies (`auth_token`).
- **Base de Datos**: PostgreSQL 17.5.
- **ORM/Query Builder**: `pg` (node-postgres) para consultas SQL puras (Raw SQL). No se usa Prisma/Drizzle actualmente.

### Infraestructura
- **Despliegue**: Dokploy (VPS con Docker).
- **Contenedores**: `Dockerfile` multi-stage (base `node:20-alpine` o similar).
- **Configuración**: `next.config.ts` con `output: 'standalone'` para optimización de imagen Docker.

---

## 2. Esquema de Base de Datos

El esquema se gestiona mediante scripts SQL en `database/`. El archivo principal es `init_completo.sql`.

### Tablas Principales

| Tabla | Descripción | Clave Primaria |
| :--- | :--- | :--- |
| **`products`** | Catálogo de productos (nombre, precios, stock crítico). | `id` (UUID) |
| **`brands`** | Marcas de productos. | `id` (INT) |
| **`product_types`** | Categorías/Tipos de productos. | `id` (UUID) |
| **`stock_entries`** | Entradas de stock/lotes (control FEFO). Relacionado a `products`. | `id` (UUID) |
| **`sales`** | Cabecera de ventas (total, fecha, vendedor). | `id` (UUID) |
| **`sale_items`** | Detalle de venta (producto, cantidad, precio). | `id` (UUID) |
| **`users`** | Usuarios del sistema (roles: `administrator`, `vendedor`). | `id` (UUID) |
| **`profiles`** | Perfiles de usuario (nombre completo). | `id` (UUID) |
| **`generated_barcodes`** | Códigos de barra internos generados. | `id` (UUID) |

### Relaciones Clave

- **Ventas**: Una `sale` tiene múltiples `sale_items`.
    - `sale_items.sale_id` -> `sales.id`
    - `sale_items.product_id` -> `products.id`
- **Stock**: Un `product` tiene múltiples `stock_entries`.
    - El stock total de un producto es la suma de `current_quantity` de sus `stock_entries`.
    - Lógica **FEFO** (First Expired, First Out): Se consumen primero los lotes con fecha de vencimiento más próxima.
- **Usuarios**: `sales.user_id` -> `users.id` (quién realizó la venta).
- **Productos**:
    - `products.brand_id` -> `brands.id`
    - `products.type_id` -> `product_types.id`

---

## 3. Módulos y Lógica de Negocio Clave

### Punto de Venta (POS)
- **Componente Principal**: `VendorPageClient.tsx` (`app/dashboard/vendedor/components/`).
- **Flujo de Venta**:
    1.  **Búsqueda**: Por texto (nombre) o escaneo (código de barras).
    2.  **Stock Check**: Al seleccionar un producto, se verifica disponibilidad en `stock_entries`.
    3.  **Carrito**: Estado local `cart[]`. Permite ajustar cantidades.
    4.  **Finalización**: Envía el carrito a `api/sales`. El backend realiza la transacción SQL restando stock de los lotes correspondientes y creando registros en `sales` y `sale_items`.

### Escáner de Códigos
- **Librería**: `html5-qrcode`.
- **Componente**: `CameraBarcodeScanner.tsx`.
- **Lógica**:
    - Usa la cámara trasera (`facingMode: 'environment'`).
    - Detecta códigos de barras estándar (EAN-13, etc.).
    - Tiene un "debounce" para prevenir lecturas dobles muy rápidas.
    - Emite sonido "beep" (Web Audio API) al detectar correctamente.

### Impresión de Tickets (Térmica)
- **Página**: `app/ticket/[sale_id]/page.tsx`.
- **Utilidad**: `app/utils/thermal-printer.ts`.
- **Formato**: Papel de 80mm.
- **CSS Print**:
    - Usa `@media print` para ocultar botones y ajustar márgenes.
    - **Fix Crítico**: `padding-left: 5mm` y `padding-right: 2mm` en `.thermal-ticket` para asegurar que el contenido no se corte en impresoras físicas comunes.
    - Fuerza texto negro puro (`color: #000 !important`) y fondo blanco para nitidez.
- **Datos**: Muestra detalle de productos, subtotal, descuentos, y "Ahorro" si hubo precios mayoristas.

### Reportes
- **API**: `app/api/reports/route.ts`.
- **Lógica**: Consultas SQL directas (`SUM(total_amount)`) agrupando por fechas.
- **Manejo de Tiempo**: Usa `CURRENT_DATE` de PostgreSQL.
    - *Nota*: Las consultas asumen la zona horaria del servidor de base de datos.
- **Tipos**: Ventas diarias, productos más vendidos, historial reciente.

### Manejo de Moneda
- **Utilidad**: `formatAsCLP` en `lib/formatters.ts` y `formatCurrency` en `thermal-printer.ts`.
- **Configuración**:
    - Locale: `'es-CL'` (Chile).
    - Moneda: `CLP`.
    - Decimales: 0 (Cero).
    - Separador de miles: Punto (`.`).

---

## 4. Estructura de Archivos Clave

```
Minimarket Don Ale/
├── app/
│   ├── api/                    # Endpoints de Backend
│   │   ├── auth/               # Autenticación
│   │   ├── reports/            # Reportes de ventas
│   │   └── sales/              # Creación y consulta de ventas
│   ├── dashboard/              # Vistas protegidas
│   │   ├── admin/              # Panel Administrador (Inventario, Usuarios)
│   │   └── vendedor/           # Panel Vendedor (POS) (Venta, Caja)
│   ├── ticket/                 # Vista de tickets (para impresión)
│   │   └── [sale_id]/          # Página dinámica de ticket
│   └── globals.css             # Estilos globales Tailwind
├── components/                 # Componentes UI compartidos (si los hay fuera de app)
├── database/                   # Scripts SQL
│   ├── init_completo.sql       # Esquema completo (Tablas, Vistas, Funciones)
│   └── ...                     # Scripts de migración/fix
├── lib/                        # Utilidades y configuración
│   ├── formatters.ts           # Formateo de moneda CLP
│   └── ...
├── public/                     # Assets estáticos
├── scripts/                    # Scripts de mantenimiento (db-init.js)
├── .env.local                  # Variables de entorno locales
├── next.config.ts              # Configuración Next.js
└── package.json                # Dependencias
```

---

## 5. Variables de Entorno

Variables necesarias en el archivo `.env` o configuración del servidor:

| Variable | Descripción |
| :--- | :--- |
| **`POSTGRES_HOST`** | Host/IP del servidor de base de datos. |
| **`POSTGRES_PORT`** | Puerto de PostgreSQL (ej: 5432). |
| **`POSTGRES_DB`** | Nombre de la base de datos (ej: `minimarket`). |
| **`POSTGRES_USER`** | Usuario de conexión DB. |
| **`POSTGRES_PASSWORD`** | Contraseña del usuario DB. |
| **`POSTGRES_SSL`** | `true` o `false`. Para habilitar SSL en conexión DB. |
| **`JWT_SECRET`** | Clave secreta para firmar/verificar tokens JWT de sesión. |
| **`NEXTAUTH_SECRET`** | (Si se usa NextAuth completo) Clave para encriptación de sesión. |
| **`NEXTAUTH_URL`** | URL base de la aplicación (para redirecciones auth). |
