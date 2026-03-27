import * as XLSX from 'xlsx';

export interface DailyMetric {
  data: string; // ISO YYYY-MM-DD
  dataLabel: string; // DD/MM
  impressoes: number;
  cliques: number;
  ctr: number;
  compradores: number;
  unidades: number;
  vendasBrl: number;
}

export interface TrafficSource {
  fonte: string;
  pct: number;
  vendasBrl: number;
  compradores: number;
}

export interface ExcelPerformanceData {
  dataRange: { inicio: string; fim: string };
  dadosDiarios: DailyMetric[];
  totalDias: number;
  dataPrimeiraVenda: string | null;
  totais: { impressoes: number; vendasBrl: number; compradores: number };
  fontes: TrafficSource[];
  produtoNome: string;
  shopeeProductId: string;
}

function parseBrNumber(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
  if (!s || s === '-') return 0;
  // Remove % if present
  const cleaned = s.replace('%', '').trim();
  // BR format: 1.234,56 → remove dots, replace comma with dot
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function excelDateToISO(val: unknown): string | null {
  if (val == null) return null;
  // If it's a Date object from SheetJS
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // If it's a serial number
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const mm = String(d.m).padStart(2, '0');
      const dd = String(d.d).padStart(2, '0');
      return `${d.y}-${mm}-${dd}`;
    }
    return null;
  }
  // String DD/MM/YYYY
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return null;
}

function findColumnIndex(headers: unknown[], patterns: string[]): number {
  for (const pattern of patterns) {
    const lower = pattern.toLowerCase();
    const idx = headers.findIndex(h => h != null && String(h).toLowerCase().includes(lower));
    if (idx >= 0) return idx;
  }
  return -1;
}

