import { useState, useRef, useMemo } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { cn } from '@/lib/utils';
import {
  FileSpreadsheet, Upload, TrendingUp, TrendingDown, AlertTriangle, XCircle,
  ChevronDown, ChevronUp, Link2, RefreshCw, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseShopeeCSV, ShopeeAdsReport, ShopeeAdRow } from '@/lib/shopeeAdsParser';
import { toast } from 'sonner';
import { getShopeeFeeForPrice, Product } from '@/types/store';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function getRoasColor(roas: number) {
  if (roas >= 5) return 'text-success';
  if (roas >= 2) return 'text-warning';
  return 'text-destructive';
}

function getAcosColor(acos: number) {
  if (acos <= 20) return 'text-success';
  if (acos <= 40) return 'text-warning';
  return 'text-destructive';
}

function getRoiColor(roi: number) {
  if (roi > 100) return 'text-success';
  if (roi >= 0) return 'text-warning';
  return 'text-destructive';
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Alert types ───

type AlertType = 'noreturn' | 'pause' | 'optimize' | 'scale';

interface AdAlert {
  type: AlertType;
  ad: ShopeeAdRow;
}

function generateAlerts(ads: ShopeeAdRow[]): AdAlert[] {
  const alerts: AdAlert[] = [];
  for (const ad of ads) {
    if (ad.spend > 0 && ad.roas === 0) {
      alerts.push({ type: 'noreturn', ad });
    } else if (ad.roas > 0 && ad.roas < 2) {
      alerts.push({ type: 'pause', ad });
    } else if (ad.roas >= 2 && ad.roas < 5) {
      alerts.push({ type: 'optimize', ad });
    } else if (ad.roas >= 5 && ad.acos <= 20) {
      alerts.push({ type: 'scale', ad });
    }
  }
  const order: Record<AlertType, number> = { noreturn: 0, pause: 1, optimize: 2, scale: 3 };
  alerts.sort((a, b) => order[a.type] - order[b.type]);
  return alerts;
}

const alertConfig: Record<AlertType, { icon: React.ElementType; iconColor: string; rec: string; metricLabel: (ad: ShopeeAdRow) => string }> = {
  noreturn: { icon: XCircle, iconColor: 'text-destructive', rec: 'Pausar imediatamente', metricLabel: (ad) => `R$${ad.spend.toFixed(0)} s/ venda` },
  pause: { icon: TrendingDown, iconColor: 'text-destructive', rec: 'Consumindo sua margem — considere pausar', metricLabel: (ad) => `ROAS ${ad.roas.toFixed(2)}` },
  optimize: { icon: AlertTriangle, iconColor: 'text-warning', rec: 'Monitore antes de escalar', metricLabel: (ad) => `ROAS ${ad.roas.toFixed(2)}` },
  scale: { icon: TrendingUp, iconColor: 'text-success', rec: 'Performance excelente — aumente o orçamento', metricLabel: (ad) => `ROAS ${ad.roas.toFixed(2)}` },
};

// ─── Empty State ───

function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
        <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground">Importe seu relatório de Ads</p>
        <p className="text-[13px] text-muted-foreground max-w-[280px]">
          Exporte "Dados Gerais de Anúncios" no painel da Shopee e importe aqui
        </p>
      </div>
      <Button onClick={onImport} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
        <Upload className="w-4 h-4" />
        Importar CSV
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Shopee Ads → Exportar dados → Dados Gerais de Anúncios
      </p>
    </div>
  );
}

// ─── Summary Cards ───

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] border border-border bg-surface-2 px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={cn('text-lg font-extrabold tabular-nums font-mono mt-0.5 leading-tight', color)}>{value}</p>
    </div>
  );
}

function SummarySection({ report }: { report: ShopeeAdsReport }) {
  const { totals } = report;
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">RESUMO</p>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="INVESTIDO" value={formatCurrency(totals.totalSpend)} color="text-foreground" />
        <MetricCard label="RETORNO LÍQUIDO" value={formatCurrency(totals.totalLiquidReturn)} color={totals.totalLiquidReturn >= 0 ? 'text-success' : 'text-destructive'} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricCard label="ROAS" value={totals.avgRoas.toFixed(2)} color={getRoasColor(totals.avgRoas)} />
        <MetricCard label="ACOS" value={`${totals.avgAcos.toFixed(1)}%`} color={getAcosColor(totals.avgAcos)} />
        <MetricCard label="ROI" value={`${totals.avgRoi.toFixed(0)}%`} color={getRoiColor(totals.avgRoi)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="GMV TOTAL" value={formatCurrency(totals.totalGmv)} color="text-foreground" />
        <MetricCard label="VENDIDOS" value={`${totals.totalItemsSold} itens`} color="text-foreground" />
      </div>
    </div>
  );
}

