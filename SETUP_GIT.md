# 🚀 Configuración de Git y GitHub

Sigue estos pasos para subir tu proyecto a GitHub:

## 📋 Pasos para Crear y Subir el Repositorio

### 1. **Inicializar Git (si no está inicializado)**
```bash
git init
```

### 2. **Configurar Git (primera vez)**
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-email@ejemplo.com"
```

### 3. **Agregar archivos al staging**
```bash
git add .
```

### 4. **Hacer el primer commit**
```bash
git commit -m "🎉 Initial commit: Sistema de inventario para minimarket

✨ Características implementadas:
- Dashboard de administrador con CRUD completo
- Dashboard de vendedor con sistema de ventas
- Gestión de inventario con sistema FIFO
- Autenticación con roles de usuario
- Búsqueda en tiempo real
- Interfaz responsive con Tailwind CSS"
```

### 5. **Crear repositorio en GitHub**
1. Ve a [GitHub](https://github.com)
2. Click en "New repository"
3. Nombre: `minimarket` o `sistema-inventario-minimarket`
4. Descripción: "Sistema completo de inventario para minimarket con Next.js y Supabase"
5. Asegúrate de que sea **público** o **privado** según tu preferencia
6. **NO** marques "Initialize with README" (ya tenemos uno)
7. Click "Create repository"

### 6. **Conectar repositorio local con GitHub**
```bash
# Reemplaza 'tu-usuario' con tu username de GitHub
git remote add origin https://github.com/tu-usuario/minimarket.git
```

### 7. **Subir el código**
```bash
git branch -M main
git push -u origin main
```

## 🔄 Comandos para Actualizaciones Futuras

### **Agregar cambios**
```bash
git add .
git commit -m "✨ Descripción de los cambios"
git push
```

### **Ver estado del repositorio**
```bash
git status
```

### **Ver historial de commits**
```bash
git log --oneline
```

## 📝 Ejemplo de Mensajes de Commit

Usa estos prefijos para mantener un historial limpio:

- `✨ feat:` Nueva funcionalidad
- `🐛 fix:` Corrección de bugs
- `📝 docs:` Actualización de documentación
- `💄 style:` Cambios de estilo/formato
- `♻️ refactor:` Refactorización de código
- `⚡ perf:` Mejoras de rendimiento
- `🔧 config:` Cambios de configuración

### **Ejemplos:**
```bash
git commit -m "✨ feat: Agregar filtro por categoría en dashboard vendedor"
git commit -m "🐛 fix: Corregir cálculo de stock en sistema FIFO"
git commit -m "📝 docs: Actualizar README con nuevas instrucciones"
git commit -m "💄 style: Mejorar diseño responsive en móviles"
```

## 🌟 Configuración Adicional

### **Agregar archivo .env.example**
Crea manualmente un archivo `.env.example` con:
```env
# Configuración de Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_publica_aqui
```

### **Verificar .gitignore**
Asegúrate de que `.env*` esté en tu `.gitignore` (ya debería estar).

## 🎯 Próximos Pasos

1. **Clonar en otro lugar** para probar:
   ```bash
   git clone https://github.com/tu-usuario/minimarket.git
   cd minimarket
   npm install
   cp .env.example .env.local
   # Editar .env.local con tus credenciales
   npm run dev
   ```

2. **Configurar Vercel** para deployment automático

3. **Invitar colaboradores** si trabajas en equipo

## 🆘 Solución de Problemas

### **Error: "remote origin already exists"**
```bash
git remote remove origin
git remote add origin https://github.com/tu-usuario/minimarket.git
```

### **Error de autenticación**
- Usar token personal de GitHub en lugar de contraseña
- O configurar SSH keys

### **Archivos muy grandes**
```bash
# Ver archivos grandes
du -sh * | sort -hr

# Limpiar caché de npm si es necesario
rm -rf node_modules
npm install
```

---

¡Listo! Tu proyecto estará disponible en GitHub y otros podrán clonarlo y contribuir. 🚀 