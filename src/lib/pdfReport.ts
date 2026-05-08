import { Product, ProductCalculation, Store } from '@/types/store';

export type PdfReportMode = 'resumido' | 'completo';

interface ExportData {
  product: Product;
  calc: ProductCalculation;
}

const ACCENT: [number, number, number] = [232, 93, 0];      // #e85d00
const GREEN: [number, number, number] = [34, 197, 94];
const YELLOW: [number, number, number] = [234, 179, 8];
const RED: [number, number, number] = [239, 68, 68];
const TEXT: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];
const BG_SOFT: [number, number, number] = [245, 245, 245];

const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;
const fmtDate = (d = new Date()) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function colorForMargin(margin: number, target: number): [number, number, number] {
  if (margin >= target) return GREEN;
  if (margin >= target - 5) return YELLOW;
  return RED;
}

export async function generateProductsPDF(
  data: ExportData[],
  store: Store,
  mode: PdfReportMode = 'completo',
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const items = data.filter((d) => !d.product.draft);
  const target = store.config.desiredMargin || 0;

  const totals = items.reduce(
    (acc, { product, calc }) => {
      acc.revenue += product.salePrice;
      acc.profit += calc.netProfit;
      acc.cost += calc.totalCosts;
      if (calc.realMargin >= target) acc.aboveTarget += 1;
      else acc.belowTarget += 1;
      return acc;
    },
    { revenue: 0, profit: 0, cost: 0, aboveTarget: 0, belowTarget: 0 },
  );

  const weightedMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const sortedByProfit = [...items].sort((a, b) => b.calc.netProfit - a.calc.netProfit);
  const top5Profit = sortedByProfit.slice(0, 5);
  const bottom5 = [...items]
    .filter((x) => x.calc.realMargin < target)
    .sort((a, b) => a.calc.realMargin - b.calc.realMargin)
    .slice(0, 5);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  let y = M;

  // ─── HEADER ───
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Skalify', M, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Relatório ${mode === 'resumido' ? 'Resumido' : 'Completo'}`, pageW - M, 14, {
    align: 'right',
  });
  y = 30;

  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(store.name, M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Gerado em ${fmtDate()} • ${items.length} produtos`, M, y);
  y += 8;

  // ─── EXECUTIVE SUMMARY CARDS ───
  const cardW = (pageW - M * 2 - 6) / 2;
  const cardH = 22;
  const drawCard = (x: number, cy: number, label: string, value: string, color: [number, number, number]) => {
    doc.setFillColor(...BG_SOFT);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(label, x + 4, cy + 6);
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.setFont('helvetica', 'bold');
    doc.text(value, x + 4, cy + 16);
  };

  drawCard(M, y, 'Receita potencial', fmtBRL(totals.revenue), TEXT);
  drawCard(M + cardW + 6, y, 'Lucro total', fmtBRL(totals.profit), totals.profit >= 0 ? GREEN : RED);
  y += cardH + 4;
  drawCard(M, y, 'Margem média ponderada', fmtPct(weightedMargin), colorForMargin(weightedMargin, target));
  drawCard(M + cardW + 6, y, `Meta da loja`, fmtPct(target), ACCENT);
  y += cardH + 4;

  // distribution bar
  const total = totals.aboveTarget + totals.belowTarget || 1;
  const aboveW = (pageW - M * 2) * (totals.aboveTarget / total);
  doc.setFillColor(...BG_SOFT);
  doc.roundedRect(M, y, pageW - M * 2, 14, 2, 2, 'F');
  doc.setFillColor(...GREEN);
  doc.roundedRect(M, y, Math.max(aboveW, 0.1), 14, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  if (aboveW > 30) doc.text(`${totals.aboveTarget} acima da meta`, M + 4, y + 9);
  doc.setTextColor(...TEXT);
  doc.text(`${totals.belowTarget} abaixo`, pageW - M - 4, y + 9, { align: 'right' });
  y += 20;

  // ─── TOP 5 LUCRATIVOS ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text('Top 5 mais lucrativos', M, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    head: [['Produto', 'Venda', 'Lucro', 'Margem']],
    body: top5Profit.map(({ product, calc }) => [
      product.name.length > 50 ? product.name.slice(0, 47) + '…' : product.name,
      fmtBRL(product.salePrice),
      fmtBRL(calc.netProfit),
      fmtPct(calc.realMargin),
    ]),
    theme: 'striped',
    margin: { left: M, right: M },
    headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: TEXT },
    alternateRowStyles: { fillColor: BG_SOFT },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── PROBLEMAS ───
  if (bottom5.length > 0) {
    if (y > pageH - 60) {
      doc.addPage();
      y = M;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...RED);
    doc.text('Atenção: produtos abaixo da meta', M, y);
    y += 2;

    autoTable(doc, {
      startY: y + 2,
      head: [['Produto', 'Venda', 'Lucro', 'Margem']],
      body: bottom5.map(({ product, calc }) => [
        product.name.length > 50 ? product.name.slice(0, 47) + '…' : product.name,
        fmtBRL(product.salePrice),
        fmtBRL(calc.netProfit),
        fmtPct(calc.realMargin),
      ]),
      theme: 'striped',
      margin: { left: M, right: M },
      headStyles: { fillColor: RED, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: TEXT },
      alternateRowStyles: { fillColor: BG_SOFT },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ─── FULL TABLE (modo completo) ───
  if (mode === 'completo' && items.length > 0) {
    doc.addPage();
    y = M;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...TEXT);
    doc.text('Detalhamento por produto', M, y);
    y += 4;

    const allSorted = [...items].sort((a, b) => b.calc.realMargin - a.calc.realMargin);

    autoTable(doc, {
      startY: y + 2,
      head: [['Produto', 'Custo', 'Venda', 'Taxa SP', 'Impostos', 'Lucro', 'Margem', 'Estoque']],
      body: allSorted.map(({ product, calc }) => [
        product.name.length > 38 ? product.name.slice(0, 35) + '…' : product.name,
        fmtBRL(product.costPrice),
        fmtBRL(product.salePrice),
        fmtBRL(calc.totalShopeeFee),
        fmtBRL(calc.taxes),
        fmtBRL(calc.netProfit),
        fmtPct(calc.realMargin),
        String(product.stockQuantity),
      ]),
      theme: 'striped',
      margin: { left: M, right: M },
      headStyles: { fillColor: ACCENT, textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: TEXT },
      alternateRowStyles: { fillColor: BG_SOFT },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right', fontStyle: 'bold' },
        7: { halign: 'right' },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.column.index === 6) {
          const item = allSorted[hookData.row.index];
          if (item) {
            const c = colorForMargin(item.calc.realMargin, target);
            hookData.cell.styles.textColor = c;
          }
        }
        if (hookData.section === 'body' && hookData.column.index === 5) {
          const item = allSorted[hookData.row.index];
          if (item && item.calc.netProfit < 0) {
            hookData.cell.styles.textColor = RED;
          }
        }
      },
    });
  }

  // ─── FOOTER em todas as páginas ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Skalify • página ${i} de ${pageCount} • gerado em ${fmtDate()}`,
      pageW / 2,
      pageH - 6,
      { align: 'center' },
    );
  }

  const safeName = store.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const tag = mode === 'resumido' ? 'resumo' : 'completo';
  doc.save(`${safeName}_${tag}_${new Date().toISOString().split('T')[0]}.pdf`);
}
