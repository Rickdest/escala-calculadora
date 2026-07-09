import type { ProfitLine, ProfitTotals } from '@/lib/profitAnalysis';

function csvEscape(v: string | number): string {
  const s = String(v ?? '');
  const sanitized = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

function fmt(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');
}

function download(filename: string, content: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportProfitReportCSV(params: {
  storeName: string;
  mode: 'timeline' | 'per-sku';
  period: { start: string; end: string };
  lines: ProfitLine[];
  totals: ProfitTotals;
  extras?: { fees?: number; ads?: number; other?: number };
  finalProfit?: number;
  finalMargin?: number;
}) {
  const { storeName, mode, period, lines, totals, extras, finalProfit, finalMargin } = params;
  const headers = mode === 'timeline'
    ? ['Período', 'Unidades', 'Vendas (R$)', 'Custo produtos (R$)', 'Taxa Shopee (R$)', 'Impostos (R$)', 'Lucro (R$)', 'Margem (%)']
    : ['Produto', 'Unidades', 'Vendas (R$)', 'Custo unit. (R$)', 'Custo total (R$)', 'Taxa Shopee (R$)', 'Impostos (R$)', 'Lucro (R$)', 'Margem (%)'];

  const rows = lines.map((l) => {
    if (mode === 'timeline') {
      return [l.label, l.units, fmt(l.revenue), fmt(l.cost), fmt(l.fees), fmt(l.taxes), fmt(l.profit), fmt(l.margin)];
    }
    return [l.label, l.units, fmt(l.revenue), fmt(l.unitCost ?? 0), fmt(l.cost), fmt(l.fees), fmt(l.taxes), fmt(l.profit), fmt(l.margin)];
  });

  const totalRow = mode === 'timeline'
    ? ['TOTAL', totals.units, fmt(totals.revenue), fmt(totals.cost), fmt(totals.fees), fmt(totals.taxes), fmt(totals.profit), fmt(totals.margin)]
    : ['TOTAL', totals.units, fmt(totals.revenue), '', fmt(totals.cost), fmt(totals.fees), fmt(totals.taxes), fmt(totals.profit), fmt(totals.margin)];

  const csvLines: string[] = [];
  csvLines.push(`"Relatório de Lucro - ${storeName}"`);
  csvLines.push(`"Período: ${period.start} → ${period.end}"`);
  csvLines.push('');
  csvLines.push(headers.map(csvEscape).join(','));
  for (const r of rows) csvLines.push(r.map(csvEscape).join(','));
  csvLines.push(totalRow.map(csvEscape).join(','));

  if (extras && (extras.fees || extras.ads || extras.other)) {
    csvLines.push('');
    csvLines.push('"Custos adicionais"');
    if (extras.fees) csvLines.push(`"Taxas Shopee (manual)",${csvEscape(fmt(extras.fees))}`);
    if (extras.ads) csvLines.push(`"Anúncios",${csvEscape(fmt(extras.ads))}`);
    if (extras.other) csvLines.push(`"Outros",${csvEscape(fmt(extras.other))}`);
  }
  if (typeof finalProfit === 'number') {
    csvLines.push('');
    csvLines.push(`"Lucro final",${csvEscape(fmt(finalProfit))}`);
    if (typeof finalMargin === 'number') csvLines.push(`"Margem final (%)",${csvEscape(fmt(finalMargin))}`);
  }

  const safe = storeName.replace(/[^a-z0-9]+/gi, '_');
  const date = new Date().toISOString().slice(0, 10);
  download(`lucro_${safe}_${date}.csv`, csvLines.join('\n'));
}
