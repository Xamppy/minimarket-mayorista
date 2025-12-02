import { NextResponse } from 'next/server';

const BASE = process.env.ESCPOS_PLUGIN_URL || 'http://localhost:8000';

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(BASE, { method: 'GET', signal: controller.signal });
    const text = await res.text().catch(() => '');
    return NextResponse.json({
      ok: true,
      reachable: true,
      base: BASE,
      status: res.status,
      statusText: res.statusText,
      sample: text.slice(0, 200)
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      reachable: false,
      base: BASE,
      error: err?.message || 'fetch failed'
    }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
