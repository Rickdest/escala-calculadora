import { MLCard } from './MLCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Edit3, Link2Off } from 'lucide-react';
import { MLCalcResult } from '@/lib/profit/mercadoLivreCalc';
import { MLProductRecord } from '@/hooks/useMLProducts';
import { SortableTh } from '../SortableTh';
import { useTableSort } from '../useTableSort';

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
  product: MLProductRecord | null;
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

function statusStripe(r: MLRowView): string {
  if (r.calc.situation.includes('inactive')) return 'bg-muted';
  if (r.calc.profit < 0) return 'bg-red-500';
  if (r.calc.margin >= 15) return 'bg-emerald-500';
  if (r.calc.margin >= 5) return 'bg-amber-500';
  return 'bg-red-500';
}

type Key = 'product' | 'units' | 'revenue' | 'cost' | 'commission' | 'profit' | 'margin';

export function MLProductTable({ rows, onEdit, onQuickPatch, onUnlink }: Props) {
  const { sort, toggle, sorted } = useTableSort<MLRowView, Key>(rows, {
    product: (r) => r.imported.title.toLowerCase(),
    units: (r) => r.imported.unitsSold,
    revenue: (r) => r.imported.grossSales,
    cost: (r) => r.calc.productsCost,
    commission: (r) => r.calc.commission,
    profit: (r) => r.calc.profit,
    margin: (r) => r.calc.margin,
  }, { key: 'revenue', dir: 'desc' });

  const th = (key: Key, label: string, align: 'left' | 'right' = 'right') => (
    <SortableTh active={sort.key === key} dir={sort.dir} onClick={() => toggle(key)} align={align}>
      {label}
    </SortableTh>
  );

  return (
    <MLCard className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-caption">
          <thead className="bg-muted/40 sticky top-0 z-10">
            <tr className="whitespace-nowrap">
              <th className="w-1 p-0" aria-hidden />
              {th('product', 'Produto', 'left')}
              <th className="p-3 text-left text-text-3">Tipo</th>
              {th('units', 'Un.')}
              {th('revenue', 'Vendas brutas')}
              {th('cost', 'Custo un.')}
              {th('commission', 'Comissão')}
              {th('profit', 'Lucro')}
              {th('margin', 'Margem')}
              <th className="p-3 w-20 text-right text-text-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-text-3">
                  Nenhum anúncio. Importe um relatório para começar.
                </td>
              </tr>
            )}
            {sorted.map((r) => {
              const p = r.product;
              const inactive = r.calc.situation.includes('inactive');
              const profitCls = r.calc.profit >= 0 ? 'text-emerald-500' : 'text-red-500';
              const marginCls = r.calc.margin >= 15 ? 'text-emerald-500' : r.calc.margin >= 5 ? 'text-amber-500' : 'text-red-500';
              const noCost = (p?.cost_price ?? 0) === 0;
              return (
                <tr
                  key={r.key}
                  className={`border-t border-border/40 hover:bg-muted/20 transition-colors ${inactive ? 'opacity-60' : ''}`}
                >
                  <td className={`w-1 p-0 ${statusStripe(r)}`} aria-hidden />
                  <td className="p-3 max-w-[280px]">
                    <div className="font-medium truncate">{r.imported.title || '—'}</div>
                    <div className="text-text-3 text-[11px] truncate">
                      {r.imported.sku ? `SKU ${r.imported.sku} · ` : ''}{r.imported.adId}
                    </div>
                    {noCost && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-red-400">
                        <AlertTriangle className="h-3 w-3" /> Sem custo
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <Select
                      value={p?.ad_type ?? 'none'}
                      onValueChange={(v) => onQuickPatch(r, { ad_type: v === 'none' ? null : (v as any) })}
                    >
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="classico">Clássico</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">{r.imported.unitsSold}</td>
                  <td className="p-3 text-right font-medium">{fmtBRL(r.imported.grossSales)}</td>
                  <td className="p-3 text-right">
                    <Input
                      type="number"
                      step="0.01"
                      value={p?.cost_price ?? ''}
                      onChange={(e) => onQuickPatch(r, { cost_price: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })}
                      className={`h-8 w-24 text-right ml-auto ${noCost ? 'border-red-500/40' : ''}`}
                      placeholder="0,00"
                    />
                  </td>
                  <td className="p-3 text-right text-text-2">{fmtBRL(r.calc.commission)}</td>
                  <td className={`p-3 text-right font-semibold ${profitCls}`}>{fmtBRL(r.calc.profit)}</td>
                  <td className={`p-3 text-right font-semibold ${marginCls}`}>{fmtPct(r.calc.margin)}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-0.5 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => onEdit(r)} title="Editar detalhes">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {p?.id && (
                        <Button size="sm" variant="ghost" onClick={() => onUnlink(r)} title="Desvincular">
                          <Link2Off className="h-4 w-4 text-text-3" />
                        </Button>
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
