import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { fmt, fmtShort, getRoasColor } from './adsHelpers';
import { DollarSign, TrendingUp, BarChart3, Eye, MousePointerClick, ShoppingCart, ArrowUpDown, RefreshCw, X, Link2, Clock, Search, Zap, ZapOff, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getClassCor } from './adsHelpers';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Keyword { keyword: string; search_volume: number; suggested_bid: number; quality_score?: number; }
interface HourlyEntry { hour: number; impressions: number; clicks: number; expense: number; gmv: number; orders?: number; }
interface DailyEntry { date: string | null; impressions: number; clicks: number; expense: number; gmv: number; orders: number; roas: number; }
interface CampaignAds {
  campaign_id: number; item_id: number; item_name: string; status: 'active' | 'paused' | 'ended';
  impressions: number; clicks: number; expense: number; gmv: number; direct_gmv: number;
  orders: number; direct_orders: number; avg_position: number | null;
  roas: number; direct_roas: number; acos: number; ctr: number; cost_per_order: number;
  days_active: number; daily: Array<{ date: string; expense: number; gmv: number; roas: number; clicks: number; impressions: number }>;
  keywords?: Keyword[];
}
interface ApiAdsData {
  daily_entries: DailyEntry[]; summary: { total_impressions: number; total_clicks: number; total_expense: number; total_gmv: number; total_orders: number; roas_geral: number; ctr: number; days: number; };
  campaign_details: any[]; ads_by_campaign: CampaignAds[]; total_balance: any; period_start: string; period_end: string;
  hourly_performance?: HourlyEntry[];
  recommended_items?: Array<{ item_id: number; item_name: string }>;
  shop_toggles?: { auto_top_up: boolean; campaign_surge: boolean };
}

function shortDate(d: string | null): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length === 3 && parts[0].length === 2) return `${parts[0]}/${parts[1]}`;
  if (parts.length === 3 && parts[0].length === 4) return `${parts[2]}/${parts[1]}`;
  return d;
}

