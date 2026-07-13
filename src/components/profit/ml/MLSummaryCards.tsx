import { TrendingUp, TrendingDown, ShoppingCart, Wallet, Percent, Package } from 'lucide-react';
import { ProfitKpiCard } from '../ProfitKpiCard';
import { cn } from '@/lib/utils';

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

interface Props {
  t: Totals;
  onChipClick?: (kind: 'loss' | 'unconfigured' | 'profit') => void;
}

export function MLSummaryCards({ t, onChipClick }: Props) {
  const totalCosts = t.productsCost + t.otherCosts;
  const totalFees = t.commission + t.fixedFees;
  const profitTone = t.profit < 0 ? 'destructive' : t.margin >= 15 ? 'success' : t.margin >= 5 ? 'warning' : 'destructive';
  const marginBar = t.margin <= 0 ? 0 : Math.min((t.margin / 30) * 100, 100);
  const ProfitIcon = t.profit >= 0 ? TrendingUp : TrendingDown;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3">
        <ProfitKpiCard
          icon={ShoppingCart}
          label="Vendas brutas"
          value={fmtBRL(t.revenue)}
          sub={`${t.salesCount} pedidos · ${t.unitsSold} un.`}
        />
        <ProfitKpiCard
          icon={Package}
          label="Custos"
          value={fmtBRL(totalCosts)}
          sub={t.revenue > 0 ? `${fmtPct((totalCosts / t.revenue) * 100)} das vendas` : 'sem vendas'}
        />
        <ProfitKpiCard
          icon={Percent}
          label="Comissão + Tarifa"
          value={fmtBRL(totalFees)}
          sub={t.revenue > 0 ? fmtPct((totalFees / t.revenue) * 100) : undefined}
        />
        <ProfitKpiCard
          icon={Wallet}
          label="Frete + Imposto"
          value={fmtBRL(t.freight + t.taxes)}
          sub={`Frete ${fmtBRL(t.freight)} · Imp. ${fmtBRL(t.taxes)}`}
        />
        <ProfitKpiCard
          icon={ProfitIcon}
          label="Lucro líquido"
          value={fmtBRL(t.profit)}
          sub={`Margem ${fmtPct(t.margin)}`}
          tone={profitTone}
          bar={marginBar}
        />
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
  const activeCls =
    color === 'emerald' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
    : color === 'red' ? 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20'
    : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/20';
  const idleCls = 'bg-muted/30 text-text-3 border-border/60';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-full border font-medium transition-colors',
        active ? activeCls : idleCls,
        active && onClick ? 'cursor-pointer' : 'cursor-default',
      )}
      disabled={!active || !onClick}
    >
      {children}
    </button>
  );
}
