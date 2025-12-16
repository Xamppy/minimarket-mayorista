import nodemailer from 'nodemailer';

// Configuración del transporter usando variables de entorno
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true para puerto 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// Verificar la configuración del transporter (opcional, para debugging)
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Configuración de email verificada correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en la configuración de email:', error);
    return false;
  }
};

/**
 * Envía un email con la contraseña temporal a un nuevo usuario
 * @param email - Email del destinatario
 * @param password - Contraseña temporal (sin hashear)
 * @param userName - Nombre del usuario (opcional)
 * @returns Promise<boolean> - true si el email se envió exitosamente
 */
export const sendTemporaryPasswordEmail = async (
  email: string,
  password: string,
  userName?: string
): Promise<boolean> => {
  try {
    const displayName = userName || email;
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject: 'Bienvenido - Tu Contraseña Temporal',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .header {
              background-color: #2563eb;
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              margin: -30px -30px 20px -30px;
            }
            .password-box {
              background-color: #fff;
              border: 2px solid #2563eb;
              border-radius: 6px;
              padding: 15px;
              margin: 20px 0;
              text-align: center;
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 2px;
              color: #2563eb;
            }
            .warning {
              background-color: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">¡Bienvenido a Minimarket Don Ale!</h1>
            </div>
            
            <p>Hola <strong>${displayName}</strong>,</p>
            
            <p>Tu cuenta ha sido creada exitosamente. A continuación encontrarás tu contraseña temporal:</p>
            
            <div class="password-box">
              ${password}
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong> Por razones de seguridad, te recomendamos cambiar esta contraseña temporal en tu primer inicio de sesión.
            </div>
            
            <p><strong>Tus credenciales de acceso:</strong></p>
            <ul>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Contraseña temporal:</strong> (ver arriba)</li>
            </ul>
            
            <p>Puedes iniciar sesión en el sistema con estas credenciales.</p>
            
            <div class="footer">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
              <p>&copy; ${new Date().getFullYear()} Minimarket Don Ale. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hola ${displayName},

Tu cuenta ha sido creada exitosamente en Minimarket Don Ale.

Tu contraseña temporal es: ${password}

Credenciales de acceso:
- Email: ${email}
- Contraseña temporal: ${password}

IMPORTANTE: Por razones de seguridad, te recomendamos cambiar esta contraseña temporal en tu primer inicio de sesión.

---
Este es un correo automático, por favor no respondas a este mensaje.
© ${new Date().getFullYear()} Minimarket Don Ale. Todos los derechos reservados.
      `.trim(),
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente:', {
      messageId: info.messageId,
      to: email,
      preview: nodemailer.getTestMessageUrl(info) // URL de preview (solo para cuentas de prueba)
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return false;
  }
};

/**
 * Envía un email de notificación genérico
 * @param to - Email del destinatario
 * @param subject - Asunto del email
 * @param htmlContent - Contenido HTML del email
 * @param textContent - Contenido texto plano (fallback)
 * @returns Promise<boolean> - true si el email se envió exitosamente
 */
export const sendEmail = async (
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string
): Promise<boolean> => {
  try {
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente:', {
      messageId: info.messageId,
      to,
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error al enviar email:', error);
    return false;
  }
};
