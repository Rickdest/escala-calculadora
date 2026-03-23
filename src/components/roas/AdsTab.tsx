import { useState, useMemo, useRef } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { useAdsData, EnrichedAdsData } from '@/hooks/useAdsData';
import { generateAlerts, AlertItem } from '@/lib/adsLogic';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload, TrendingUp, TrendingDown, AlertTriangle, Zap, Package,
  MapPin, ClipboardList, Search, RefreshCw, Link2, Unlink, Trash2,
  Megaphone, Eye, MousePointerClick, ShoppingCart, FileText
} from 'lucide-react';
import { AdsDetailView } from './AdsDetailView';
import { AdsLinkModal } from './AdsLinkModal';
import { toast } from 'sonner';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type FilterType = 'all' | 'LUCRATIVO' | 'MARGEM_APERTADA' | 'ABAIXO_EMPATE' | 'PREJUIZO' | 'unlinked';

function getClassCor(cls: string | null) {
  if (cls === 'LUCRATIVO') return { color: 'text-success', bg: 'bg-success/10 border-success/30', icon: TrendingUp, label: 'Lucrativo' };
  if (cls === 'MARGEM_APERTADA') return { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'Margem Apertada' };
  if (cls === 'ABAIXO_EMPATE') return { color: 'text-warning', bg: 'bg-warning/10 border-warning/30', icon: AlertTriangle, label: 'Abaixo do Empate' };
  if (cls === 'PREJUIZO') return { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: TrendingDown, label: 'Prejuízo' };
  return { color: 'text-muted-foreground', bg: 'bg-secondary border-border', icon: Package, label: 'Não vinculado' };
}

function getRoasColor(roas: number) {
  if (roas >= 5) return 'text-success';
  if (roas >= 2) return 'text-warning';
  return 'text-destructive';
}

