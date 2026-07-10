import { DollarSign } from 'lucide-react';
import { MLCard } from './MLCard';

interface Totals {
  revenue: number;
  salesCount: number;
  unitsSold: number;
  productsCost: number;
  commission: number;
  fixedFees: number;
  freight: number;
  taxes: number;
  otherCosts: number;
  profit: number;
  margin: number;
  profitCount: number;
  lossCount: number;
  unconfiguredCount: number;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtPct(v: number) {
  return `${v.toFixed(1).replace('.', ',')}%`;
}

function Cell({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <MLCard className="p-3">
      <div className="flex items-center gap-2 text-caption text-text-3">
        <DollarSign className="h-3 w-3" /> {label}
      </div>
      <div className={`text-h3 font-semibold mt-1 ${valueClass ?? ''}`}>{value}</div>
      {sub && <div className="text-caption text-text-3">{sub}</div>}
    </MLCard>
  );
}

export function MLSummaryCards({ t }: { t: Totals }) {
  const marginColor = t.margin >= 15 ? 'text-emerald-500' : t.margin >= 5 ? 'text-amber-500' : 'text-red-500';
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <Cell label="Vendas brutas" value={fmtBRL(t.revenue)} />
      <Cell label="Vendas" value={String(t.salesCount)} sub={`${t.unitsSold} un.`} />
      <Cell label="Custo produtos" value={fmtBRL(t.productsCost)} />
      <Cell label="Comissão ML" value={fmtBRL(t.commission)} />
      <Cell label="Tarifa fixa" value={fmtBRL(t.fixedFees)} />
      <Cell label="Frete + Imposto" value={fmtBRL(t.freight + t.taxes)} sub={`Frete ${fmtBRL(t.freight)} · Imp ${fmtBRL(t.taxes)}`} />
      <Cell label="Lucro líquido" value={fmtBRL(t.profit)} sub={fmtPct(t.margin)} valueClass={marginColor} />
      <Cell label="Com lucro" value={String(t.profitCount)} />
      <Cell label="Com prejuízo" value={String(t.lossCount)} valueClass={t.lossCount > 0 ? 'text-red-500' : ''} />
      <Cell label="Não configurados" value={String(t.unconfiguredCount)} valueClass={t.unconfiguredCount > 0 ? 'text-amber-500' : ''} />
    </div>
  );
}
