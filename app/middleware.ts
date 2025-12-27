import { NextResponse, type NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ========================================
  // SERVIR IMÁGENES DESDE /uploads/
  // ========================================
  if (pathname.startsWith('/uploads/')) {
    const relativePath = pathname.replace('/uploads/', '');
    const basePath = '/app/public/uploads';
    const filePath = path.join(basePath, relativePath);

    console.log(`📂 [MIDDLEWARE] Sirviendo imagen: ${filePath}`);

    try {
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        if (ext === '.webp') contentType = 'image/webp';
        if (ext === '.gif') contentType = 'image/gif';

        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        });
      } else {
        console.error(`❌ [MIDDLEWARE] Imagen no encontrada: ${filePath}`);
        // Debug: listar directorio
        const parentDir = path.dirname(filePath);
        if (fs.existsSync(parentDir)) {
          console.log(`📂 Contenido de ${parentDir}:`, fs.readdirSync(parentDir));
        }
      }
    } catch (error) {
      console.error(`🔥 [MIDDLEWARE] Error sirviendo imagen:`, error);
    }
    
    return new NextResponse('File not found', { status: 404 });
  }

  // ========================================
  // AUTENTICACIÓN PARA RUTAS PROTEGIDAS
  // ========================================
  const response = NextResponse.next();
  
  const protectedPaths = ['/dashboard', '/admin'];
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));
  
  if (isProtectedPath) {
    const token = request.cookies.get('auth_token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch (error) {
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * NOTA: uploads se maneja DENTRO del middleware ahora
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};