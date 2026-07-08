import { getShopeeFeeForPrice, StoreConfig } from '@/types/store';

export interface ProfitLine {
  key: string;
  label: string;
  units: number;
  revenue: number;
  fees: number;
  taxes: number;
  cost: number;
  profit: number;
  margin: number;
  // per-row cost input (used in per-SKU mode)
  unitCost?: number;
  itemId?: string;
  linked?: boolean;
}

export interface ProfitTotals {
  revenue: number;
  fees: number;
  taxes: number;
  cost: number;
  profit: number;
  margin: number;
  units: number;
}

/**
 * Estimate Shopee fee for a given line by using the average unit price
 * to lookup the correct fee tier, then multiply by units for the fixed portion.
 */
export function estimateShopeeFee(revenue: number, units: number): number {
  if (revenue <= 0) return 0;
  const avgPrice = units > 0 ? revenue / units : revenue;
  const tier = getShopeeFeeForPrice(avgPrice);
  const percentPart = revenue * (tier.percent / 100);
  const fixedPart = tier.fixed * Math.max(units, 1);
  return percentPart + fixedPart;
}

export function calcLine(params: {
  key: string;
  label: string;
  revenue: number;
  units: number;
  cost: number;
  taxRate: number; // percent, e.g. 6 for 6%
  itemId?: string;
  unitCost?: number;
  linked?: boolean;
}): ProfitLine {
  const { revenue, units, cost, taxRate } = params;
  const fees = estimateShopeeFee(revenue, units);
  const taxes = revenue * (taxRate / 100);
  const profit = revenue - fees - taxes - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return {
    key: params.key,
    label: params.label,
    units,
    revenue,
    fees,
    taxes,
    cost,
    profit,
    margin,
    itemId: params.itemId,
    unitCost: params.unitCost,
    linked: params.linked,
  };
}

export function sumLines(lines: ProfitLine[]): ProfitTotals {
  const t: ProfitTotals = { revenue: 0, fees: 0, taxes: 0, cost: 0, profit: 0, margin: 0, units: 0 };
  for (const l of lines) {
    t.revenue += l.revenue;
    t.fees += l.fees;
    t.taxes += l.taxes;
    t.cost += l.cost;
    t.profit += l.profit;
    t.units += l.units;
  }
  t.margin = t.revenue > 0 ? (t.profit / t.revenue) * 100 : 0;
  return t;
}

export function groupDaily<T extends { date: string }>(
  rows: T[],
  granularity: 'day' | 'week' | 'month',
): Array<{ key: string; label: string; items: T[] }> {
  if (granularity === 'day') {
    return rows.map((r) => ({ key: r.date, label: formatDate(r.date), items: [r] }));
  }
  const groups = new Map<string, { key: string; label: string; items: T[] }>();
  for (const r of rows) {
    const d = new Date(r.date + 'T00:00:00');
    let key = '';
    let label = '';
    if (granularity === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } else {
      // week starting Monday
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diff);
      key = monday.toISOString().slice(0, 10);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      label = `${formatDate(monday.toISOString().slice(0, 10))} - ${formatDate(sunday.toISOString().slice(0, 10))}`;
    }
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key)!.items.push(r);
  }
  return Array.from(groups.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function getStoreTaxRate(config: StoreConfig | undefined): number {
  return config?.taxes ?? 0;
}
