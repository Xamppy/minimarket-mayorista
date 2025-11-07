import type { ThermalTicketData, ThermalTicketItem } from '../types/thermal-print';

export type EscposAlign = 'left' | 'center' | 'right';
export type EscposFont = 'A' | 'B';

interface EscposOperation {
  accion: string;
  datos: string;
}

interface EscposOptions {
  pluginUrl?: string;
  printerName?: string;
  silent?: boolean;
}

// Use same-origin proxy by default to avoid CORS; allow override via env
const DEFAULT_PLUGIN_URL = process.env.NEXT_PUBLIC_ESCPOS_PLUGIN_URL || '/api/escpos';

async function http<T>(url: string, body?: any, method: 'GET' | 'POST' | 'PUT' = 'POST'): Promise<T> {
  const res = await fetch(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ESC/POS request failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function setPrinter(printerName: string, pluginUrl: string, silent: boolean) {
  const endpoint = silent ? '/impresora_silencioso' : '/impresora';
  const url = `${pluginUrl}${endpoint}`;
  const result = await http<string>(url, printerName, 'PUT');
  if (result !== printerName) throw new Error('No se pudo seleccionar la impresora');
}

function op(accion: string, datos: string = ''): EscposOperation {
  return { accion, datos };
}

function align(align: EscposAlign): EscposOperation {
  return op('align', align);
}

function write(text: string): EscposOperation {
  return op('write', text);
}

function feed(n: number): EscposOperation {
  return op('feed', String(n));
}

function cut(): EscposOperation {
  return op('cut', '');
}

function cutPartial(): EscposOperation {
  return op('cutpartial', '');
}

function emphasize(n: number): EscposOperation {
  return op('emphasize', String(n));
}

function setFont(font: EscposFont): EscposOperation {
  return op('font', font);
}

function setFontSize(w: number, h: number): EscposOperation {
  return op('fontsize', `${w},${h}`);
}

function price(n: number): string {
  return `$${n.toFixed(2)}`;
}

function padRight(text: string, len: number): string {
  if (text.length >= len) return text;
  return text + ' '.repeat(len - text.length);
}

function formatItemLine(item: ThermalTicketItem): string {
  const left = `${item.quantity_sold} x ${price(item.price_at_sale)}`;
  const right = price(item.quantity_sold * item.price_at_sale);
  const width = 32;
  const leftFixed = padRight(left, Math.max(0, width - right.length));
  return `${leftFixed}${right}`;
}

function sanitize(text: string | null | undefined): string {
  return (text ?? '').toString();
}

export function buildOperationsFromTicket(ticket: ThermalTicketData): EscposOperation[] {
  const ops: EscposOperation[] = [];

  ops.push(align('center'));
  ops.push(emphasize(1));
  ops.push(setFont('A'));
  ops.push(setFontSize(1, 1));
  ops.push(write('MINIMARKET DON ALE'));
  ops.push(emphasize(0));
  ops.push(feed(1));

  ops.push(align('left'));
  ops.push(write(`Ticket: ${ticket.id}`));
  if (ticket.formattedDate) ops.push(write(`Fecha: ${ticket.formattedDate}`));
  if (ticket.formattedTime) ops.push(write(`Hora: ${ticket.formattedTime}`));
  ops.push(write(`Vendedor: ${sanitize(ticket.seller_email)}`));
  if (ticket.itemCount != null) ops.push(write(`Items: ${ticket.itemCount}`));
  ops.push(feed(1));

  ops.push(write('PRODUCTOS VENDIDOS'));
  ops.push(write('------------------------------'));

  for (const item of ticket.sale_items) {
    const name = sanitize(item.product_name);
    ops.push(write(name));
    const brand = sanitize(item.brand_name);
    if (brand) ops.push(write(`Marca: ${brand}`));
    if (item.barcode) ops.push(write(`Código: ${sanitize(item.barcode)}`));
    ops.push(write(formatItemLine(item)));
    ops.push(write(`Formato: ${sanitize(item.sale_format)}`));
    ops.push(feed(1));
  }

  ops.push(write('------------------------------'));
  ops.push(emphasize(1));
  ops.push(write(`TOTAL: ${price(ticket.total_amount)}`));
  ops.push(emphasize(0));
  ops.push(feed(2));

  ops.push(align('center'));
  ops.push(write('¡Gracias por su compra!'));
  ops.push(feed(2));
  ops.push(cutPartial());

  return ops;
}

export function buildPreviewTextFromTicket(ticket: ThermalTicketData): string {
  const lines: string[] = [];
  const width = 32;
  const sep = '-'.repeat(width);

  const center = (t: string) => {
    if (t.length >= width) return t;
    const pad = Math.floor((width - t.length) / 2);
    return ' '.repeat(pad) + t;
  };

  lines.push(center('MINIMARKET DON ALE'));
  lines.push(center('Ticket de Venta'));
  lines.push(sep);

  lines.push(`Ticket: ${ticket.id}`);
  if (ticket.formattedDate) lines.push(`Fecha: ${ticket.formattedDate}`);
  if (ticket.formattedTime) lines.push(`Hora: ${ticket.formattedTime}`);
  lines.push(`Vendedor: ${sanitize(ticket.seller_email)}`);
  if (ticket.itemCount != null) lines.push(`Items: ${ticket.itemCount}`);

  lines.push(sep);
  lines.push('PRODUCTOS VENDIDOS');

  for (const item of ticket.sale_items) {
    const name = sanitize(item.product_name);
    lines.push(name);
    const brand = sanitize(item.brand_name);
    if (brand) lines.push(`Marca: ${brand}`);
    if (item.barcode) lines.push(`Código: ${sanitize(item.barcode)}`);
    lines.push(formatItemLine(item));
    lines.push(`Formato: ${sanitize(item.sale_format)}`);
    lines.push('');
  }

  lines.push(sep);
  const totalText = `TOTAL: ${price(ticket.total_amount)}`;
  const right = totalText;
  const leftFixed = padRight('', Math.max(0, width - right.length));
  lines.push(leftFixed + right);

  lines.push('');
  lines.push(center('¡Gracias por su compra!'));

  return lines.map(l => (l.length > width ? l.slice(0, width) : l)).join('\n');
}

export async function printThermalTicketEscpos(ticket: ThermalTicketData, options: EscposOptions = {}) {
  const pluginUrl = options.pluginUrl || DEFAULT_PLUGIN_URL;
  const ops = buildOperationsFromTicket(ticket);

  if (options.printerName) {
    await setPrinter(options.printerName, pluginUrl, Boolean(options.silent));
  }

  const url = `${pluginUrl}/imprimir`;
  const result = await http<any>(url, ops, 'POST');
  return result;
}