export function parseShopeeExcel(buffer: ArrayBuffer): ExcelPerformanceData {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Find "Performance do Produto" sheet
  const perfSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('performance'));
  if (!perfSheetName) {
    throw new Error("Planilha 'Performance do Produto' não encontrada. Verifique se o arquivo é um export do Shopee Analytics.");
  }

  const ws = wb.Sheets[perfSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' });

  if (rows.length < 5) throw new Error('Arquivo vazio ou formato inválido.');

  // The first data row (row index 0) is the summary. 
  // Row index 1 is empty.
  // Row index 2 has the daily headers (with "Etiqueta" column added).
  // Daily data starts at row index 3.

  // Find the daily headers row — look for a row that starts with "Data" and has "Etiqueta"
  let dailyHeaderIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const firstCell = String(rows[i]?.[0] ?? '').trim().toLowerCase();
    if (firstCell === 'data') {
      // Check if this is the daily header (has more columns or has Etiqueta)
      const row = rows[i];
      const hasEtiqueta = row?.some(c => String(c ?? '').toLowerCase().includes('etiqueta'));
      if (hasEtiqueta || i > 0) {
        dailyHeaderIdx = i;
        break;
      }
    }
  }

  // If not found with Etiqueta, use the second "Data" header
  if (dailyHeaderIdx === -1) {
    const dataRows = rows.map((r, i) => ({ i, val: String(r?.[0] ?? '').trim().toLowerCase() }))
      .filter(x => x.val === 'data');
    if (dataRows.length >= 2) {
      dailyHeaderIdx = dataRows[1].i;
    } else if (dataRows.length === 1) {
      dailyHeaderIdx = dataRows[0].i;
    } else {
      throw new Error('Cabeçalhos de dados diários não encontrados.');
    }
  }

  const headers = (rows[dailyHeaderIdx] as unknown[]).map(h => String(h ?? ''));

  // Map columns
  const colData = findColumnIndex(headers, ['Data']);
  const colImpressoes = findColumnIndex(headers, ['Impressões de Produto', 'Impressões']);
  const colCliques = findColumnIndex(headers, ['Cliques Por Produto', 'Cliques']);
  const colCTR = findColumnIndex(headers, ['CTR']);
  const colCompradores = findColumnIndex(headers, ['Compradores (Pedidos pago)', 'Compradores (Pedido pago)', 'Compradores']);
  const colUnidades = findColumnIndex(headers, ['Unidades (Pedido pago)', 'Unidades']);
  const colVendas = findColumnIndex(headers, ['Vendas (Pedido pago)', 'Vendas']);

  if (colData === -1 || colImpressoes === -1) {
    throw new Error('Colunas esperadas não encontradas. Verifique se o arquivo é um export do Shopee Analytics.');
  }

  // Extract product info from summary row (row 0)
  const summaryRow = rows[0] as unknown[];
  let produtoNome = '';
  let shopeeProductId = '';

  // Summary headers are in the same positions but without "Etiqueta"
  // Column 1 = Produto, Column 2 = ID do Item
  const summaryHeaders = (rows[0] as unknown[]) || [];
  // Actually row 0 is the summary header, let me check
  // The first row with "Data" as first cell at index 0 is the summary header
  // The actual summary data is right below it... 
  // Looking at the parsed data: row 0 is headers, row 1 is the summary data? No.
  // Actually from the parse: row 5 (0-indexed line 0 in data) = headers, line 1 = summary data
  // Let me re-check: the markdown shows row 0 = summary header (Data|Produto|ID...) 
  // and the next cell after "25/02/2026-26/03/2026" has the product name
  
  // Find the summary data row (between first header and daily header)
  for (let i = 1; i < dailyHeaderIdx; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const firstCell = String(row[0]).trim();
    if (firstCell.includes('-') && firstCell.includes('/')) {
      // This is the summary row with date range
      produtoNome = String(row[1] ?? '').trim();
      shopeeProductId = String(row[2] ?? '').trim();
      break;
    }
  }

  // Parse daily data
  const dadosDiarios: DailyMetric[] = [];
  for (let i = dailyHeaderIdx + 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (!row || !row[colData]) continue;

    const dataISO = excelDateToISO(row[colData]);
    if (!dataISO) continue;

    const [y, m, d] = dataISO.split('-');
    dadosDiarios.push({
      data: dataISO,
      dataLabel: `${d}/${m}`,
      impressoes: parseBrNumber(row[colImpressoes]),
      cliques: parseBrNumber(row[colCliques]),
      ctr: parseBrNumber(row[colCTR]),
      compradores: colCompradores >= 0 ? parseBrNumber(row[colCompradores]) : 0,
      unidades: colUnidades >= 0 ? parseBrNumber(row[colUnidades]) : 0,
      vendasBrl: colVendas >= 0 ? parseBrNumber(row[colVendas]) : 0,
    });
  }

  if (dadosDiarios.length === 0) throw new Error('Nenhum dado diário encontrado no arquivo.');

  // Sort by date
  dadosDiarios.sort((a, b) => a.data.localeCompare(b.data));

  const dataPrimeiraVenda = dadosDiarios.find(d => d.vendasBrl > 0)?.data ?? null;

  // Parse traffic sources from "Pedido Feito" or "Produto Pago" sheet
  const fontes: TrafficSource[] = [];
  const trafficSheetName = wb.SheetNames.find(n => 
    n.toLowerCase().includes('pedido feito') || n.toLowerCase().includes('produto pago')
  );

  // If no separate sheet, try page 2 (index 1)
  const trafficSheet = trafficSheetName 
    ? wb.Sheets[trafficSheetName] 
    : wb.SheetNames[1] ? wb.Sheets[wb.SheetNames[1]] : null;

  if (trafficSheet) {
    const tRows: unknown[][] = XLSX.utils.sheet_to_json(trafficSheet, { header: 1, raw: false });
    
    // Find "Fontes de Tráfego" section under "Card do Produto"
    let fonteHeaderIdx = -1;
    for (let i = 0; i < tRows.length; i++) {
      const first = String(tRows[i]?.[0] ?? '').trim();
      if (first === 'Fontes de Tráfego') {
        fonteHeaderIdx = i;
        break;
      }
    }

    if (fonteHeaderIdx >= 0) {
      // Skip the "Card do Produto" total row (fonteHeaderIdx + 1), start from fonteHeaderIdx + 2
      for (let i = fonteHeaderIdx + 1; i < tRows.length; i++) {
        const row = tRows[i] as unknown[];
        if (!row || !row[0]) break; // Empty row = end of section
        const fonte = String(row[0]).trim();
        if (fonte === 'Card do Produto' || fonte === 'Fontes de Tráfego') continue;
        
        const pct = parseBrNumber(row[1]);
        const vendasBrl = parseBrNumber(row[2]);
        const compradores = parseBrNumber(row[10]); // Compradores column
        
        if (pct > 0) {
          fontes.push({ fonte, pct, vendasBrl, compradores });
        }
      }
    }
  }

  const totais = {
    impressoes: dadosDiarios.reduce((s, d) => s + d.impressoes, 0),
    vendasBrl: dadosDiarios.reduce((s, d) => s + d.vendasBrl, 0),
    compradores: dadosDiarios.reduce((s, d) => s + d.compradores, 0),
  };

  return {
    dataRange: { inicio: dadosDiarios[0].data, fim: dadosDiarios[dadosDiarios.length - 1].data },
    dadosDiarios,
    totalDias: dadosDiarios.length,
    dataPrimeiraVenda,
    totais,
    fontes,
    produtoNome,
    shopeeProductId,
  };
}

export function validateExcelFile(file: File): { valid: boolean; error?: string } {
  if (!file.name.endsWith('.xlsx')) return { valid: false, error: 'Arquivo deve ser .xlsx' };
  if (file.size > 5 * 1024 * 1024) return { valid: false, error: 'Arquivo muito grande (máx 5MB)' };
  return { valid: true };
}
