import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { getShopeeFeeForPrice, Product } from '@/types/store';
import { cn } from '@/lib/utils';
import {
  Target, AlertTriangle, TrendingUp, TrendingDown, Upload,
  FileSpreadsheet, Trash2, Eye, Package, Search, DollarSign,
  BarChart3, PieChart, Zap, Percent, Info, Megaphone
} from 'lucide-react';
import {
  Tooltip as ShadTooltip,
  TooltipContent as ShadTooltipContent,
  TooltipProvider as ShadTooltipProvider,
  TooltipTrigger as ShadTooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseShopeeCSV, ShopeeAdsReport, ShopeeAdRow } from '@/lib/shopeeAdsParser';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { TooltipLabel, getTooltipText } from '@/components/roas/TooltipLabel';
import { ProductHealthBanner } from '@/components/roas/ProductHealthBanner';
import { AdsTab } from '@/components/roas/AdsTab';

// ─── Shared Utilities ───

interface RoasResult {
  roasAtual: number | null;
  roasEmpate: number | null;
  roasSaudavel: number | null;
  roasIdeal: number | null;
  lucroBruto: number;
  taxaShopee: number;
  valorRecebido: number;
  margemInsuficiente: boolean;
}

function calcRoasFromValues(precoVenda: number, custoP: number, gastoAds: number, receitaAds: number): RoasResult {
  const fee = getShopeeFeeForPrice(precoVenda);
  const taxaShopee = (precoVenda * fee.percent / 100) + fee.fixed;
  const valorRecebido = precoVenda - taxaShopee;
  const lucroBruto = valorRecebido - custoP;
  if (lucroBruto <= 0) {
    return { roasAtual: null, roasEmpate: null, roasSaudavel: null, roasIdeal: null, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: true };
  }
  const roasEmpate = parseFloat((precoVenda / lucroBruto).toFixed(2));
  const roasSaudavel = parseFloat((roasEmpate / 0.61).toFixed(2));
  const roasIdeal = parseFloat((roasEmpate / 0.40).toFixed(2));
  const roasAtual = gastoAds > 0 ? parseFloat((receitaAds / gastoAds).toFixed(2)) : null;
  return { roasAtual, roasEmpate, roasSaudavel, roasIdeal, lucroBruto, taxaShopee, valorRecebido, margemInsuficiente: false };
}

function getRoasStatus(roasAtual: number, roasEmpate: number, roasSaudavel: number, roasIdeal: number) {
  if (roasAtual < roasEmpate) return 'danger';
  if (roasAtual === roasEmpate) return 'empate';
  if (roasAtual < roasSaudavel) return 'warning';
  if (roasAtual < roasIdeal) return 'medium';
  return 'success';
}

function getRoasMessage(status: string) {
  switch (status) {
    case 'danger': return 'Seus anúncios estão gerando prejuízo. Reduza o gasto ou otimize as palavras-chave.';
    case 'empate': return 'Você está na operação zero. Qualquer otimização já gera lucro.';
    case 'warning': return 'Há lucro, mas ainda pequeno. Otimize o CPC ou o criativo para evoluir.';
    case 'medium': return 'Boa performance. Considere aumentar o orçamento gradualmente.';
    case 'success': return 'Excelente! Campanha muito lucrativa. Escale o investimento com segurança.';
    default: return '';
  }
}

function getRoasInsight(status: string) {
  switch (status) {
    case 'danger': return { emoji: '⚠️', title: 'Prejuízo', desc: 'Seus anúncios estão gerando prejuízo. Reduza o gasto ou otimize as palavras-chave.' };
    case 'empate': return { emoji: '⚖️', title: 'ROAS Empate', desc: 'Você está na operação zero. Qualquer otimização já gera lucro.' };
    case 'warning': return { emoji: '👍', title: 'Lucro Baixo', desc: 'Há lucro, mas ainda pequeno. Otimize o CPC ou o criativo para evoluir.' };
    case 'medium': return { emoji: '📈', title: 'Lucro Médio', desc: 'Boa performance. Considere aumentar o orçamento gradualmente.' };
    case 'success': return { emoji: '🔥', title: 'Lucrativo', desc: 'Excelente! Campanha muito lucrativa. Escale o investimento com segurança.' };
    default: return null;
  }
}

function getRoasEmoji(status: string) {
  switch (status) {
    case 'danger': return '🔴';
    case 'empate': return '🟠';
    case 'warning': return '🟡';
    case 'medium': return '🟢';
    case 'success': return '🟢';
    default: return '';
  }
}

