# 🏪 Sistema de Inventario para Minimarket

Un sistema completo de gestión de inventario desarrollado con **Next.js 15**, **TypeScript**, **Tailwind CSS** y **PostgreSQL**. Diseñado específicamente para pequeños comercios que necesitan gestionar productos, stock y ventas de manera eficiente.

## 🚀 Características Principales

### 📊 **Dashboard de Administrador**
- **Gestión Completa de Productos**: CRUD completo (Crear, Leer, Actualizar, Eliminar)
- **Gestión de Marcas**: CRUD completo para marcas de productos con validación MCP
- **Gestión de Tipos de Producto**: CRUD completo para categorías de productos con validación MCP
- **Control de Stock**: Sistema FIFO para manejo de inventario
- **Gestión de Entradas**: Registro detallado de compras con precios y fechas de vencimiento
- **Visualización en Tiempo Real**: Stock total calculado automáticamente

### 🛒 **Dashboard de Vendedor**
- **Catálogo de Productos**: Vista en tarjetas con información de stock
- **Búsqueda Inteligente**: Filtrado en tiempo real por nombre y marca
- **Sistema de Ventas**: Procesamiento de ventas con múltiples formatos
- **Actualización Automática**: Inventario se actualiza tras cada venta

### 🔐 **Sistema de Autenticación**
- **Roles de Usuario**: Administrador y Vendedor con permisos diferenciados
- **Autenticación Segura**: Sistema JWT personalizado
- **Protección de Rutas**: Middleware para control de acceso

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 15, React 18, TypeScript
- **Estilos**: Tailwind CSS
- **Base de Datos**: PostgreSQL
- **Autenticación**: JWT personalizado
- **Integración MCP**: PostgreSQL MCP Server para gestión de esquemas
- **Deployment**: Vercel (recomendado)

## 📋 Prerrequisitos

- Node.js 18+ 
- npm o yarn
- PostgreSQL 12+

## ⚙️ Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/minimarket.git
cd minimarket
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de PostgreSQL:
```env
DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/minimarket
JWT_SECRET=tu_jwt_secret_aqui
```

4. **Configurar la base de datos**
Ejecutar los scripts SQL incluidos en la carpeta `/database/` en tu instancia de PostgreSQL.

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

- **`products`**: Catálogo general de productos
- **`brands`**: Marcas de productos
- **`product_types`**: Tipos/categorías de productos
- **`stock_entries`**: Entradas de inventario con sistema FIFO
- **`sales`**: Registro de ventas
- **`sale_items`**: Detalles de items vendidos
- **`profiles`**: Perfiles de usuario con roles

### Funciones de Base de Datos

- **`get_user_role(user_id)`**: Obtiene el rol del usuario
- **`get_products_with_stock()`**: Calcula stock total por producto

## 🎯 Funcionalidades Detalladas

### **Dashboard Administrador** (`/dashboard/admin`)

#### Gestión de Productos
- ✅ **Crear Productos**: Formulario con validación completa
- ✅ **Editar Productos**: Modal con datos pre-llenados
- ✅ **Eliminar Productos**: Confirmación de seguridad + eliminación en cascada
- ✅ **Visualizar Stock**: Tabla con stock total en tiempo real

#### Gestión de Marcas
- ✅ **Crear Marcas**: Formulario modal con validación en tiempo real
- ✅ **Editar Marcas**: Modal de edición con datos pre-cargados
- ✅ **Validación Avanzada**: Verificación de unicidad y longitud de nombres
- ✅ **Estados de Carga**: Indicadores visuales durante operaciones MCP
- ✅ **Listado Completo**: Tabla con todas las marcas y conteo de productos asociados
- ✅ **Eliminación Segura**: Confirmación y validación antes de eliminar marcas
- ✅ **Datos en Tiempo Real**: Actualización automática tras operaciones MCP

#### Gestión de Tipos de Producto
- ✅ **Crear Tipos**: Formulario modal con validación en tiempo real
- ✅ **Editar Tipos**: Modal de edición con datos pre-cargados
- ✅ **Validación Avanzada**: Verificación de unicidad y longitud de nombres
- ✅ **Estados de Carga**: Indicadores visuales durante operaciones MCP
- ✅ **Listado Completo**: Tabla con todos los tipos y conteo de productos asociados
- ✅ **Eliminación Segura**: Confirmación y validación antes de eliminar tipos
- ✅ **Datos en Tiempo Real**: Actualización automática tras operaciones MCP

#### Gestión de Categorías Integrada
- ✅ **Interfaz con Tabs**: Navegación entre marcas y tipos de producto
- ✅ **Modal Completo**: Gestión de categorías desde el dashboard principal
- ✅ **Integración Perfecta**: Acceso directo desde el dashboard de administrador
- ✅ **Diseño Responsive**: Adaptable a diferentes tamaños de pantalla
- ✅ **Sincronización MCP**: Nuevas categorías aparecen inmediatamente en formularios de productos
- ✅ **Actualización Automática**: Los dropdowns se refrescan tras crear/editar categorías

#### Gestión de Inventario
- ✅ **Agregar Stock**: Formulario con precios y fechas de vencimiento
- ✅ **Historial de Entradas**: Tabla completa con filtros visuales
- ✅ **Sistema FIFO**: Rotación automática por fecha de vencimiento
- ✅ **Alertas de Vencimiento**: Código de colores para fechas próximas

