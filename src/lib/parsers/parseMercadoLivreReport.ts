import { read, utils } from 'xlsx';

export interface MLReportRow {
  adId: string;
  title: string;
  status: string;
  variation: string;
  sku: string;
  uniqueVisits: number;
  salesCount: number;
  uniqueBuyers: number;
  unitsSold: number;
  grossSales: number;
  participationPct: number;
  conversionVisits: number;
  conversionBuyers: number;
}

export interface MLReportParsed {
  rows: MLReportRow[];
  periodStart: string | null;
  periodEnd: string | null;
  fileHash: string;
  grossSalesTotal: number;
}

// Normalize header cell: lowercase, strip accents, strip currency parenthesis "(BRL)", "(R$)", etc.
function norm(s: any): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim()
    .toLowerCase();
}

function toNum(v: any): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  // BR format 1.234,56 / percent "1,23%"
  const cleaned = s
    .replace(/[R$\s%A-Za-z]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

const REQUIRED = ['id do anuncio', 'anuncio', 'sku'];

const HEADER_MAP: Record<keyof MLReportRow, string[]> = {
  adId: ['id do anuncio'],
  title: ['anuncio'],
  status: ['status atual', 'status'],
  variation: ['variacao'],
  sku: ['sku'],
  uniqueVisits: ['visitas unicas'],
  salesCount: ['quantidade de vendas'],
  uniqueBuyers: ['compradores unicos'],
  unitsSold: ['unidades vendidas'],
  grossSales: ['vendas brutas'],
  participationPct: ['% de participacao', 'participacao'],
  conversionVisits: ['conversao de visitas em vendas'],
  conversionBuyers: ['conversao de visitas em compradores'],
};

async function hashBuffer(buf: ArrayBuffer): Promise<string> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 32);
  } catch {
    return String(buf.byteLength);
  }
}

function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = (rows[i] || []).map(norm);
    let matches = 0;
    for (const req of REQUIRED) if (cells.some((c) => c.includes(req))) matches++;
    if (matches >= 2) return i;
  }
  return -1;
}

function extractPeriod(rows: any[][], headerRow: number): { start: string | null; end: string | null } {
  // Search first N rows for something like "01/01/2024" or "de X ate Y"
  const isoRe = /(\d{2})\/(\d{2})\/(\d{4})/g;
  let start: string | null = null;
  let end: string | null = null;
  for (let i = 0; i < headerRow; i++) {
    const line = (rows[i] || []).map((c) => String(c ?? '')).join(' ');
    const found = [...line.matchAll(isoRe)];
    if (found.length >= 1) {
      const [_, d, m, y] = found[0];
      const s = `${y}-${m}-${d}`;
      if (!start) start = s;
      if (found.length >= 2) {
        const [__, d2, m2, y2] = found[1];
        end = `${y2}-${m2}-${d2}`;
      }
    }
  }
  if (start && !end) end = start;
  return { start, end };
}

function buildColumnMap(header: any[]): Partial<Record<keyof MLReportRow, number>> {
  const map: Partial<Record<keyof MLReportRow, number>> = {};
  const normed = header.map(norm);
  for (const key of Object.keys(HEADER_MAP) as Array<keyof MLReportRow>) {
    const candidates = HEADER_MAP[key];
    const idx = normed.findIndex((c) => candidates.some((cand) => c === cand || c.startsWith(cand)));
    if (idx >= 0) map[key] = idx;
  }
  return map;
}

export async function parseMercadoLivreReport(file: File): Promise<MLReportParsed> {
  const buf = await file.arrayBuffer();
  const wb = read(buf);
  const sheetName = wb.SheetNames.find((n) => norm(n).includes('relatorio')) || wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const raw = utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' }) as any[][];

  const headerRow = findHeaderRow(raw);
  if (headerRow < 0) throw new Error('Cabeçalho não encontrado. Verifique se a aba "Relatório" possui as colunas do Mercado Livre.');
  const period = extractPeriod(raw, headerRow);
  const colMap = buildColumnMap(raw[headerRow]);
  if (colMap.adId === undefined || colMap.title === undefined) {
    throw new Error('Colunas obrigatórias (ID do anúncio / Anúncio) não encontradas.');
  }

  const rows: MLReportRow[] = [];
  for (let i = headerRow + 1; i < raw.length; i++) {
    const r = raw[i] || [];
    const adId = String(r[colMap.adId!] ?? '').trim();
    const title = String(r[colMap.title!] ?? '').trim();
    if (!adId && !title) continue;
    // ignore total lines
    if (/total|totais/i.test(title) && !adId) continue;
    const grossSales = toNum(r[colMap.grossSales ?? -1]);
    const unitsSold = toNum(r[colMap.unitsSold ?? -1]);
    if (!adId && grossSales === 0 && unitsSold === 0) continue;

    rows.push({
      adId,
      title,
      status: String(r[colMap.status ?? -1] ?? '').trim(),
      variation: String(r[colMap.variation ?? -1] ?? '').trim(),
      sku: String(r[colMap.sku ?? -1] ?? '').trim(),
      uniqueVisits: toNum(r[colMap.uniqueVisits ?? -1]),
      salesCount: toNum(r[colMap.salesCount ?? -1]),
      uniqueBuyers: toNum(r[colMap.uniqueBuyers ?? -1]),
      unitsSold,
      grossSales,
      participationPct: toNum(r[colMap.participationPct ?? -1]),
      conversionVisits: toNum(r[colMap.conversionVisits ?? -1]),
      conversionBuyers: toNum(r[colMap.conversionBuyers ?? -1]),
    });
  }

  const grossSalesTotal = rows.reduce((a, r) => a + r.grossSales, 0);
  const fileHash = await hashBuffer(buf);
  return { rows, periodStart: period.start, periodEnd: period.end, fileHash, grossSalesTotal };
}