const statusColors: Record<string, string> = { danger: 'text-destructive', empate: 'text-orange-400', warning: 'text-yellow-400', medium: 'text-primary', success: 'text-success' };
const statusBg: Record<string, string> = { danger: 'bg-destructive/10 border-destructive/30', empate: 'bg-orange-400/10 border-orange-400/30', warning: 'bg-warning/10 border-warning/30', medium: 'bg-primary/10 border-primary/30', success: 'bg-success/10 border-success/30' };
const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CHART_COLORS = [
  'hsl(16, 100%, 50%)',
  'hsl(152, 70%, 42%)',
  'hsl(40, 95%, 50%)',
  'hsl(220, 70%, 55%)',
  'hsl(280, 70%, 55%)',
];

// ─── Section Label ───

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-primary" />
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</p>
    </div>
  );
}

      .sort((a, b) => {
        if (a.roasAtual !== null && b.roasAtual !== null) return b.roasAtual - a.roasAtual;
        if (a.roasAtual !== null) return -1;
        if (b.roasAtual !== null) return 1;
        return (a.roasEmpate ?? 999) - (b.roasEmpate ?? 999);
      });
  }, [currentStore]);

  const chartData = useMemo(() => {
    return ranking
      .filter(r => r.roasAtual !== null)
      .slice(0, 8)
      .map(r => ({
        name: r.product.name.length > 12 ? r.product.name.slice(0, 12) + '…' : r.product.name,
        roas: r.roasAtual!,
        empate: r.roasEmpate || 0,
        ideal: r.roasIdeal || 0,
        status: r.status,
      }));
  }, [ranking]);

  if (!currentStore || ranking.length === 0) return null;

  const withAds = ranking.filter(r => r.roasAtual !== null);
  const withoutAds = ranking.filter(r => r.roasAtual === null);

  return (
    <div className="space-y-4">
      <SectionLabel icon={BarChart3}>Ranking de Produtos</SectionLabel>
      <div className="md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0">
        <div className="md:col-span-5">
          {chartData.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 md:sticky md:top-20">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Comparativo de ROAS</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '10px', fontSize: '11px' }} />
                  <Bar dataKey="roas" name="ROAS Atual" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.status === 'danger' ? 'hsl(0, 85%, 60%)' : entry.status === 'warning' ? 'hsl(40, 95%, 50%)' : 'hsl(152, 70%, 42%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="md:col-span-7 space-y-4">
          {withAds.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
                <TrendingUp className="w-3 h-3" /> Com dados de Ads ({withAds.length})
              </p>
              {withAds.map((r, i) => (
                <div key={r.product.id} className="rounded-xl border border-border bg-card p-4 animate-fade-in transition-all duration-200 hover:border-primary/20" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-sm font-extrabold flex-shrink-0',
                      r.status === 'success' ? 'bg-success/15 text-success' : r.status === 'warning' ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive')}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground tabular-nums font-mono">{formatCurrency(r.product.adsCost)}</span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs text-success font-semibold tabular-nums font-mono">{formatCurrency(r.product.adsRevenue)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        {r.status === 'success' ? <TrendingUp className="w-4 h-4 text-success" /> : r.status === 'danger' ? <TrendingDown className="w-4 h-4 text-destructive" /> : <Target className="w-4 h-4 text-warning" />}
                        <span className={cn('font-extrabold text-xl tabular-nums font-mono', statusColors[r.status as keyof typeof statusColors])}>{r.roasAtual!.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                        <span>Emp: <span className="text-warning font-bold font-mono">{r.roasEmpate?.toFixed(1)}</span></span>
                        <span>Ideal: <span className="text-primary font-bold font-mono">{r.roasIdeal?.toFixed(1)}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {withoutAds.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Sem dados de Ads ({withoutAds.length})</p>
              {withoutAds.map(r => (
                <div key={r.product.id} className="rounded-xl border border-border bg-card p-3.5 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 bg-secondary text-muted-foreground">—</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate text-sm">{r.product.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums font-mono">{formatCurrency(r.product.salePrice)}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {r.margemInsuficiente ? (
                        <span className="text-xs font-bold text-destructive">Margem insuficiente</span>
                      ) : (
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          <p>Emp: <span className="text-warning font-bold font-mono">{r.roasEmpate?.toFixed(2)}</span></p>
                          <p>Ideal: <span className="text-primary font-bold font-mono">{r.roasIdeal?.toFixed(2)}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Export ───

export function RoasAnalysis() {
  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <Tabs defaultValue="product" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-11 rounded-full bg-card p-1 border border-border sticky top-0 z-10">
          <TabsTrigger value="product" className="text-[13px] font-bold rounded-full gap-1.5 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
            <Target className="w-4 h-4" />
            ROAS
          </TabsTrigger>
          <TabsTrigger value="ads" className="text-[13px] font-bold rounded-full gap-1.5 transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
            <Megaphone className="w-4 h-4" />
            Shopee Ads
          </TabsTrigger>
        </TabsList>
        <TabsContent value="product" className="mt-4 animate-fade-in">
          <ProductAnalysis />
          <div className="mt-6">
            <RoasRanking />
          </div>
        </TabsContent>
        <TabsContent value="ads" className="mt-4 animate-fade-in">
          <AdsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
