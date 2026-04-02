import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { fmt, fmtShort, getRoasColor } from './adsHelpers';
import { DollarSign, TrendingUp, BarChart3, Eye, MousePointerClick, ShoppingCart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart, Bar } from 'recharts';

interface DailyEntry {
  date: string | null;
  impressions: number;
  clicks: number;
  expense: number;
  gmv: number;
  orders: number;
  roas: number;
}

interface CampaignDetail {
  campaign_id: number;
  item_id: number | null;
  ad_name: string;
  status: number | null;
}

interface ApiAdsData {
  daily_entries: DailyEntry[];
  summary: {
    total_impressions: number;
    total_clicks: number;
    total_expense: number;
    total_gmv: number;
    total_orders: number;
    roas_geral: number;
    ctr: number;
    days: number;
  };
  campaign_details: CampaignDetail[];
  total_balance: any;
  period_start: string;
  period_end: string;
}

/** Parse DD-MM-YYYY to short label */
function shortDate(d: string | null): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3 && parts[0].length === 2) return `${parts[0]}/${parts[1]}`;
  // YYYY-MM-DD
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}`;
  return d;
}

const statusLabel = (s: number | null) => {
  if (s === 1) return { text: 'Ativo', cls: 'text-success bg-success/10' };
  if (s === 2) return { text: 'Pausado', cls: 'text-warning bg-warning/10' };
  return { text: 'Desconhecido', cls: 'text-muted-foreground bg-muted' };
};

export function ApiAdsDashboard({ data }: { data: ApiAdsData }) {
  const { summary, daily_entries, campaign_details, total_balance } = data;

  const chartData = useMemo(() =>
    daily_entries
      .filter(e => e.date)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .map(e => ({
        date: shortDate(e.date),
        Gasto: Math.round(e.expense * 100) / 100,
        Receita: Math.round(e.gmv * 100) / 100,
        ROAS: e.expense > 0 ? Math.round((e.gmv / e.expense) * 100) / 100 : 0,
      })),
    [daily_entries]
  );

  const balance = total_balance?.total_balance ?? total_balance?.balance ?? null;

  const kpis = [
    { label: 'GASTO TOTAL', value: fmt(summary.total_expense), icon: BarChart3, color: 'text-foreground', iconColor: 'text-warning/30' },
    { label: 'RECEITA (GMV)', value: fmt(summary.total_gmv), icon: DollarSign, color: 'text-foreground', iconColor: 'text-primary/30' },
    { label: 'ROAS GERAL', value: summary.roas_geral.toFixed(2), icon: TrendingUp, color: getRoasColor(summary.roas_geral), iconColor: summary.roas_geral >= 3 ? 'text-success/30' : 'text-warning/30' },
    { label: 'LUCRO EST.', value: fmt(summary.total_gmv - summary.total_expense), icon: DollarSign, color: summary.total_gmv - summary.total_expense >= 0 ? 'text-success' : 'text-destructive', iconColor: summary.total_gmv - summary.total_expense >= 0 ? 'text-success/30' : 'text-destructive/30' },
  ];

  const secondaryKpis = [
    { label: 'Impressões', value: summary.total_impressions.toLocaleString('pt-BR'), icon: Eye },
    { label: 'Cliques', value: summary.total_clicks.toLocaleString('pt-BR'), icon: MousePointerClick },
    { label: 'Pedidos', value: summary.total_orders.toLocaleString('pt-BR'), icon: ShoppingCart },
    { label: 'CTR', value: `${summary.ctr.toFixed(2)}%`, icon: TrendingUp },
  ];

  const roasBarWidth = Math.min((summary.roas_geral / 10) * 100, 100);

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {kpis.map(({ label, value, icon: Icon, color, iconColor }, idx) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-3 md:p-5 min-w-0 overflow-hidden relative">
            <Icon className={cn('absolute top-3 right-3 w-7 h-7 md:w-9 md:h-9', iconColor)} />
            <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn('text-xl md:text-3xl font-black font-mono tabular-nums mt-1 truncate', color)}>{value}</p>
            {idx === 2 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-success inline-block shrink-0" />
                  <span>Meta 3.0</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${roasBarWidth}%`,
                      minWidth: summary.roas_geral > 0 ? '4px' : '0px',
                      backgroundColor: summary.roas_geral >= 5 ? 'hsl(var(--success))' : summary.roas_geral >= 3 ? 'hsl(var(--primary))' : summary.roas_geral >= 1 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-4 gap-2">
        {secondaryKpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-2.5 text-center">
            <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm md:text-base font-bold font-mono tabular-nums text-foreground">{value}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Balance */}
      {balance !== null && (
        <div className="rounded-xl border border-border bg-card p-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Saldo de Ads</span>
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
            {fmt(Number(balance) / 100000)}
          </span>
        </div>
      )}

      {/* Daily Chart */}
      {chartData.length > 1 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground mb-3">Gasto vs Receita por Dia</p>
          <div className="h-[220px] md:h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="money" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => fmtShort(v)} />
                <YAxis yAxisId="roas" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  formatter={(val: number, name: string) => [name === 'ROAS' ? val.toFixed(2) : fmt(val), name]}
                />
                <Bar yAxisId="money" dataKey="Gasto" fill="hsl(var(--destructive) / 0.3)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="money" dataKey="Receita" fill="hsl(var(--success) / 0.3)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="roas" type="monotone" dataKey="ROAS" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Campaign List */}
      {campaign_details.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-bold text-foreground mb-3">
            Campanhas ({campaign_details.length})
          </p>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {campaign_details.map((c, i) => {
              const st = statusLabel(c.status);
              return (
                <div key={c.campaign_id || i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">
                      {c.ad_name || `Campanha ${c.campaign_id}`}
                    </p>
                    {c.item_id && (
                      <p className="text-[10px] text-muted-foreground font-mono">Item #{c.item_id}</p>
                    )}
                  </div>
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', st.cls)}>
                    {st.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center">
        Período: {data.period_start} a {data.period_end} · {summary.days} dias
      </p>
    </div>
  );
}
