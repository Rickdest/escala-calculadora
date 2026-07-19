import type { ProfitLine, ProfitTotals } from '@/lib/profitAnalysis';

const ACCENT: [number, number, number] = [232, 93, 0];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [217, 119, 6];
const HEAD_BG: [number, number, number] = [24, 24, 27];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtPct = (v: number) => `${(v || 0).toFixed(1).replace('.', ',')}%`;
const fmtDate = (d = new Date()) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function marginColor(m: number): [number, number, number] {
  if (m >= 15) return GREEN;
  if (m >= 5) return AMBER;
  return RED;
}

async function newDoc() {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  return { doc, autoTable };
}

function drawHeader(doc: any, title: string, subtitle: string) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, w, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 40, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(subtitle, 40, 46);
  doc.setFontSize(9);
  doc.text(`Gerado em ${fmtDate()}`, w - 40, 46, { align: 'right' });
  doc.setTextColor(...TEXT);
}

function drawFooter(doc: any) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(230);
    doc.line(40, h - 30, w - 40, h - 30);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('Skalify · Análise de Lucro', 40, h - 15);
    doc.text(`Página ${i} de ${pages}`, w - 40, h - 15, { align: 'right' });
  }
}

function drawKpis(doc: any, y: number, kpis: { label: string; value: string; color?: [number, number, number] }[]) {
  const w = doc.internal.pageSize.getWidth();
  const margin = 40;
  const gap = 8;
  const cols = kpis.length;
  const cardW = (w - margin * 2 - gap * (cols - 1)) / cols;
  const cardH = 52;
  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + gap);
    doc.setDrawColor(230);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, y, cardW, cardH, 4, 4, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k.label, x + 8, y + 14);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(k.color ?? TEXT));
    doc.text(k.value, x + 8, y + 36);
    doc.setFont('helvetica', 'normal');
  });
  return y + cardH + 12;
}

export interface ShopeeProfitPDFParams {
  storeName: string;
  mode: 'timeline' | 'per-sku';
  period: { start: string; end: string };
  lines: ProfitLine[];
  totals: ProfitTotals;
  extras?: { ads?: number; other?: number };
  finalProfit?: number;
  finalMargin?: number;
}

