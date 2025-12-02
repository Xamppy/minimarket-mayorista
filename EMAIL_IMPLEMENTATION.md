# 📧 Implementación de Envío de Correos - Instrucciones de Configuración

## ✅ ¿Qué se ha implementado?

Se ha implementado la funcionalidad completa para enviar contraseñas temporales por correo electrónico cuando se crea un nuevo vendedor.

### Cambios Realizados:

1. **Instalación de Dependencias**
   ```bash
   npm install nodemailer
   npm install --save-dev @types/nodemailer
   ```

2. **Nueva Utilidad de Email** (`lib/email.ts`)
   - Configuración de nodemailer con variables de entorno
   - Función `sendTemporaryPasswordEmail()` para enviar contraseñas temporales
   - Plantilla HTML profesional para los correos
   - Manejo robusto de errores

3. **Modificación del Endpoint de Usuarios** (`app/api/admin/users/route.ts`)
   - El campo `password` ahora es **opcional**
   - Si no se proporciona contraseña → se genera automáticamente una de 8 caracteres
   - La contraseña se envía por correo al nuevo vendedor
   - Se mantiene el hasheo seguro con bcrypt antes de guardar en BD

## 🔧 Configuración Requerida

Para que el sistema funcione, debes configurar las variables de entorno SMTP en tu archivo `.env.local`.

### Variables SMTP Requeridas:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-contraseña-de-aplicacion
SMTP_FROM="Minimarket Don Ale <no-reply@minimarket.com>"
```

### 📝 Instrucciones para Gmail:

⚠️ **IMPORTANTE**: No uses tu contraseña normal de Gmail. Debes crear una "Contraseña de Aplicación":

1. Ve a https://myaccount.google.com/security
2. Habilita la **verificación en 2 pasos** (si no está habilitada)
3. Busca "Contraseñas de aplicaciones"
4. Genera una nueva contraseña para "Correo" o "Otra aplicación"
5. Copia esa contraseña de 16 caracteres
6. Úsala en la variable `SMTP_PASSWORD`

### Otros Proveedores:

Consulta el archivo `EMAIL_CONFIG.md` para ver ejemplos de configuración con:
- Outlook/Hotmail
- Yahoo Mail
- SendGrid
- Mailgun
- Mailtrap (para testing)

## 🚀 Cómo Usar

### 1. Crear Usuario CON Contraseña (Comportamiento Original)

```json
POST /api/admin/users
{
  "email": "vendedor@example.com",
  "password": "MiPassword123!",
  "role": "vendedor",
  "full_name": "Juan Pérez"
}
```

El usuario se crea con la contraseña proporcionada. **No se envía email**.

### 2. Crear Usuario SIN Contraseña (Nuevo Comportamiento)

```json
POST /api/admin/users
{
  "email": "vendedor@example.com",
  "role": "vendedor",
  "full_name": "Juan Pérez"
}
```

El sistema:
1. ✅ Genera automáticamente una contraseña temporal de 8 caracteres
2. ✅ La hashea con bcrypt y la guarda en la BD
3. ✅ Envía un correo al vendedor con la contraseña temporal
4. ✅ Retorna éxito (el usuario fue creado aunque el email falle)

### 3. Email Recibido

El vendedor recibirá un email con formato profesional que incluye:
- Título: "Bienvenido - Tu Contraseña Temporal"
- Su contraseña temporal en un recuadro destacado
- Sus credenciales de acceso
- Recomendación de cambiar la contraseña

## 🧪 Testing Local

### Opción 1: Usar Mailtrap (Recomendado para Testing)

Mailtrap es un servicio de email para desarrollo que captura todos los correos sin enviarlos realmente:

1. Crea una cuenta gratuita en https://mailtrap.io/
2. Ve a "Email Testing" → "Inboxes"
3. Copia las credenciales SMTP
4. Configura en `.env.local`:
   ```env
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=tu-usuario-mailtrap
   SMTP_PASSWORD=tu-contraseña-mailtrap
   ```

### Opción 2: Usar Gmail (Producción)

Sigue las instrucciones de configuración de Gmail arriba mencionadas.

## 📊 Logs y Debugging

El sistema genera logs útiles en la consola del servidor:

```
🔑 Contraseña temporal generada para: vendedor@example.com
✅ Email con contraseña temporal enviado a: vendedor@example.com
```

Si hay errores:
```
⚠️ No se pudo enviar el email a: vendedor@example.com
❌ Error al enviar email: [detalles del error]
```

**Importante**: Aunque falle el envío de email, el usuario **SÍ se crea** en la base de datos. El sistema no falla la operación completa si solo falla el email.

## 🔒 Seguridad

- ✅ Las contraseñas se hashean con bcrypt (12 rounds) antes de guardarse
- ✅ Las contraseñas temporales son aleatorias y cumplen requisitos de fortaleza
- ✅ El email se envía solo con la contraseña original (nunca el hash)
- ✅ Los logs no muestran las contraseñas en texto plano
- ✅ Las credenciales SMTP están en variables de entorno (no en el código)

## 📝 Siguiente Paso Recomendado

Después de implementar esto, considera añadir una funcionalidad de "Cambiar Contraseña" para que los vendedores puedan actualizar su contraseña temporal.

---

**¿Necesitas ayuda?** Revisa el archivo `EMAIL_CONFIG.md` para más ejemplos de configuración.
