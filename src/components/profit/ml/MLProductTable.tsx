import { MLCard } from './MLCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, CheckCircle2, Circle, Edit3, Link2Off } from 'lucide-react';
import { MLCalcResult, MLSituation, situationLabel } from '@/lib/profit/mercadoLivreCalc';
import { MLProductRecord } from '@/hooks/useMLProducts';

export interface MLRowView {
  key: string;
  imported: {
    adId: string;
    title: string;
    sku: string;
    variation: string;
    status: string;
    unitsSold: number;
    salesCount: number;
    grossSales: number;
  };
  product: MLProductRecord | null; // saved config
  calc: MLCalcResult;
}

interface Props {
  rows: MLRowView[];
  onEdit: (row: MLRowView) => void;
  onQuickPatch: (row: MLRowView, patch: Partial<MLProductRecord>) => void;
  onUnlink: (row: MLRowView) => void;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtPct(v: number) {
  return `${v.toFixed(1).replace('.', ',')}%`;
}

function situationBadges(sits: MLSituation[]) {
  return sits.slice(0, 2).map((s) => {
    const info = situationLabel(s);
    const tone = info.tone;
    const cls =
      tone === 'ok' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
      : tone === 'warn' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
      : tone === 'err' ? 'bg-red-500/15 text-red-500 border-red-500/30'
      : 'bg-muted/40 text-text-3 border-border';
    const Icon = tone === 'ok' ? CheckCircle2 : tone === 'muted' ? Circle : AlertTriangle;
    return (
      <span key={s} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${cls}`}>
        <Icon className="h-3 w-3" />
        {info.label}
      </span>
    );
  });
}

export function MLProductTable({ rows, onEdit, onQuickPatch, onUnlink }: Props) {
  return (
    <MLCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-caption">
          <thead className="bg-muted/40 sticky top-0">
            <tr className="text-left whitespace-nowrap">
              <th className="p-2">Produto</th>
              <th className="p-2">SKU / ID</th>
              <th className="p-2">Tipo</th>
              <th className="p-2 text-right">Vendas</th>
              <th className="p-2 text-right">Un.</th>
              <th className="p-2 text-right">Vendas brutas</th>
              <th className="p-2 text-right">Preço médio</th>
              <th className="p-2 text-right">Custo un.</th>
              <th className="p-2 text-right">Custo total</th>
              <th className="p-2 text-right">Embalagem</th>
              <th className="p-2 text-right">Frete</th>
              <th className="p-2 text-right">Taxa %</th>
              <th className="p-2 text-right">Comissão</th>
              <th className="p-2 text-right">Tarifa fixa</th>
              <th className="p-2 text-right">Imposto</th>
              <th className="p-2 text-right">Lucro</th>
              <th className="p-2 text-right">Lucro/un.</th>
              <th className="p-2 text-right">Margem</th>
              <th className="p-2">Situação</th>
              <th className="p-2 w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={20} className="p-6 text-center text-text-3">Nenhum anúncio. Importe um relatório para começar.</td></tr>
            )}
            {rows.map((r) => {
              const p = r.product;
              const inactive = r.calc.situation.includes('inactive');
              const profitCls = r.calc.profit >= 0 ? 'text-emerald-500' : 'text-red-500';
              const marginCls = r.calc.margin >= 15 ? 'text-emerald-500' : r.calc.margin >= 5 ? 'text-amber-500' : 'text-red-500';
              return (
                <tr key={r.key} className={`border-t border-border/40 ${inactive ? 'opacity-60' : ''}`}>
                  <td className="p-2 max-w-[240px]">
                    <div className="font-medium truncate">{r.imported.title || '—'}</div>
                    {r.imported.variation && <div className="text-text-3 text-[11px] truncate">{r.imported.variation}</div>}
                    {r.imported.status && <div className="text-text-3 text-[11px]">Status: {r.imported.status}</div>}
                  </td>
                  <td className="p-2 text-[11px] text-text-3 whitespace-nowrap">
                    <div>{r.imported.sku || '—'}</div>
                    <div>{r.imported.adId}</div>
                  </td>
                  <td className="p-2">
                    <Select
                      value={p?.ad_type ?? 'none'}
                      onValueChange={(v) => onQuickPatch(r, { ad_type: v === 'none' ? null : (v as any) })}
                    >
                      <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="classico">Clássico</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right">{r.imported.salesCount}</td>
                  <td className="p-2 text-right">{r.imported.unitsSold}</td>
                  <td className="p-2 text-right">{fmtBRL(r.imported.grossSales)}</td>
                  <td className="p-2 text-right">{fmtBRL(r.calc.avgPrice)}</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={p?.cost_price ?? ''}
                      onChange={(e) => onQuickPatch(r, { cost_price: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })}
                      className="h-7 w-24 text-right"
                      placeholder="0,00"
                    />
                  </td>
                  <td className="p-2 text-right">{fmtBRL(r.calc.productsCost)}</td>
                  <td className="p-2 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={p?.packaging_cost ?? ''}
                      onChange={(e) => onQuickPatch(r, { packaging_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                      className="h-7 w-20 text-right"
                    />
                  </td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <div className="flex flex-col gap-1 items-end">
                      <Input
                        type="number"
                        step="0.01"
                        value={p?.freight_cost ?? ''}
                        onChange={(e) => onQuickPatch(r, { freight_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                        className="h-7 w-20 text-right"
                      />
                      <Select
                        value={p?.freight_mode ?? 'none'}
                        onValueChange={(v) => onQuickPatch(r, { freight_mode: v as any })}
                      >
                        <SelectTrigger className="h-6 w-24 text-[10px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem frete</SelectItem>
                          <SelectItem value="per_unit">Por un.</SelectItem>
                          <SelectItem value="per_sale">Por venda</SelectItem>
                          <SelectItem value="total_manual">Total</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </td>
                  <td className="p-2 text-right">{fmtPct(r.calc.commissionPct)}</td>
                  <td className="p-2 text-right">{fmtBRL(r.calc.commission)}</td>
                  <td className="p-2 text-right">{fmtBRL(r.calc.fixedFeeTotal)}</td>
                  <td className="p-2 text-right">{fmtBRL(r.calc.taxes)}</td>
                  <td className={`p-2 text-right font-semibold ${profitCls}`}>{fmtBRL(r.calc.profit)}</td>
                  <td className={`p-2 text-right ${profitCls}`}>{fmtBRL(r.calc.profitPerUnit)}</td>
                  <td className={`p-2 text-right font-semibold ${marginCls}`}>{fmtPct(r.calc.margin)}</td>
                  <td className="p-2"><div className="flex flex-col gap-1 items-start">{situationBadges(r.calc.situation)}</div></td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Edit3 className="h-4 w-4" /></Button>
                      {p?.id && (
                        <Button size="sm" variant="ghost" onClick={() => onUnlink(r)}><Link2Off className="h-4 w-4 text-text-3" /></Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MLCard>
  );
}
