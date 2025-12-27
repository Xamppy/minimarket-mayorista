import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  
  // 🛑 CAMBIO CLAVE: Usamos ruta absoluta hardcodeada para Docker
  // Sabemos por el comando 'ls' que los archivos viven aquí:
  const BASE_PATH = "/app/public/uploads"; 
  
  const filePath = path.join(BASE_PATH, ...resolvedParams.path);

  console.log(`🔍 [MEDIA API] Buscando en: ${filePath}`); // Log vital

  if (!fs.existsSync(filePath)) {
    console.error(`❌ [MEDIA API] NO ENCONTRADO: ${filePath}`);
    // Intenta listar el directorio padre para ver qué hay (debug)
    try {
        const parentDir = path.dirname(filePath);
        if (fs.existsSync(parentDir)) {
            console.log(`📂 Contenido de ${parentDir}:`, fs.readdirSync(parentDir));
        } else {
            console.log(`⚠️ El directorio padre ${parentDir} tampoco existe.`);
        }
    } catch (e) { console.error("Error debug listing:", e); }

    return new NextResponse("File not found", { status: 404 });
  }

  // Si llegamos aquí, ¡el archivo existe!
  const fileBuffer = fs.readFileSync(filePath);
  
  // Tipos MIME básicos
  const ext = path.extname(filePath).toLowerCase();
  let contentType = "application/octet-stream";
  if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  if (ext === ".png") contentType = "image/png";
  if (ext === ".webp") contentType = "image/webp";

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
