import { TrendingUp, ShoppingCart, Package, Percent, Wallet } from 'lucide-react';
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

function Cell({
  icon: Icon, label, value, sub, valueClass,
}: {
  icon: any; label: string; value: string; sub?: string; valueClass?: string;
}) {
  return (
    <MLCard className="p-4">
      <div className="flex items-center gap-2 text-caption text-text-3">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className={`text-h3 font-semibold mt-1 ${valueClass ?? ''}`}>{value}</div>
      {sub && <div className="text-caption text-text-3 mt-0.5">{sub}</div>}
    </MLCard>
  );
}

interface Props {
  t: Totals;
  onChipClick?: (kind: 'loss' | 'unconfigured' | 'profit') => void;
}

export function MLSummaryCards({ t, onChipClick }: Props) {
  const marginColor = t.margin >= 15 ? 'text-emerald-500' : t.margin >= 5 ? 'text-amber-500' : 'text-red-500';
  const totalCosts = t.productsCost + t.otherCosts;
  const totalFees = t.commission + t.fixedFees;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Cell icon={ShoppingCart} label="Vendas brutas" value={fmtBRL(t.revenue)} sub={`${t.salesCount} pedidos · ${t.unitsSold} un.`} />
        <Cell icon={Package} label="Custos produtos" value={fmtBRL(totalCosts)} sub={t.revenue > 0 ? fmtPct((totalCosts / t.revenue) * 100) : undefined} />
        <Cell icon={Percent} label="Comissão + Tarifa" value={fmtBRL(totalFees)} sub={t.revenue > 0 ? fmtPct((totalFees / t.revenue) * 100) : undefined} />
        <Cell icon={Wallet} label="Frete + Imposto" value={fmtBRL(t.freight + t.taxes)} sub={`Frete ${fmtBRL(t.freight)}`} />
        <Cell icon={TrendingUp} label="Lucro líquido" value={fmtBRL(t.profit)} sub={fmtPct(t.margin)} valueClass={marginColor} />
      </div>
      <div className="flex flex-wrap gap-2 text-caption">
        <Chip color="emerald" active={t.profitCount > 0} onClick={() => onChipClick?.('profit')}>
          {t.profitCount} com lucro
        </Chip>
        <Chip color="red" active={t.lossCount > 0} onClick={() => onChipClick?.('loss')}>
          {t.lossCount} com prejuízo
        </Chip>
        <Chip color="amber" active={t.unconfiguredCount > 0} onClick={() => onChipClick?.('unconfigured')}>
          {t.unconfiguredCount} não configurados
        </Chip>
      </div>
    </div>
  );
}

function Chip({
  children, color, active, onClick,
}: {
  children: React.ReactNode;
  color: 'emerald' | 'red' | 'amber';
  active: boolean;
  onClick?: () => void;
}) {
  const cls = active
    ? color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : color === 'red' ? 'bg-red-500/15 text-red-400 border-red-500/30'
    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-muted/40 text-text-3 border-border';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border transition-colors ${cls} ${onClick && active ? 'hover:opacity-80 cursor-pointer' : ''}`}
      disabled={!active || !onClick}
    >
      {children}
    </button>
  );
}
