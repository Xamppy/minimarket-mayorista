import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { withAdminAuth } from '../../utils/auth/middleware';
import { AuthenticatedUser } from '../../types/auth';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'products');

// POST /api/upload - Subir imagen de producto
export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'No se proporcionó ningún archivo' },
          { status: 400 }
        );
      }

      // Validar tipo de archivo
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: 'Tipo de archivo no permitido. Solo se aceptan PNG y JPEG.' },
          { status: 400 }
        );
      }

      // Validar tamaño del archivo (máximo 5MB)
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'El archivo es demasiado grande. Máximo permitido: 5MB.' },
          { status: 400 }
        );
      }

      // Crear directorio si no existe
      await mkdir(UPLOAD_DIR, { recursive: true });

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_'); // Sanitizar nombre
      const extension = path.extname(originalName) || '.jpg';
      const baseName = path.basename(originalName, extension);
      const uniqueFileName = `${timestamp}-${baseName}${extension}`;

      // Convertir el archivo a Buffer y guardarlo
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const filePath = path.join(UPLOAD_DIR, uniqueFileName);
      await writeFile(filePath, buffer);

      // Retornar la URL relativa para acceso público
      const publicUrl = `/uploads/products/${uniqueFileName}`;

      console.log(`[UPLOAD] Imagen guardada: ${publicUrl} por usuario ${user.email}`);

      return NextResponse.json({
        success: true,
        url: publicUrl,
        fileName: uniqueFileName
      });

    } catch (error: any) {
      console.error('Error al subir imagen:', error);
      return NextResponse.json(
        { error: 'Error interno al procesar la imagen', details: error.message },
        { status: 500 }
      );
    }
  });
}
