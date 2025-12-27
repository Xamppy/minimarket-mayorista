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

  console.log("📂 Intentando servir archivo desde:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ Archivo no encontrado:", filePath);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    // Mapeo simple de Content-Type
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
    console.error("🔥 Error leyendo archivo:", error);
    return NextResponse.json({ error: "Error reading file" }, { status: 500 });
  }
}
