import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  // Reconstruir la ruta del archivo (ej: products/imagen.jpg)
  const filePath = path.join(process.cwd(), "public", "uploads", ...resolvedParams.path);

  console.log("📂 [CDN] Intentando servir archivo desde:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ [CDN] Archivo no encontrado:", filePath);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Mapeo simple de Content-Type
    let contentType = "application/octet-stream";
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg";
        break;
      case ".png":
        contentType = "image/png";
        break;
      case ".webp":
        contentType = "image/webp";
        break;
      case ".svg":
        contentType = "image/svg+xml";
        break;
      case ".gif":
        contentType = "image/gif";
        break;
    }

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("🔥 [CDN] Error leyendo archivo:", error);
    return NextResponse.json({ error: "Error reading file" }, { status: 500 });
  }
}
