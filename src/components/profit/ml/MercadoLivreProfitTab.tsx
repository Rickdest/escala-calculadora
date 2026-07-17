import { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Download } from 'lucide-react';
import { exportMLProfitPDF } from '@/lib/profit/exportProfitPDF';
import { toast } from 'sonner';
import { useMLProducts, MLProductRecord } from '@/hooks/useMLProducts';
import { useMLFeeConfig } from '@/hooks/useMLFeeConfig';
import { useMLImportHistory } from '@/hooks/useMLImportHistory';
import { calcMercadoLivre, MLProductRow } from '@/lib/profit/mercadoLivreCalc';
import { MLProductTable, MLRowView } from './MLProductTable';
import { MLProductEditDrawer } from './MLProductEditDrawer';
import { MLFeeConfigCard } from './MLFeeConfigCard';
import { MLSummaryCards } from './MLSummaryCards';
import { MLFilters, DEFAULT_ML_FILTERS, MLTableFilters } from './MLFilters';
import { MLHistoryList } from './MLHistoryList';
import { MLImportCard } from './MLImportCard';
import { MLCard } from './MLCard';
import { MLReportRow, parseMercadoLivreReport, MLReportParsed } from '@/lib/parsers/parseMercadoLivreReport';

const LS_KEY = (storeId: string) => `ml-profit:last:${storeId}`;

interface Props {
  storeId?: string;
  storeName?: string;
  defaultTaxPct?: number;
}

function toProductRow(rec: MLProductRecord | null, imp: MLReportRow): MLProductRow {
  return {
    id: rec?.id,
    ad_id: rec?.ad_id ?? imp.adId,
    sku: rec?.sku ?? imp.sku,
    name: rec?.name ?? imp.title,
    variation: rec?.variation ?? imp.variation,
    status: rec?.status ?? imp.status,
    ad_type: rec?.ad_type ?? null,
    sale_price: rec?.sale_price ?? null,
    cost_price: rec?.cost_price ?? null,
    packaging_cost: rec?.packaging_cost ?? 0,
    additional_cost: rec?.additional_cost ?? 0,
    freight_cost: rec?.freight_cost ?? 0,
    freight_mode: rec?.freight_mode ?? 'none',
    tax_value: rec?.tax_value ?? 0,
    tax_mode: rec?.tax_mode ?? 'default',
    notes: rec?.notes ?? null,
    linked_manually: rec?.linked_manually ?? false,
  };
}

function matchRecord(imp: MLReportRow, records: MLProductRecord[]): MLProductRecord | null {
  const sku = (imp.sku || '').trim().toLowerCase();
  if (sku) {
    const bySku = records.find((r) => (r.sku || '').trim().toLowerCase() === sku);
    if (bySku) return bySku;
  }
  const adId = (imp.adId || '').trim();
  if (adId) {
    const byId = records.find((r) => (r.ad_id || '').trim() === adId);
    if (byId) return byId;
  }
  return null;
}

