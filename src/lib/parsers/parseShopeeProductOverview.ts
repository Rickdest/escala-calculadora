// Parses Shopee "Product Overview" export (daily shop totals).
// Header row uses PT columns like: Data | Visitantes... | Vendas (Pedido pago) (BRL) | Unidades (Pedido pago) | Compradores (Pedidos pago).

export interface DailyOverviewRow {
  date: string; // ISO YYYY-MM-DD
  dateLabel: string; // DD/MM/YYYY
  visitors: number;
  orders: number;
  units: number;
  revenue: number;
  buyers: number;
}

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

export function isProductOverviewSheet(headers: string[]): boolean {
  const joined = headers.map((h) => String(h || '').toLowerCase()).join('|');
  return joined.includes('data') && joined.includes('vendas (pedido pago)') && joined.includes('visitantes do produto');
}

export async function parseShopeeProductOverview(file: File): Promise<{
  rows: DailyOverviewRow[];
  period_start: string;
  period_end: string;
}> {
  const { read, utils } = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('Planilha vazia');

  const raw: any[][] = utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) throw new Error('Sem dados');

  const headers = (raw[0] as any[]).map((h) => String(h || ''));
  if (!isProductOverviewSheet(headers)) {
    throw new Error('Arquivo não parece ser um Product Overview da Shopee');
  }

  const idx = (needle: string) =>
    headers.findIndex((h) => h.toLowerCase().includes(needle.toLowerCase()));

  const iDate = idx('Data');
  const iVisitors = idx('Visitantes do Produto (Visita)');
  const iOrders = headers.findIndex((h) => /compradores.*pedidos pago/i.test(h));
  const iUnits = headers.findIndex((h) => /unidades.*pedido pago/i.test(h));
  const iRevenue = headers.findIndex((h) => /vendas.*pedido pago.*brl/i.test(h));
  const iBuyers = headers.findIndex((h) => /compradores.*pedidos pago/i.test(h));

  const rows: DailyOverviewRow[] = [];
  for (let r = 1; r < raw.length; r++) {
    const row = raw[r] as any[];
    const dateLabel = String(row[iDate] || '').trim();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateLabel)) continue;
    rows.push({
      dateLabel,
      date: ddmmyyyyToISO(dateLabel),
      visitors: parseInt2(row[iVisitors]),
      orders: parseInt2(row[iOrders]),
      units: parseInt2(row[iUnits]),
      revenue: parseBRL(row[iRevenue]),
      buyers: parseInt2(row[iBuyers]),
    });
  }

  rows.sort((a, b) => a.date.localeCompare(b.date));
  const period_start = rows[0]?.date ?? '';
  const period_end = rows[rows.length - 1]?.date ?? '';

  return { rows, period_start, period_end };
}
