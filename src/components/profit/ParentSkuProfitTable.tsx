import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertTriangle, Link2, PenLine, Search, X } from 'lucide-react';
import type { ProductPerformanceRow } from '@/lib/parsers/parseProductPerformanceExcel';
import type { Product } from '@/types/store';
import type { MatchType } from '@/lib/profit/matchProduct';

export type RowLinkMode = 'auto' | 'manual-product' | 'manual-cost' | 'none';

export interface ParentSkuLine {
  row: ProductPerformanceRow;
  productId: string | null;
  matchType: MatchType;
  linkMode: RowLinkMode;
  unitCost: number;
  hasCost: boolean;
}

interface Props {
  lines: ParentSkuLine[];
  products: Product[];
  onLinkProduct: (itemId: string, productId: string) => void;
  onSetManualCost: (itemId: string, unitCost: number) => void;
  onClearLink: (itemId: string) => void;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtPct(v: number) {
  return `${v.toFixed(1).replace('.', ',')}%`;
}

function StatusBadge({ line }: { line: ParentSkuLine }) {
  if (!line.hasCost) {
    return (
      <Badge variant="outline" className="border-red-500/40 text-red-500 gap-1">
        <AlertTriangle className="h-3 w-3" /> Sem custo
      </Badge>
    );
  }
  if (line.linkMode === 'manual-cost') {
    return <Badge className="bg-purple-500/15 text-purple-300 hover:bg-purple-500/15 border-purple-500/30">Custo manual</Badge>;
  }
  if (line.linkMode === 'manual-product' || line.matchType === 'saved') {
    return <Badge className="bg-blue-500/15 text-blue-300 hover:bg-blue-500/15 border-blue-500/30">Vinculado manualmente</Badge>;
  }
  return <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15 border-emerald-500/30">Vinculado auto</Badge>;
}

function ProductPicker({
  products,
  onSelect,
  currentId,
}: {
  products: Product[];
  onSelect: (id: string) => void;
  currentId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = products.find((p) => p.id === currentId);
  const filtered = useMemo(() => {
    const n = q.toLowerCase();
    return products.filter((p) => !n || p.name.toLowerCase().includes(n)).slice(0, 40);
  }, [products, q]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 max-w-full">
          <Link2 className="h-3.5 w-3.5 mr-1" />
          <span className="truncate max-w-[180px] text-left">
            {current ? current.name : 'Vincular…'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto..." className="pl-7 h-8" />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 && <p className="text-caption text-text-3 p-2">Nenhum produto</p>}
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onSelect(p.id);
                setOpen(false);
                setQ('');
              }}
              className="w-full text-left p-2 rounded hover:bg-muted/50 flex justify-between items-center"
            >
              <span className="truncate flex-1 text-caption">{p.name}</span>
              <span className="text-caption text-text-3 ml-2">{fmtBRL(p.costPrice || 0)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ParentSkuProfitTable({ lines, products, onLinkProduct, onSetManualCost, onClearLink }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-caption">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="p-3">Produto (Shopee)</th>
            <th className="p-3">Vínculo</th>
            <th className="p-3 text-right w-24">Unidades</th>
            <th className="p-3 text-right w-28">Vendas</th>
            <th className="p-3 text-right w-32">Custo unit.</th>
            <th className="p-3 text-right w-28">Custo total</th>
            <th className="p-3 text-right w-28">Lucro</th>
            <th className="p-3 text-right w-20">Margem</th>
            <th className="p-3 w-8" />
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const totalCost = l.row.unidades_pagas * l.unitCost;
            const profit = l.row.vendas_pago - totalCost;
            const margin = l.row.vendas_pago > 0 ? (profit / l.row.vendas_pago) * 100 : 0;
            const noCost = !l.hasCost;
            return (
              <tr
                key={l.row.item_id}
                className={`border-t border-border/50 ${noCost ? 'bg-red-500/5' : ''}`}
              >
                <td className="p-3 max-w-[320px]">
                  <div className="font-medium truncate">{l.row.nome}</div>
                  <div className="text-text-3 text-[11px]">
                    ID {l.row.item_id}
                    {l.row.parent_sku && ` · SKU ${l.row.parent_sku}`}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-1 items-start">
                    <StatusBadge line={l} />
                    <div className="flex gap-1">
                      <ProductPicker
                        products={products}
                        currentId={l.productId}
                        onSelect={(id) => onLinkProduct(l.row.item_id, id)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => onSetManualCost(l.row.item_id, l.unitCost || 0)}
                        title="Usar custo manual"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-right">{l.row.unidades_pagas}</td>
                <td className="p-3 text-right">{fmtBRL(l.row.vendas_pago)}</td>
                <td className="p-3 text-right">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.unitCost || ''}
                    readOnly={l.linkMode !== 'manual-cost'}
                    onChange={(e) => onSetManualCost(l.row.item_id, parseFloat(e.target.value) || 0)}
                    className="h-8 text-right w-24 ml-auto"
                    placeholder="0,00"
                  />
                </td>
                <td className="p-3 text-right">{fmtBRL(totalCost)}</td>
                <td className={`p-3 text-right font-semibold ${profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {fmtBRL(profit)}
                </td>
                <td className={`p-3 text-right font-semibold ${margin >= 15 ? 'text-emerald-500' : margin >= 5 ? 'text-amber-500' : 'text-red-500'}`}>
                  {fmtPct(margin)}
                </td>
                <td className="p-3">
                  {(l.productId || l.linkMode === 'manual-cost') && (
                    <Button variant="ghost" size="sm" onClick={() => onClearLink(l.row.item_id)}>
                      <X className="h-3.5 w-3.5 text-text-3" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
          {lines.length === 0 && (
            <tr>
              <td colSpan={9} className="p-6 text-center text-text-3">Sem dados.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