// ─── Alerts Section ───

function AlertsSection({ ads }: { ads: ShopeeAdRow[] }) {
  const alerts = useMemo(() => generateAlerts(ads), [ads]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">ALERTAS</p>
      <div className="rounded-xl border border-border bg-surface-2 divide-y divide-border overflow-hidden">
        {alerts.map((alert, i) => {
          const cfg = alertConfig[alert.type];
          const Icon = cfg.icon;
          const isOpen = expandedIdx === i;
          return (
            <div key={i}>
              <button
                onClick={() => setExpandedIdx(isOpen ? null : i)}
                className="w-full h-12 flex items-center gap-3 px-3 text-left hover:bg-card/50 transition-colors"
              >
                <Icon className={cn('w-4 h-4 flex-shrink-0', cfg.iconColor)} />
                <span className="text-[13px] font-semibold text-foreground truncate flex-1">{truncate(alert.ad.adName, 28)}</span>
                <span className={cn('text-xs font-bold font-mono tabular-nums flex-shrink-0', cfg.iconColor)}>
                  {cfg.metricLabel(alert.ad)}
                </span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-2.5 pl-10">
                  <p className="text-[11px] text-muted-foreground">{cfg.rec}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Ranking Section ───

function RoasBar({ roas }: { roas: number }) {
  const maxRoas = Math.max(10, roas * 1.3);
  const empate = 2;
  const ideal = 5;
  const pos = Math.min((roas / maxRoas) * 100, 100);
  const empatePos = (empate / maxRoas) * 100;
  const idealPos = (ideal / maxRoas) * 100;

  return (
    <div className="space-y-1">
      <div className="relative w-full h-1.5 rounded-full overflow-hidden">
        <div className="absolute inset-0 rounded-full" style={{
          background: `linear-gradient(to right, hsl(0 85% 60%) 0%, hsl(45 95% 50%) ${empatePos}%, hsl(152 70% 42%) ${idealPos}%, hsl(152 70% 42%) 100%)`,
          opacity: 0.25,
        }} />
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pos}%`,
            backgroundColor: roas >= 5 ? 'hsl(152, 70%, 42%)' : roas >= 2 ? 'hsl(45, 95%, 50%)' : 'hsl(0, 85%, 60%)',
          }}
        />
      </div>
      <div className="flex items-center gap-2 text-[9px] text-muted-foreground font-bold">
        <span>0</span>
        <span className="flex-1" />
        <span className="text-warning">Empate {empate}</span>
        <span className="text-success">Ideal {ideal}</span>
        <span className={cn('font-mono', getRoasColor(roas))}>{roas.toFixed(2)}</span>
      </div>
    </div>
  );
}

function getRoasStatusIcon(roas: number) {
  if (roas >= 5) return { icon: TrendingUp, color: 'text-success' };
  if (roas >= 2) return { icon: AlertTriangle, color: 'text-warning' };
  return { icon: TrendingDown, color: 'text-destructive' };
}

function RankingSection({ ads }: { ads: ShopeeAdRow[] }) {
  const sorted = useMemo(() => [...ads].sort((a, b) => b.roas - a.roas), [ads]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">RANKING</p>
      <div className="rounded-xl border border-border bg-surface-2 divide-y divide-border overflow-hidden">
        {sorted.map((ad, i) => {
          const isOpen = expandedIndex === i;
          const statusIcon = getRoasStatusIcon(ad.roas);
          const StatusIcon = statusIcon.icon;

          return (
            <div key={i}>
              <button
                onClick={() => setExpandedIndex(isOpen ? null : i)}
                className="w-full p-2.5 md:p-3.5 flex items-center gap-2 text-left hover:bg-card/50 transition-colors"
              >
                <span className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold font-mono flex-shrink-0 bg-surface-2 border border-border',
                  i < 3 ? 'text-primary' : 'text-muted-foreground'
                )}>
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0 px-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-bold text-foreground truncate">{truncate(ad.adName, 24)}</p>
                    <StatusIcon className={cn('w-4 h-4 flex-shrink-0', statusIcon.color)} />
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono tabular-nums mt-0.5">
                    {formatCurrency(ad.spend)} → {formatCurrency(ad.gmv)}
                  </p>
                </div>
                <span className={cn('text-[15px] font-extrabold tabular-nums font-mono flex-shrink-0', getRoasColor(ad.roas))}>
                  {ad.roas.toFixed(2)}
                </span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3.5 space-y-3 animate-fade-in">
                  <div className="h-px bg-border" />
                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">ACOS</p>
                      <p className={cn('text-[13px] font-bold font-mono tabular-nums', getAcosColor(ad.acos))}>{ad.acos.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">ROI</p>
                      <p className={cn('text-[13px] font-bold font-mono tabular-nums', getRoiColor(ad.roi))}>{ad.roi.toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">CTR</p>
                      <p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{ad.ctr.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">CONV</p>
                      <p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{ad.conversionRate.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">RETORNO LÍQUIDO</p>
                      <p className={cn('text-[13px] font-bold font-mono tabular-nums', ad.liquidReturn >= 0 ? 'text-success' : 'text-destructive')}>
                        {formatCurrency(ad.liquidReturn)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase">VENDIDOS</p>
                      <p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{ad.itemsSold} itens</p>
                    </div>
                  </div>
                  <RoasBar roas={ad.roas} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Margin vs Ads Section ───

function MarginSection({ ads, products }: { ads: ShopeeAdRow[]; products: Product[] }) {
  const matches = useMemo(() => {
    const result: Array<{ ad: ShopeeAdRow; product: Product }> = [];
    for (const ad of ads) {
      let match = products.find(p => p.id === ad.productId);
      if (!match && ad.adName) {
        const adWords = ad.adName.toLowerCase().split(/\s+/).slice(0, 3);
        if (adWords.length >= 2) {
          match = products.find(p => {
            const pWords = p.name.toLowerCase().split(/\s+/);
            return adWords.filter(w => pWords.some(pw => pw.includes(w))).length >= 2;
          });
        }
      }
      if (match) result.push({ ad, product: match });
    }
    return result;
  }, [ads, products]);

  if (matches.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">MARGEM vs ADS</p>
      <div className="space-y-2">
        {matches.map(({ ad, product }, i) => {
          const fee = getShopeeFeeForPrice(product.salePrice);
          const taxaShopee = (product.salePrice * fee.percent / 100) + fee.fixed;
          const margin = ((product.salePrice - taxaShopee - product.costPrice) / product.salePrice) * 100;
          const marginWithAds = margin - ad.acos;

          let StatusIcon: React.ElementType;
          let color: string;
          let message: string;

          if (marginWithAds >= 17) {
            StatusIcon = TrendingUp; color = 'text-success'; message = 'Margem excelente mesmo com ads';
          } else if (marginWithAds >= 10) {
            StatusIcon = CheckCircle; color = 'text-success'; message = 'Você lucra mesmo anunciando';
          } else if (marginWithAds >= 0) {
            StatusIcon = AlertTriangle; color = 'text-warning'; message = 'Margem apertada — otimize o ACOS';
          } else {
            StatusIcon = XCircle; color = 'text-destructive'; message = 'Ads estão consumindo toda a margem';
          }

          return (
            <div key={i} className="rounded-xl border border-border bg-surface-2 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <p className="text-sm font-bold text-foreground truncate flex-1">{truncate(product.name, 35)}</p>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Margem do produto:</span>
                  <span className="font-bold font-mono tabular-nums">{margin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ACOS do anúncio:</span>
                  <span className="font-bold font-mono tabular-nums">{ad.acos.toFixed(1)}%</span>
                </div>
              </div>
              <div className="border-t border-dashed border-border pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Margem c/ ads:</span>
                  <span className={cn('text-sm font-extrabold font-mono tabular-nums flex items-center gap-1', color)}>
                    {marginWithAds.toFixed(1)}%
                    <StatusIcon className="w-3.5 h-3.5" />
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main AdsTab Export ───

export function AdsTab() {
  const { currentStore } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ShopeeAdsReport | null>(null);

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo CSV exportado da Shopee');
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseShopeeCSV(text);
      if (!parsed || parsed.ads.length === 0) {
        toast.error('CSV inválido ou sem dados de Ads.');
        return;
      }
      setReport(parsed);
      toast.success(`${parsed.ads.length} anúncios importados!`);
    } catch {
      toast.error('Erro ao ler o arquivo');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const products = currentStore?.products || [];

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

      {!report ? (
        <EmptyState onImport={handleImport} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-foreground">{report.shopName} <span className="text-muted-foreground font-normal">· {report.period}</span></p>
            </div>
            <Button size="sm" variant="outline" onClick={handleImport} className="h-8 text-[11px] gap-1.5 rounded-lg">
              <RefreshCw className="w-3 h-3" />
              Atualizar
            </Button>
          </div>

          {/* Desktop 2-column layout */}
          <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-6 space-y-4 md:space-y-0">
            {/* Left column */}
            <div className="space-y-4">
              <SummarySection report={report} />
              <AlertsSection ads={report.ads} />
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <RankingSection ads={report.ads} />
              <MarginSection ads={report.ads} products={products} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
