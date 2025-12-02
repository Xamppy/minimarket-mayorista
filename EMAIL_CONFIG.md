# ================================================================
# CONFIGURACIÓN DE EMAIL - VARIABLES DE ENTORNO REQUERIDAS
# ================================================================

# Para que el sistema pueda enviar correos electrónicos con contraseñas
# temporales, debes configurar estas variables en tu archivo .env.local

# ----------------------------------------------------------------
# Servidor SMTP
# ----------------------------------------------------------------
# Host del servidor SMTP (ejemplo para Gmail: smtp.gmail.com)
SMTP_HOST=smtp.gmail.com

# Puerto SMTP (587 para TLS, 465 para SSL)
SMTP_PORT=587

# Usuario SMTP (tu dirección de email)
SMTP_USER=tu-email@gmail.com

# Contraseña SMTP
# ⚠️ IMPORTANTE para Gmail: NO uses tu contraseña normal
# Debes generar una "Contraseña de Aplicación":
# 1. Ve a https://myaccount.google.com/security
# 2. Habilita la verificación en 2 pasos
# 3. Ve a "Contraseñas de aplicaciones"
# 4. Genera una nueva contraseña para "Correo"
# 5. Usa esa contraseña aquí
SMTP_PASSWORD=tu-contraseña-de-aplicacion

# Dirección del remitente (opcional, por defecto usa SMTP_USER)
SMTP_FROM="Minimarket Don Ale <no-reply@minimarket.com>"

# ================================================================
# INSTRUCCIONES PARA OTROS PROVEEDORES DE EMAIL
# ================================================================

# --- OUTLOOK/HOTMAIL ---
# SMTP_HOST=smtp-mail.outlook.com
# SMTP_PORT=587
# SMTP_USER=tu-email@outlook.com
# SMTP_PASSWORD=tu-contraseña

# --- YAHOO MAIL ---
# SMTP_HOST=smtp.mail.yahoo.com
# SMTP_PORT=587
# SMTP_USER=tu-email@yahoo.com
# SMTP_PASSWORD=tu-contraseña-de-aplicacion

# --- SENDGRID ---
# SMTP_HOST=smtp.sendgrid.net
# SMTP_PORT=587
# SMTP_USER=apikey
# SMTP_PASSWORD=tu-api-key-de-sendgrid

# --- MAILGUN ---
# SMTP_HOST=smtp.mailgun.org
# SMTP_PORT=587
# SMTP_USER=postmaster@tu-dominio.mailgun.org
# SMTP_PASSWORD=tu-contraseña-smtp-de-mailgun

# ================================================================
# TESTING
# ================================================================

# Para testing, puedes usar Mailtrap (https://mailtrap.io/)
# SMTP_HOST=sandbox.smtp.mailtrap.io
# SMTP_PORT=2525
# SMTP_USER=tu-usuario-mailtrap
# SMTP_PASSWORD=tu-contraseña-mailtrap