function MiniSparkline({ data }: { data?: Array<{ roas: number }> }) {
  if (!data || !Array.isArray(data)) return null;
  const last7 = data.slice(-7);
  if (last7.length < 2) return null;
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={last7}>
          <Line type="monotone" dataKey="roas" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HourlyHeatmap({ data }: { data: HourlyEntry[] }) {
  if (!data || data.length === 0) return null;
  const maxClicks = Math.max(...data.map(h => h.clicks), 1);
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Melhores Horários (ontem)</p>
      </div>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 24 }, (_, h) => {
          const entry = data.find(e => e.hour === h);
          const clicks = entry?.clicks || 0;
          const intensity = clicks / maxClicks;
          const orders = entry?.orders || 0;
          return (
            <div key={h} className="text-center" title={`${h}h: ${clicks} cliques, ${orders} pedidos, ${fmt(entry?.expense || 0)} gasto`}>
              <div
                className="w-full aspect-square rounded-md transition-colors"
                style={{
                  backgroundColor: intensity > 0.7
                    ? 'hsl(var(--primary))'
                    : intensity > 0.4
                    ? 'hsl(var(--primary) / 0.5)'
                    : intensity > 0.1
                    ? 'hsl(var(--primary) / 0.2)'
                    : 'hsl(var(--secondary))',
                }}
              />
              <p className="text-[8px] text-muted-foreground mt-0.5">{h}h</p>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary inline-block" /> Baixo</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }} /> Médio</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'hsl(var(--primary) / 0.5)' }} /> Alto</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'hsl(var(--primary))' }} /> Pico</span>
      </div>
    </div>
  );
}

function KeywordsList({ keywords }: { keywords: Keyword[] }) {
  if (!keywords || keywords.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 mb-2">
        <Search className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-bold text-foreground">Palavras-chave Recomendadas</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {keywords.map((kw, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-2.5 py-1.5">
            <span className="text-xs text-foreground truncate flex-1">{kw.keyword}</span>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {kw.search_volume > 0 && (
                <span className="text-[10px] text-muted-foreground">{kw.search_volume.toLocaleString('pt-BR')} buscas</span>
              )}
              {kw.suggested_bid > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{fmt(kw.suggested_bid)}</Badge>
              )}
              {kw.quality_score != null && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">QS {kw.quality_score}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignCard({ campaign, onRefresh, onSelect, isSelected, linkedProduct }: { campaign: CampaignAds; onRefresh?: (itemId: number) => void; onSelect: () => void; isSelected: boolean; linkedProduct?: any }) {
  const profit = campaign.gmv - campaign.expense;
  const roasColor = getRoasColor(campaign.roas);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "rounded-2xl border bg-card p-4 space-y-3 cursor-pointer transition-all",
        isSelected ? "border-primary ring-1 ring-primary/30" : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground truncate">{campaign.item_name}</p>
            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
              campaign.status === 'active' ? 'text-success bg-success/10' :
              campaign.status === 'paused' ? 'text-warning bg-warning/10' :
              'text-muted-foreground bg-muted'
            )}>
              {campaign.status === 'active' ? 'Ativo' : campaign.status === 'paused' ? 'Pausado' : 'Encerrado'}
            </span>
            {linkedProduct && (
              <Badge variant="secondary" className="text-[8px] px-1.5 py-0 gap-0.5 shrink-0 bg-primary/10 text-primary border-primary/20">
                <Link2 className="w-2.5 h-2.5" />
                Vinculado
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Item #{campaign.item_id}{(campaign as any).campaign_ids?.length > 1 ? ` · ${(campaign as any).campaign_ids.length} campanhas` : ` · Campanha #${campaign.campaign_id}`} · {campaign.days_active} dias ativos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MiniSparkline data={campaign.daily || (campaign as any).daily_data} />
          {onRefresh && (
            <button onClick={(e) => { e.stopPropagation(); onRefresh(campaign.item_id); }} className="p-1 rounded-lg hover:bg-secondary transition-colors" title="Atualizar">
              <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">ROAS</p>
          <p className={cn('text-2xl font-black font-mono tabular-nums', roasColor)}>{campaign.roas.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Gasto</p>
          <p className="text-lg font-bold font-mono tabular-nums text-foreground">{fmt(campaign.expense)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Lucro Est.</p>
          <p className={cn('text-lg font-bold font-mono tabular-nums', profit >= 0 ? 'text-success' : 'text-destructive')}>{fmt(profit)}</p>
        </div>
      </div>

      {campaign.keywords && campaign.keywords.length > 0 && (
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <Search className="w-3 h-3" />
          <span>{campaign.keywords.length} palavras-chave</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Receita', value: fmt(campaign.gmv) },
          { label: 'Pedidos', value: String(campaign.orders) },
          { label: 'Cliques', value: campaign.clicks.toLocaleString('pt-BR') },
        ].map(({ label, value }) => (
          <div key={label} className="text-center py-1">
            <p className="text-xs font-bold font-mono tabular-nums text-foreground">{value}</p>
            <p className="text-[8px] text-muted-foreground uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CampaignDetail({ campaign, onClose, onRefresh }: { campaign: CampaignAds; onClose: () => void; onRefresh?: (itemId: number) => void }) {
  const [refreshing, setRefreshing] = useState(false);
  const chartData = useMemo(() =>
    (campaign.daily || (campaign as any).daily_data || []).map((e: any) => ({
      date: shortDate(e.date), Gasto: e.expense, Receita: e.gmv, ROAS: e.roas,
    })), [campaign.daily, (campaign as any).daily_data]
  );

  const profit = campaign.gmv - campaign.expense;
  const roasColor = getRoasColor(campaign.roas);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(campaign.item_id); } finally { setRefreshing(false); }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">{campaign.item_name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">
            Item #{campaign.item_id}{(campaign as any).campaign_ids?.length > 1 ? ` · ${(campaign as any).campaign_ids.length} campanhas` : ` · Campanha #${campaign.campaign_id}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-medium text-primary disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Full metrics grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
        {[
          { label: 'ROAS', value: campaign.roas.toFixed(2), color: roasColor },
          { label: 'ROAS Direto', value: campaign.direct_roas.toFixed(2) },
          { label: 'Gasto', value: fmt(campaign.expense) },
          { label: 'Receita', value: fmt(campaign.gmv) },
          { label: 'GMV Direto', value: fmt(campaign.direct_gmv) },
          { label: 'Lucro Est.', value: fmt(profit), color: profit >= 0 ? 'text-success' : 'text-destructive' },
          { label: 'Pedidos', value: String(campaign.orders) },
          { label: 'Pedidos Diretos', value: String(campaign.direct_orders) },
          { label: 'Cliques', value: campaign.clicks.toLocaleString('pt-BR') },
          { label: 'Impressões', value: campaign.impressions.toLocaleString('pt-BR') },
          { label: 'CTR', value: `${campaign.ctr.toFixed(2)}%` },
          { label: 'ACOS', value: `${campaign.acos.toFixed(1)}%` },
          { label: 'Custo/Pedido', value: campaign.orders > 0 ? fmt(campaign.cost_per_order) : '—' },
          { label: 'Posição Média', value: campaign.avg_position != null ? campaign.avg_position.toFixed(1) : '—' },
          { label: 'Dias Ativos', value: String(campaign.days_active) },
          { label: 'Status', value: campaign.status === 'active' ? 'Ativo' : 'Encerrado' },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center py-2 rounded-lg bg-secondary/50">
            <p className={cn('text-sm font-bold font-mono tabular-nums', color || 'text-foreground')}>{value}</p>
            <p className="text-[8px] text-muted-foreground uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Keywords */}
      <KeywordsList keywords={campaign.keywords || []} />

      {/* Daily chart */}
      {chartData.length > 1 && (
        <div>
          <p className="text-xs font-bold text-foreground mb-2">Performance Diária</p>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="money" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v: number) => fmtShort(v)} />
                <YAxis yAxisId="roas" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(val: number, name: string) => [name === 'ROAS' ? val.toFixed(2) : fmt(val), name]} />
                <Bar yAxisId="money" dataKey="Gasto" fill="hsl(var(--destructive) / 0.3)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="money" dataKey="Receita" fill="hsl(var(--success) / 0.3)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="roas" type="monotone" dataKey="ROAS" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export function ApiAdsDashboard({ data, products = [], onRefreshProduct, onCampaignSelect }: { data: ApiAdsData; products?: any[]; onRefreshProduct?: (itemId: number) => void; onCampaignSelect?: (campaign: CampaignAds) => void }) {
  const { summary, daily_entries = [], campaign_details, ads_by_campaign = [], total_balance, hourly_performance, recommended_items, shop_toggles } = data || {};
  // Support legacy ads_by_product field
  const campaigns: CampaignAds[] = ads_by_campaign.length > 0 ? ads_by_campaign : ((data as any).ads_by_product || []);
  const [sortBy, setSortBy] = useState<string>('roas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'ended'>('all');

  const chartData = useMemo(() =>
    daily_entries.filter(e => e.date).sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(e => ({
      date: shortDate(e.date), Gasto: Math.round(e.expense * 100) / 100, Receita: Math.round(e.gmv * 100) / 100,
      ROAS: e.expense > 0 ? Math.round((e.gmv / e.expense) * 100) / 100 : 0,
    })), [daily_entries]
  );

  const statusCounts = useMemo(() => ({
    all: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    ended: campaigns.filter(c => c.status === 'ended').length,
  }), [campaigns]);

  const sortedCampaigns = useMemo(() => {
    let arr = [...campaigns];
    if (statusFilter !== 'all') arr = arr.filter(c => c.status === statusFilter);
    switch (sortBy) {
      case 'roas': return arr.sort((a, b) => b.roas - a.roas);
      case 'expense': return arr.sort((a, b) => b.expense - a.expense);
      case 'gmv': return arr.sort((a, b) => b.gmv - a.gmv);
      case 'position': return arr.sort((a, b) => (a.avg_position ?? 999) - (b.avg_position ?? 999));
      default: return arr;
    }
  }, [campaigns, sortBy, statusFilter]);

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
      {/* Shop Toggles */}
      {shop_toggles && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={shop_toggles.auto_top_up ? "default" : "secondary"} className="gap-1 text-xs">
            {shop_toggles.auto_top_up ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
            Auto-recarga {shop_toggles.auto_top_up ? 'Ativa' : 'Inativa'}
          </Badge>
          <Badge variant={shop_toggles.campaign_surge ? "default" : "secondary"} className="gap-1 text-xs">
            {shop_toggles.campaign_surge ? <Zap className="w-3 h-3" /> : <ZapOff className="w-3 h-3" />}
            Campaign Surge {shop_toggles.campaign_surge ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      )}

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
                  <div className="h-full rounded-full transition-all duration-500" style={{
                    width: `${roasBarWidth}%`, minWidth: summary.roas_geral > 0 ? '4px' : '0px',
                    backgroundColor: summary.roas_geral >= 5 ? 'hsl(var(--success))' : summary.roas_geral >= 3 ? 'hsl(var(--primary))' : summary.roas_geral >= 1 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))',
                  }} />
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
          <span className="text-sm font-bold font-mono tabular-nums text-foreground">{fmt(Number(balance) / 100000)}</span>
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
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} formatter={(val: number, name: string) => [name === 'ROAS' ? val.toFixed(2) : fmt(val), name]} />
                <Bar yAxisId="money" dataKey="Gasto" fill="hsl(var(--destructive) / 0.3)" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="money" dataKey="Receita" fill="hsl(var(--success) / 0.3)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="roas" type="monotone" dataKey="ROAS" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Hourly Heatmap */}
      <HourlyHeatmap data={hourly_performance || []} />

      {/* Recommended Items */}
      {recommended_items && recommended_items.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-warning" />
            <p className="text-sm font-bold text-foreground">Produtos Recomendados para Ads</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recommended_items.map((item) => (
              <div key={item.item_id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                <span className="text-xs text-foreground truncate">{item.item_name}</span>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-2">#{item.item_id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {campaigns.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-foreground">Produtos ({campaigns.length})</p>
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-7 text-xs w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roas">ROAS</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="gmv">GMV</SelectItem>
                  <SelectItem value="position">Posição</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedCampaigns.map(c => {
              const linked = products.find((p: any) =>
                (p.shopeeItemId || p.shopee_item_id) && c.item_id &&
                String(p.shopeeItemId || p.shopee_item_id) === String(c.item_id)
              );
              return (
                <CampaignCard
                  key={c.campaign_id}
                  campaign={c}
                  onRefresh={onRefreshProduct}
                  onSelect={() => onCampaignSelect?.(c)}
                  isSelected={false}
                  linkedProduct={linked}
                />
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
