import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// GET /api/serve-image?file=products/imagen.webp
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const filePath = searchParams.get('file');

  if (!filePath) {
    return NextResponse.json({ error: "Missing 'file' parameter" }, { status: 400 });
  }

  // Sanitizar: prevenir path traversal
  if (filePath.includes('..')) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // Ruta absoluta hardcodeada para Docker
  const BASE_PATH = "/app/public/uploads";
  const fullPath = path.join(BASE_PATH, filePath);

  console.log(`🔍 [SERVE-IMAGE] Buscando: ${fullPath}`);

  if (!fs.existsSync(fullPath)) {
    console.error(`❌ [SERVE-IMAGE] No encontrado: ${fullPath}`);
    // Debug: listar directorio
    try {
      const parentDir = path.dirname(fullPath);
      if (fs.existsSync(parentDir)) {
        console.log(`📂 Contenido de ${parentDir}:`, fs.readdirSync(parentDir));
      } else {
        console.log(`⚠️ Directorio padre no existe: ${parentDir}`);
      }
    } catch (e) {}
    return new NextResponse("File not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(fullPath);
  
  const ext = path.extname(fullPath).toLowerCase();
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
