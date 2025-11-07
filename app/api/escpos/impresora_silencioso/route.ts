import { NextResponse } from 'next/server';

const BASE = process.env.ESCPOS_PLUGIN_URL || 'http://localhost:8000';

export async function PUT(req: Request) {
  try {
    const bodyText = await req.text();
    const res = await fetch(`${BASE}/impresora_silencioso`, {
      method: 'PUT',
      headers: {
        'Content-Type': req.headers.get('content-type') || 'text/plain',
      },
      body: bodyText,
    });

    const contentType = res.headers.get('content-type') || 'text/plain';
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': contentType } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'ESC/POS proxy error' }, { status: 502 });
  }
}