export function MercadoLivreProfitTab({ storeId, storeName, defaultTaxPct = 0 }: Props) {
  const { products, upsert, update, unlink } = useMLProducts(storeId);
  const { effective: feeConfig } = useMLFeeConfig(storeId);
  const { items: history, insert: insertHistory, findDuplicate, remove: removeHistory } = useMLImportHistory(storeId);

  const [imported, setImported] = useState<MLReportRow[]>([]);
  const [period, setPeriod] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [filters, setFilters] = useState<MLTableFilters>(DEFAULT_ML_FILTERS);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<MLProductRecord | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!storeId) return;
    try {
      const raw = localStorage.getItem(LS_KEY(storeId));
      if (raw) {
        const s = JSON.parse(raw);
        setImported(s.imported || []);
        setPeriod(s.period || { start: null, end: null });
      }
    } catch { /* ignore */ }
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    try {
      localStorage.setItem(LS_KEY(storeId), JSON.stringify({ imported, period }));
    } catch { /* quota */ }
  }, [storeId, imported, period]);

  const rows: MLRowView[] = useMemo(() => {
    return imported.map((imp) => {
      const rec = matchRecord(imp, products);
      const prodRow = toProductRow(rec, imp);
      const calc = calcMercadoLivre(
        prodRow,
        { unitsSold: imp.unitsSold, salesCount: imp.salesCount, grossSales: imp.grossSales },
        feeConfig,
        defaultTaxPct,
      );
      return {
        key: `${imp.sku || ''}|${imp.adId}`,
        imported: {
          adId: imp.adId,
          title: imp.title,
          sku: imp.sku,
          variation: imp.variation,
          status: imp.status,
          unitsSold: imp.unitsSold,
          salesCount: imp.salesCount,
          grossSales: imp.grossSales,
        },
        product: rec,
        calc,
      };
    });
  }, [imported, products, feeConfig, defaultTaxPct]);

  const filteredRows = useMemo(() => {
    const filtered = rows.filter((r) => {
      const q = filters.search.trim().toLowerCase();
      if (q) {
        const hay = `${r.imported.title} ${r.imported.sku} ${r.imported.adId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const inactive = r.calc.situation.includes('inactive');
      if (filters.status === 'active' && inactive) return false;
      if (filters.status === 'inactive' && !inactive) return false;
      if (filters.adType !== 'all') {
        if (filters.adType === 'none' && r.product?.ad_type) return false;
        if (filters.adType !== 'none' && r.product?.ad_type !== filters.adType) return false;
      }
      if (filters.outcome === 'profit' && r.calc.profit < 0) return false;
      if (filters.outcome === 'loss' && r.calc.profit >= 0) return false;
      const configured = r.product && r.product.ad_type && (r.product.cost_price ?? 0) > 0;
      if (filters.configured === 'yes' && !configured) return false;
      if (filters.configured === 'no' && configured) return false;
      return true;
    });
    if (filters.sortBy === 'default') return filtered;
    const acc: Record<string, (r: MLRowView) => number> = {
      revenue: (r) => r.imported.grossSales,
      profit: (r) => r.calc.profit,
      margin: (r) => r.calc.margin,
      units: (r) => r.imported.unitsSold,
      cost: (r) => r.calc.productsCost,
    };
    const fn = acc[filters.sortBy];
    if (!fn) return filtered;
    const factor = filters.sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => (fn(a) - fn(b)) * factor);
  }, [rows, filters]);

  const totals = useMemo(() => {
    const t = {
      revenue: 0, salesCount: 0, unitsSold: 0, productsCost: 0,
      commission: 0, fixedFees: 0, freight: 0, taxes: 0, otherCosts: 0,
      profit: 0, margin: 0, profitCount: 0, lossCount: 0, unconfiguredCount: 0,
    };
    for (const r of filteredRows) {
      t.revenue += r.calc.revenue;
      t.salesCount += r.imported.salesCount;
      t.unitsSold += r.imported.unitsSold;
      t.productsCost += r.calc.productsCost;
      t.commission += r.calc.commission;
      t.fixedFees += r.calc.fixedFeeTotal;
      t.freight += r.calc.freight;
      t.taxes += r.calc.taxes;
      t.otherCosts += r.calc.otherCosts + r.calc.packagingTotal + r.calc.additionalTotal;
      t.profit += r.calc.profit;
      if (r.calc.profit > 0) t.profitCount++;
      if (r.calc.profit < 0) t.lossCount++;
      if (!r.product?.ad_type || (r.product?.cost_price ?? 0) === 0) t.unconfiguredCount++;
    }
    t.margin = t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0;
    return t;
  }, [filteredRows]);

  const handleParsed = async (parsed: MLReportParsed, file: File) => {
    const dup = findDuplicate({
      file_hash: parsed.fileHash,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
      ads_count: parsed.rows.length,
      gross_sales_total: parsed.grossSalesTotal,
    });
    if (dup) {
      toast.warning('Relatório já importado anteriormente — reexibindo dados.');
    }
    setImported(parsed.rows);
    setPeriod({ start: parsed.periodStart, end: parsed.periodEnd });

    let linked = 0, unlinked = 0;
    for (const imp of parsed.rows) {
      try {
        const rec = matchRecord(imp, products);
        await upsert({
          id: rec?.id,
          ad_id: imp.adId || rec?.ad_id || null,
          sku: imp.sku || rec?.sku || null,
          name: rec?.name ?? imp.title,
          variation: rec?.variation ?? imp.variation,
          status: imp.status || rec?.status || null,
        });
        if (rec) linked++; else unlinked++;
      } catch { /* ignore per-row */ }
    }
    if (!dup) {
      await insertHistory({
        file_name: file.name,
        file_hash: parsed.fileHash,
        period_start: parsed.periodStart,
        period_end: parsed.periodEnd,
        ads_count: parsed.rows.length,
        linked_count: linked,
        unlinked_count: unlinked,
        gross_sales_total: parsed.grossSalesTotal,
        raw_rows: parsed.rows,
      });
    }
  };

  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const parsed = await parseMercadoLivreReport(file);
      await handleParsed(parsed, file);
      toast.success('Relatório carregado', { description: `${parsed.rows.length} anúncios` });
    } catch (e: any) {
      toast.error('Falha ao importar', { description: e?.message || 'Arquivo inválido' });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleQuickPatch = async (row: MLRowView, patch: Partial<MLProductRecord>) => {
    try {
      if (row.product?.id) {
        await update(row.product.id, patch);
      } else {
        await upsert({
          ad_id: row.imported.adId || null,
          sku: row.imported.sku || null,
          name: row.imported.title,
          variation: row.imported.variation,
          status: row.imported.status,
          ...patch,
        });
      }
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    }
  };

  const handleEditSave = async (patch: Partial<MLProductRecord>) => {
    try {
      if (editing?.id) await update(editing.id, patch);
      else await upsert(patch as any);
      toast.success('Configurações salvas');
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    }
  };

  const handleViewHistory = (h: any) => {
    if (Array.isArray(h.raw_rows)) {
      setImported(h.raw_rows);
      setPeriod({ start: h.period_start, end: h.period_end });
    }
  };

  const handleChip = (kind: 'loss' | 'unconfigured' | 'profit') => {
    if (kind === 'loss') setFilters({ ...filters, outcome: 'loss' });
    if (kind === 'profit') setFilters({ ...filters, outcome: 'profit' });
    if (kind === 'unconfigured') setFilters({ ...filters, configured: 'no' });
  };

  const periodChip = period.start && period.end ? `${period.start} → ${period.end}` : null;

  const handleExportPDF = async () => {
    await exportMLProfitPDF({
      storeName: storeName || 'Loja',
      period,
      rows: filteredRows.map((r) => ({
        title: r.imported.title,
        sku: r.imported.sku,
        adId: r.imported.adId,
        adType: r.product?.ad_type ?? null,
        unitsSold: r.imported.unitsSold,
        grossSales: r.imported.grossSales,
        productsCost: r.calc.productsCost,
        commission: r.calc.commission,
        fixedFees: r.calc.fixedFeeTotal,
        freight: r.calc.freight,
        taxes: r.calc.taxes,
        otherCosts: r.calc.otherCosts + r.calc.packagingTotal + r.calc.additionalTotal,
        profit: r.calc.profit,
        margin: r.calc.margin,
      })),
      totals: {
        revenue: totals.revenue,
        unitsSold: totals.unitsSold,
        productsCost: totals.productsCost,
        commission: totals.commission,
        fixedFees: totals.fixedFees,
        freight: totals.freight,
        taxes: totals.taxes,
        otherCosts: totals.otherCosts,
        profit: totals.profit,
        margin: totals.margin,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Sticky action header */}
      <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-body font-semibold tracking-tight">Mercado Livre</p>
              {periodChip && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-text-2 tabular-nums">
                  {periodChip}
                </span>
              )}
              {imported.length > 0 && (
                <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-text-2 tabular-nums">
                  {imported.length} anúncios
                </span>
              )}
            </div>
            <p className="text-caption text-text-3 truncate mt-0.5">
              {imported.length > 0
                ? 'Custos, taxas e imposto aplicados automaticamente sobre o relatório.'
                : 'Importe um relatório para começar.'}
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredRows.length === 0}>
              <Download className="mr-2 h-4 w-4" /> PDF
            </Button>
            <Button onClick={() => fileRef.current?.click()} disabled={importing} size="sm">
              {importing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
              Importar relatório
            </Button>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <MLSummaryCards t={totals} onChipClick={handleChip} />

      {imported.length === 0 ? (
        <MLImportCard onParsed={handleParsed} />
      ) : (
        <>
          {/* Produtos */}
          <div className="space-y-3">
            <MLFilters value={filters} onChange={setFilters} />
            <MLProductTable
              rows={filteredRows}
              onEdit={(r) => { setEditing(r.product); setEditOpen(true); }}
              onQuickPatch={handleQuickPatch}
              onUnlink={async (r) => { if (r.product?.id) { await unlink(r.product.id); toast.success('Produto desvinculado'); } }}
            />
          </div>

          {/* Importar novo relatório */}
          <MLImportCard onParsed={handleParsed} />
        </>
      )}

      {/* Configuração de taxas */}
      <MLFeeConfigCard storeId={storeId} />

      {/* Histórico */}
      <MLHistoryList items={history} onView={handleViewHistory} onRemove={removeHistory} />


      <MLProductEditDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        product={editing}
        onSave={handleEditSave}
        onUnlink={async (id) => { await unlink(id); setEditOpen(false); toast.success('Desvinculado'); }}
      />
    </div>
  );
}