### **Dashboard Vendedor** (`/dashboard/vendedor`)

#### Catálogo y Búsqueda
- ✅ **Vista en Tarjetas**: Diseño moderno y responsive
- ✅ **Búsqueda en Tiempo Real**: Filtrado por nombre y marca
- ✅ **URL Sincronizada**: Parámetros de búsqueda en la URL
- ✅ **Stock Visible**: Indicador de disponibilidad

#### Sistema de Ventas
- ✅ **Modal de Venta**: Interfaz intuitiva para procesar ventas
- ✅ **Múltiples Formatos**: Unitario, caja, display, pallet
- ✅ **Validación de Stock**: Prevención de sobreventa
- ✅ **Actualización Automática**: Inventario se actualiza instantáneamente

## 🔄 Flujo de Trabajo

### **Proceso de Venta**
1. **Selección**: Vendedor busca y selecciona producto
2. **Configuración**: Define cantidad y formato de venta
3. **Validación**: Sistema verifica stock disponible
4. **Procesamiento**: Aplica sistema FIFO para actualizar inventario
5. **Registro**: Crea registros en `sales` y `sale_items`
6. **Actualización**: Stock se actualiza automáticamente

### **Gestión de Inventario**
1. **Entrada**: Administrador registra nueva compra
2. **Almacenamiento**: Se crea registro en `stock_entries`
3. **Cálculo**: Stock total se actualiza automáticamente
4. **Rotación**: Sistema FIFO prioriza productos por vencer
5. **Trazabilidad**: Historial completo de movimientos

## 🎨 Características de Diseño

- **Responsive Design**: Adaptable a móviles, tablets y desktop
- **Tema Consistente**: Colores y tipografía unificados
- **Accesibilidad**: Contraste adecuado y navegación por teclado
- **Estados Visuales**: Loading, success, error claramente diferenciados
- **Micro-interacciones**: Hover effects y transiciones suaves

## 🔧 Configuración Avanzada

### **Roles de Usuario**
Para asignar roles, actualizar la tabla `profiles`:
```sql
UPDATE profiles 
SET role = 'administrador' 
WHERE id = 'user-id';
```

### **Configuración de Cascada**
Las eliminaciones en cascada están configuradas en el esquema SQL:
```sql
ALTER TABLE stock_entries 
ADD CONSTRAINT fk_product 
FOREIGN KEY (product_id) 
REFERENCES products(id) 
ON DELETE CASCADE;
```

### **Integración MCP de PostgreSQL**
El proyecto incluye integración con Model Context Protocol (MCP) para gestión avanzada de base de datos PostgreSQL:

#### Configuración MCP
- **Servidor**: PostgreSQL MCP Server personalizado
- **Funcionalidades**: Gestión directa de esquemas, consultas y operaciones CRUD
- **Auto-aprobación**: Configurada para operaciones comunes de base de datos

#### Capacidades MCP Disponibles
- ✅ **Gestión de Esquemas**: Crear, modificar y eliminar tablas
- ✅ **Consultas Directas**: Ejecutar SQL directamente en PostgreSQL
- ✅ **Listado de Tablas**: Inspeccionar estructura de base de datos
- ✅ **Operaciones CRUD**: Insertar, actualizar y eliminar registros

## 📁 Estructura del Proyecto

```
minimarket/
├── app/
│   ├── dashboard/
│   │   ├── admin/           # Dashboard administrador
│   │   │   ├── components/  # Componentes específicos
│   │   │   ├── actions.ts   # Server Actions
│   │   │   └── page.tsx     # Página principal
│   │   └── vendedor/        # Dashboard vendedor
│   │       ├── components/  # Componentes de venta
│   │       └── page.tsx     # Página principal
│   ├── api/                 # API Routes
│   │   ├── sales/          # Procesamiento de ventas
│   │   └── stock-entries/  # Gestión de stock
│   ├── login/              # Autenticación
│   └── utils/              # Utilidades
│       └── auth/           # Utilidades de autenticación
├── database/               # Scripts SQL
├── public/                # Archivos estáticos
└── README.md              # Este archivo
```

## 🚀 Deployment

### **Vercel (Recomendado)**
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Deploy automático

### **Variables de Entorno para Producción**
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_key
```

## 🐛 Solución de Problemas

### **Error de Autenticación**
- Verificar variables de entorno
- Confirmar configuración de Supabase
- Revisar políticas RLS

### **Error de Stock**
- Verificar función RPC `get_products_with_stock`
- Confirmar estructura de `stock_entries`
- Revisar cálculos FIFO

### **Error de Roles**
- Verificar tabla `profiles`
- Confirmar función `get_user_role`
- Revisar middleware de autenticación

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👥 Autores

- **Xamppy** - *Desarrollo inicial* - [tu-github](https://github.com/Xamppy)

## 🙏 Agradecimientos

- Equipo de Next.js por el framework
- PostgreSQL por la base de datos robusta
- Tailwind CSS por el sistema de estilos
- Comunidad open source por las herramientas

---

**📞 Soporte**: Si tienes preguntas o necesitas ayuda, abre un issue en GitHub.

**🔄 Actualizaciones**: Mantente al día con las últimas características siguiendo el repositorio.

**⭐ ¿Te gusta el proyecto?** ¡Dale una estrella en GitHub!
