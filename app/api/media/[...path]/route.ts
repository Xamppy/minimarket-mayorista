import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  // Reconstruimos la ruta: /app/public/uploads/products/foto.webp
  const filePath = path.join(process.cwd(), "public", "uploads", ...resolvedParams.path);

  console.log("📂 [MEDIA] process.cwd():", process.cwd());
  console.log("📂 [MEDIA] Params recibidos:", resolvedParams.path);
  console.log("📂 [MEDIA] Ruta completa:", filePath);

  if (!fs.existsSync(filePath)) {
    // Intentar listar el directorio padre para debug
    const parentDir = path.dirname(filePath);
    console.error("❌ [MEDIA] Archivo no encontrado:", filePath);
    console.log("📂 [MEDIA] Contenido del directorio padre:");
    try {
      if (fs.existsSync(parentDir)) {
        const files = fs.readdirSync(parentDir);
        console.log("   Archivos encontrados:", files);
      } else {
        console.log("   El directorio padre NO existe:", parentDir);
      }
    } catch (e) {
      console.log("   Error listando directorio:", e);
    }
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    // Detección simple de Content-Type
    const ext = path.extname(filePath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    if (ext === ".png") contentType = "image/png";
    if (ext === ".webp") contentType = "image/webp";
    if (ext === ".svg") contentType = "image/svg+xml";
    if (ext === ".gif") contentType = "image/gif";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("🔥 [MEDIA] Error leyendo archivo:", error);
    return new NextResponse("Error reading file", { status: 500 });
  }
}
