import { NextResponse } from 'next/server';

const BASE = process.env.ESCPOS_PLUGIN_URL || 'http://localhost:8000';

export async function GET() {
  try {
    const res = await fetch(`${BASE}/impresoras`, { method: 'GET' });
    const contentType = res.headers.get('content-type') || 'application/json';
    const text = await res.text();
    return new NextResponse(text, { status: res.status, headers: { 'content-type': contentType } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'ESC/POS proxy error' }, { status: 502 });
  }
}
