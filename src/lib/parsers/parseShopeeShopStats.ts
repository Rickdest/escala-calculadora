// Parses Shopee "Informações Gerenciais" (Shop Stats) export.
// Sheet structure: first sheet is "Pedido Feito" (or "Produto Pago").
// Row 0: headers, Row 1: aggregate period ("08/06/2026-07/07/2026"),
// Row 2: blank, Row 3: headers again, Row 4+: daily rows.

import type { DailyOverviewRow } from './parseShopeeProductOverview';

function parseBRL(val: any): number {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
}
function parseInt2(val: any): number {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  return parseInt(String(val).replace(/\./g, ''), 10) || 0;
}
function ddmmyyyyToISO(s: string): string {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function isShopStatsWorkbook(sheetNames: string[]): boolean {
  const lower = sheetNames.map((s) => s.toLowerCase());
  return lower.some((n) => n.includes('pedido feito') || n.includes('produto pago'));
}

export async function parseShopeeShopStats(file: File): Promise<{
  rows: DailyOverviewRow[];
  period_start: string;
  period_end: string;
}> {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = read(buffer);

  // Prefer "Produto Pago" (paid orders) since profit analysis wants paid revenue
  const sheetName =
    wb.SheetNames.find((n) => n.toLowerCase().includes('produto pago')) ||
    wb.SheetNames.find((n) => n.toLowerCase().includes('pedido feito')) ||
    wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error('Planilha vazia');

  const raw: any[][] = utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 4) throw new Error('Sem dados suficientes');

  // Column indices are stable: Data | Vendas (BRL) | ... | Pedidos | Vendas por Pedido | Cliques | Visitantes ...
  const iDate = 0;
  const iRevenue = 1;
  const iOrders = 3;
  const iVisitors = 6;

  const rows: DailyOverviewRow[] = [];
  for (let r = 0; r < raw.length; r++) {
    const row = raw[r] as any[];
    const dateLabel = String(row[iDate] || '').trim();
    // skip headers, aggregate row (contains "-"), blanks
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateLabel)) continue;
    const revenue = parseBRL(row[iRevenue]);
    const orders = parseInt2(row[iOrders]);
    rows.push({
      dateLabel,
      date: ddmmyyyyToISO(dateLabel),
      visitors: parseInt2(row[iVisitors]),
      orders,
      units: orders, // shop-stats doesn't split units vs orders; use orders as proxy
      revenue,
      buyers: orders,
    });
  }

  if (rows.length === 0) throw new Error('Nenhuma linha diária encontrada');

  rows.sort((a, b) => a.date.localeCompare(b.date));
  return {
    rows,
    period_start: rows[0].date,
    period_end: rows[rows.length - 1].date,
  };
}