// ─── Summary ───
function SummaryCards({ data }: { data: EnrichedAdsData[] }) {
  const s = useMemo(() => {
    const totalGmv = data.reduce((a, d) => a + d.gmv, 0);
    const totalSpend = data.reduce((a, d) => a + d.despesas, 0);
    const avgRoas = totalSpend > 0 ? totalGmv / totalSpend : 0;
    const lucrativos = data.filter(d => d.classificacao === 'LUCRATIVO').length;
    const atencao = data.filter(d => d.classificacao === 'MARGEM_APERTADA' || d.classificacao === 'ABAIXO_EMPATE').length;
    const prejuizo = data.filter(d => d.classificacao === 'PREJUIZO').length;
    return { totalGmv, totalSpend, avgRoas, lucrativos, atencao, prejuizo };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">GMV Total</p>
          <p className="text-lg font-extrabold font-mono tabular-nums text-foreground mt-1">{fmt(s.totalGmv)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Gasto Total</p>
          <p className="text-lg font-extrabold font-mono tabular-nums text-foreground mt-1">{fmt(s.totalSpend)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">ROAS Médio</p>
          <p className={cn('text-lg font-extrabold font-mono tabular-nums mt-1', getRoasColor(s.avgRoas))}>{s.avgRoas.toFixed(2)}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 px-1">
        <span className="text-xs font-bold text-success">✅ {s.lucrativos} lucrativos</span>
        <span className="text-xs font-bold text-warning">🟠 {s.atencao} atenção</span>
        <span className="text-xs font-bold text-destructive">🔴 {s.prejuizo} prejuízo</span>
      </div>
    </div>
  );
}

// ─── Filter Chips ───
function FilterChips({ filter, setFilter, data }: { filter: FilterType; setFilter: (f: FilterType) => void; data: EnrichedAdsData[] }) {
  const unlinked = data.filter(d => !d.product_id).length;
  const chips: Array<{ key: FilterType; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'LUCRATIVO', label: '✅ Lucrativos' },
    { key: 'ABAIXO_EMPATE', label: '🟠 Atenção' },
    { key: 'PREJUIZO', label: '🔴 Prejuízo' },
    ...(unlinked > 0 ? [{ key: 'unlinked' as FilterType, label: `❓ Não vinculados (${unlinked})` }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(c => (
        <button
          key={c.key}
          onClick={() => setFilter(c.key)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-bold transition-colors border',
            filter === c.key
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground border-border hover:border-primary/30'
          )}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ─── Product Card ───
function getDiasPeriodo(inicio: string, fim: string): number {
  return Math.ceil((new Date(fim).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24));
}

function AdsProductCard({
  ad, onClick, onLink, onUpdatePosition,
}: {
  ad: EnrichedAdsData;
  onClick: () => void;
  onLink: () => void;
  onUpdatePosition: () => void;
}) {
  const cls = getClassCor(ad.classificacao);
  const ClsIcon = cls.icon;
  const periodLabel = (() => {
    const f = (d: string) => { const parts = d.split('-'); return `${parts[2]}/${parts[1]}`; };
    return `${f(ad.periodo_inicio)} – ${f(ad.periodo_fim)}`;
  })();

  const roasDireto = ad.roas_direto || ad.roas;
  const dias = getDiasPeriodo(ad.periodo_inicio, ad.periodo_fim);
  const emAprendizado = dias < 7;

  return (
    <div
      className="rounded-xl border border-border bg-card p-3.5 space-y-2 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {ad.product?.imageUrl ? (
          <img src={ad.product.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-bold', cls.bg, cls.color)}>
              <ClsIcon className="w-3 h-3" /> {cls.label}
            </span>
            {emAprendizado && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                <Clock className="w-3 h-3" /> Aprendizado
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-foreground truncate mt-1">{ad.nome_produto_csv}</p>
          <p className="text-[11px] text-muted-foreground font-mono tabular-nums">{periodLabel}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={cn('text-lg font-extrabold font-mono tabular-nums', getRoasColor(roasDireto))}>
            {roasDireto.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">ROAS</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono tabular-nums">
        <span>GMV {fmt(ad.gmv)}</span>
        <span>·</span>
        <span>Gasto {fmt(ad.despesas)}</span>
        {ad.roas_empate && (
          <>
            <span>·</span>
            <span>vs Empate {ad.roas_empate.toFixed(2)}</span>
          </>
        )}
      </div>

      {ad.roas_empate && roasDireto > 0 && (
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all',
              roasDireto >= ad.roas_empate ? 'bg-success' : 'bg-destructive'
            )}
            style={{ width: `${Math.min((roasDireto / (ad.roas_empate * 2)) * 100, 100)}%` }}
          />
        </div>
      )}

      {!ad.product_id && (
        <button
          onClick={(e) => { e.stopPropagation(); onLink(); }}
          className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors"
        >
          <Link2 className="w-3 h-3" /> Vincular ao cadastro
        </button>
      )}

      {ad.posicao_media !== null && (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold font-mono tabular-nums text-muted-foreground">
          <MapPin className="w-3 h-3 text-primary" /> Pos. #{ad.posicao_media}
        </span>
      )}
    </div>
  );
}

// ─── Alerts ───
function AlertsSection({ data }: { data: EnrichedAdsData[] }) {
  const alerts = useMemo(() => generateAlerts(data), [data]);
  if (alerts.length === 0) return null;

  const icons: Record<string, React.ElementType> = {
    critico: TrendingDown, atencao: AlertTriangle, oportunidade: TrendingUp, insight: Zap,
  };
  const colors: Record<string, string> = {
    critico: 'border-destructive/20 bg-destructive/5',
    atencao: 'border-warning/20 bg-warning/5',
    oportunidade: 'border-success/20 bg-success/5',
    insight: 'border-primary/20 bg-primary/5',
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-primary" /> Alertas Automáticos
      </p>
      {alerts.slice(0, 8).map((a, i) => {
        const Icon = icons[a.type] || AlertTriangle;
        return (
          <div key={i} className={cn('flex items-start gap-2 p-2.5 rounded-lg border', colors[a.type])}>
            <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', `text-${a.cor}`)} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{a.productName}</p>
              <p className="text-[11px] text-muted-foreground">{a.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Empty State ───
function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
        <Megaphone className="w-8 h-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <p className="text-[15px] font-bold text-foreground">Importe seu relatório de Shopee Ads</p>
        <p className="text-[13px] text-muted-foreground max-w-[300px] mx-auto">
          Exporte o CSV em: Shopee Seller Center → Marketing → Shopee Ads → Relatórios → Todos os Anúncios → Exportar
        </p>
      </div>
      <Button onClick={onImport} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 mt-4">
        <Upload className="w-4 h-4" /> Importar CSV
      </Button>
    </div>
  );
}

// ─── By Product Tab ───
function ByProductContent({ data, onImport, onDetail }: {
  data: EnrichedAdsData[];
  onImport: () => void;
  onDetail: (d: EnrichedAdsData) => void;
}) {
  const withPosition = data.filter(d => d.posicao_importada && d.posicao_media !== null);

  if (withPosition.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
          <Search className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <p className="text-[15px] font-bold text-foreground">Análise Individual por Produto</p>
          <p className="text-[13px] text-muted-foreground max-w-[300px] mx-auto">
            Importe o relatório de um produto específico para análise completa com posicionamento.
          </p>
          <div className="text-left bg-secondary/50 rounded-xl p-3 max-w-[300px] mx-auto mt-3">
            <p className="text-[11px] font-bold text-foreground mb-1">Como exportar na Shopee:</p>
            <ol className="text-[11px] text-muted-foreground space-y-0.5 list-decimal list-inside">
              <li>Shopee Seller Center</li>
              <li>Marketing → Shopee Ads</li>
              <li>Clique no anúncio do produto</li>
              <li>Aba "Dados do Anúncio de Produto"</li>
              <li>Exportar CSV</li>
            </ol>
          </div>
        </div>
        <Button onClick={onImport} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 mt-4">
          <Upload className="w-4 h-4" /> Importar CSV do Produto
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold text-foreground">Produtos com análise de posição</p>
      {withPosition.map(ad => {
        const cls = getClassCor(ad.classificacao);
        return (
          <div
            key={ad.id}
            className="rounded-xl border border-border bg-card p-3.5 cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.99]"
            onClick={() => onDetail(ad)}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{ad.nome_produto_csv}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-xs font-bold font-mono tabular-nums', getRoasColor(ad.roas_direto || ad.roas))}>
                    ROAS {(ad.roas_direto || ad.roas).toFixed(2)}
                  </span>
                  {ad.roas_empate && (
                    <span className="text-[11px] text-muted-foreground font-mono">Empate {ad.roas_empate.toFixed(2)}</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-xl font-extrabold font-mono tabular-nums text-foreground">#{ad.posicao_media}</span>
                </div>
                <span className={cn('text-[10px] font-bold', cls.color)}>{cls.label}</span>
              </div>
            </div>
          </div>
        );
      })}
      <Button onClick={onImport} variant="outline" className="w-full h-10 rounded-xl text-sm font-bold gap-2">
        <Upload className="w-4 h-4" /> Importar novo CSV de produto
      </Button>
    </div>
  );
}

// ─── Main AdsTab ───
export function AdsTab() {
  const { currentStore } = useStore();
  const { data, loading, importGeneralCSV, importProductCSV, linkProduct, reload } = useAdsData();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedDetail, setSelectedDetail] = useState<EnrichedAdsData | null>(null);
  const [linkTarget, setLinkTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const generalFileRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);
  const [positionTarget, setPositionTarget] = useState<string | undefined>();
  const positionFileRef = useRef<HTMLInputElement>(null);

  const products = currentStore?.products || [];

  const filtered = useMemo(() => {
    if (filter === 'all') return data;
    if (filter === 'unlinked') return data.filter(d => !d.product_id);
    if (filter === 'ABAIXO_EMPATE') return data.filter(d => d.classificacao === 'ABAIXO_EMPATE' || d.classificacao === 'MARGEM_APERTADA');
    return data.filter(d => d.classificacao === filter);
  }, [data, filter]);

  const handleGeneralFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();
    await importGeneralCSV(text);
    if (generalFileRef.current) generalFileRef.current.value = '';
  };

  const handleProductFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Selecione um arquivo CSV'); return; }
    const text = await file.text();
    await importProductCSV(text);
    if (productFileRef.current) productFileRef.current.value = '';
  };

  const handlePositionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importProductCSV(text, positionTarget);
    setPositionTarget(undefined);
    if (positionFileRef.current) positionFileRef.current.value = '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input ref={generalFileRef} type="file" accept=".csv" onChange={handleGeneralFile} className="hidden" />
      <input ref={productFileRef} type="file" accept=".csv" onChange={handleProductFile} className="hidden" />
      <input ref={positionFileRef} type="file" accept=".csv" onChange={handlePositionFile} className="hidden" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-10 rounded-xl bg-card border border-border p-1">
          <TabsTrigger value="overview" className="text-xs font-bold rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ClipboardList className="w-3.5 h-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="byProduct" className="text-xs font-bold rounded-lg gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Search className="w-3.5 h-3.5" /> Por Produto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4 animate-fade-in">
          {data.length === 0 ? (
            <EmptyState onImport={() => generalFileRef.current?.click()} />
          ) : (
            <div className="md:grid md:grid-cols-12 md:gap-6 space-y-4 md:space-y-0">
              <div className="md:col-span-8 space-y-4">
                <SummaryCards data={data} />
                <FilterChips filter={filter} setFilter={setFilter} data={data} />

                <Button onClick={() => generalFileRef.current?.click()} className="w-full h-11 rounded-xl text-sm font-bold gap-2">
                  <Upload className="w-4 h-4" /> Importar relatório de anúncios
                </Button>

                <div className="space-y-2">
                  {filtered.map(ad => (
                    <AdsProductCard
                      key={ad.id}
                      ad={ad}
                      onClick={() => setSelectedDetail(ad)}
                      onLink={() => setLinkTarget(ad.id)}
                      onUpdatePosition={() => { setPositionTarget(ad.id); positionFileRef.current?.click(); }}
                    />
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-6">Nenhum produto neste filtro</p>
                  )}
                </div>
              </div>

              <div className="md:col-span-4 space-y-4">
                <AlertsSection data={data} />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="byProduct" className="mt-4 animate-fade-in">
          <ByProductContent
            data={data}
            onImport={() => productFileRef.current?.click()}
            onDetail={setSelectedDetail}
          />
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedDetail && (
        <AdsDetailView
          ad={selectedDetail}
          onClose={() => setSelectedDetail(null)}
          onImportPosition={() => { setPositionTarget(selectedDetail.id); setSelectedDetail(null); positionFileRef.current?.click(); }}
          onLink={() => { setLinkTarget(selectedDetail.id); setSelectedDetail(null); }}
        />
      )}

      {/* Link Modal */}
      {linkTarget && (
        <AdsLinkModal
          products={products}
          onClose={() => setLinkTarget(null)}
          onLink={(productId) => { linkProduct(linkTarget, productId); setLinkTarget(null); }}
        />
      )}
    </div>
  );
}