export async function exportShopeeProfitPDF(p: ShopeeProfitPDFParams) {
  const { doc, autoTable } = await newDoc();
  const subtitle = `Loja ${p.storeName}  ·  Shopee  ·  ${p.period.start || '-'} → ${p.period.end || '-'}`;
  drawHeader(doc, 'Relatório de Lucro - Shopee', subtitle);

  const finalP = p.finalProfit ?? p.totals.profit;
  const finalM = p.finalMargin ?? p.totals.margin;

  let y = 80;
  y = drawKpis(doc, y, [
    { label: 'Vendas', value: fmtBRL(p.totals.revenue) },
    { label: 'Custo produtos', value: fmtBRL(p.totals.cost) },
    { label: 'Taxas Shopee', value: fmtBRL(p.totals.fees) },
    { label: 'Impostos', value: fmtBRL(p.totals.taxes) },
    { label: 'Lucro', value: fmtBRL(finalP), color: finalP < 0 ? RED : GREEN },
  ]);

  if (p.extras && ((p.extras.ads ?? 0) > 0 || (p.extras.other ?? 0) > 0)) {
    y = drawKpis(doc, y, [
      { label: 'Anúncios', value: fmtBRL(p.extras.ads ?? 0) },
      { label: 'Outros custos', value: fmtBRL(p.extras.other ?? 0) },
      { label: 'Margem final', value: fmtPct(finalM), color: marginColor(finalM) },
    ]);
  }

  const head =
    p.mode === 'timeline'
      ? [['Período', 'Un.', 'Vendas', 'Custo', 'Taxas', 'Impostos', 'Lucro', 'Margem']]
      : [['Produto', 'Un.', 'Vendas', 'Custo un.', 'Custo total', 'Taxas', 'Impostos', 'Lucro', 'Margem']];

  const body = p.lines.map((l) =>
    p.mode === 'timeline'
      ? [l.label, String(l.units), fmtBRL(l.revenue), fmtBRL(l.cost), fmtBRL(l.fees), fmtBRL(l.taxes), fmtBRL(l.profit), fmtPct(l.margin)]
      : [l.label, String(l.units), fmtBRL(l.revenue), fmtBRL(l.unitCost ?? 0), fmtBRL(l.cost), fmtBRL(l.fees), fmtBRL(l.taxes), fmtBRL(l.profit), fmtPct(l.margin)],
  );

  const foot =
    p.mode === 'timeline'
      ? [['TOTAL', String(p.totals.units), fmtBRL(p.totals.revenue), fmtBRL(p.totals.cost), fmtBRL(p.totals.fees), fmtBRL(p.totals.taxes), fmtBRL(p.totals.profit), fmtPct(p.totals.margin)]]
      : [['TOTAL', String(p.totals.units), fmtBRL(p.totals.revenue), '', fmtBRL(p.totals.cost), fmtBRL(p.totals.fees), fmtBRL(p.totals.taxes), fmtBRL(p.totals.profit), fmtPct(p.totals.margin)]];

  autoTable(doc, {
    startY: y,
    head,
    body,
    foot,
    styles: { fontSize: 8, cellPadding: 4, textColor: TEXT },
    headStyles: { fillColor: HEAD_BG, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [245, 245, 245], textColor: TEXT, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: p.mode === 'timeline'
      ? { 0: { cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } }
      : { 0: { cellWidth: 160 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' }, 8: { halign: 'right' } },
    margin: { left: 40, right: 40 },
  });

  drawFooter(doc);
  const safe = p.storeName.replace(/[^a-z0-9]+/gi, '_');
  doc.save(`lucro_shopee_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export interface MLProfitRow {
  title: string;
  sku: string;
  adId: string;
  adType: string | null;
  unitsSold: number;
  grossSales: number;
  productsCost: number;
  commission: number;
  fixedFees: number;
  freight: number;
  taxes: number;
  otherCosts: number;
  profit: number;
  margin: number;
}

export interface MLProfitPDFParams {
  storeName: string;
  period: { start: string | null; end: string | null };
  rows: MLProfitRow[];
  totals: {
    revenue: number;
    unitsSold: number;
    productsCost: number;
    commission: number;
    fixedFees: number;
    freight: number;
    taxes: number;
    otherCosts: number;
    profit: number;
    margin: number;
  };
}

export async function exportMLProfitPDF(p: MLProfitPDFParams) {
  const { doc, autoTable } = await newDoc();
  const period = `${p.period.start || '-'} → ${p.period.end || '-'}`;
  drawHeader(doc, 'Relatório de Lucro - Mercado Livre', `Loja ${p.storeName}  ·  ${period}`);

  let y = 80;
  y = drawKpis(doc, y, [
    { label: 'Vendas', value: fmtBRL(p.totals.revenue) },
    { label: 'Custo produtos', value: fmtBRL(p.totals.productsCost) },
    { label: 'Comissão + Fixa', value: fmtBRL(p.totals.commission + p.totals.fixedFees) },
    { label: 'Frete + Imposto', value: fmtBRL(p.totals.freight + p.totals.taxes) },
    { label: 'Lucro', value: fmtBRL(p.totals.profit), color: p.totals.profit < 0 ? RED : GREEN },
  ]);
  y = drawKpis(doc, y, [
    { label: 'Unidades', value: String(p.totals.unitsSold) },
    { label: 'Outros custos', value: fmtBRL(p.totals.otherCosts) },
    { label: 'Margem', value: fmtPct(p.totals.margin), color: marginColor(p.totals.margin) },
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Produto', 'Tipo', 'Un.', 'Vendas', 'Custo', 'Comissão', 'Frete', 'Impostos', 'Lucro', 'Margem']],
    body: p.rows.map((r) => [
      r.title,
      r.adType === 'classico' ? 'Clássico' : r.adType === 'premium' ? 'Premium' : '-',
      String(r.unitsSold),
      fmtBRL(r.grossSales),
      fmtBRL(r.productsCost),
      fmtBRL(r.commission + r.fixedFees),
      fmtBRL(r.freight),
      fmtBRL(r.taxes),
      fmtBRL(r.profit),
      fmtPct(r.margin),
    ]),
    foot: [[
      'TOTAL', '',
      String(p.totals.unitsSold),
      fmtBRL(p.totals.revenue),
      fmtBRL(p.totals.productsCost),
      fmtBRL(p.totals.commission + p.totals.fixedFees),
      fmtBRL(p.totals.freight),
      fmtBRL(p.totals.taxes),
      fmtBRL(p.totals.profit),
      fmtPct(p.totals.margin),
    ]],
    styles: { fontSize: 8, cellPadding: 4, textColor: TEXT },
    headStyles: { fillColor: HEAD_BG, textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles: { fillColor: [245, 245, 245], textColor: TEXT, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 45 },
      2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' },
      5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' },
      8: { halign: 'right' }, 9: { halign: 'right' },
    },
    margin: { left: 40, right: 40 },
  });

  drawFooter(doc);
  const safe = p.storeName.replace(/[^a-z0-9]+/gi, '_');
  doc.save(`lucro_ml_${safe}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
