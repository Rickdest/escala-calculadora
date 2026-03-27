import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  Upload, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  XCircle, RefreshCw, Megaphone, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseShopeeAdsCSV, ParsedAdMetric, deriveMetrics, AdMetricDerived, validateCSVSecurity, detectAndParseCSV } from '@/lib/shopeeAdsParser';
import { toast } from 'sonner';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface ProductAdsSectionProps {
  productId?: string;
  shopeeProductId?: string;
}

export function ProductAdsSection({ productId, shopeeProductId }: ProductAdsSectionProps) {
  const { user } = useAuth();
  const [metric, setMetric] = useState<AdMetricDerived | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMetric();
  }, [productId, shopeeProductId, user]);

  const loadMetric = async () => {
    if (!user || !productId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('product_ads_metrics')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .order('imported_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const r = data[0] as any;
      const m: ParsedAdMetric = {
        shopeeProductId: r.shopee_product_id || '',
        shopeeProductName: r.shopee_product_name || '',
        periodStart: r.period_start,
        periodEnd: r.period_end,
        impressions: r.impressions,
        clicks: r.clicks,
        itemsSold: r.items_sold,
        gmv: Number(r.gmv),
        spend: Number(r.spend),
        roas: Number(r.roas),
        acos: Number(r.acos),
        avgPosition: r.avg_position,
        ctr: Number(r.ctr),
        convRate: Number(r.conv_rate),
        directRoas: Number(r.direct_roas),
        directAcos: Number(r.direct_acos),
        costPerConv: Number(r.cost_per_conv),
      };
      setMetric(deriveMetrics(m));
    } else {
      setMetric(null);
    }
    setLoading(false);
  };

  const handleImport = () => fileInputRef.current?.click();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !productId) return;
    try {
      const text = await file.text();
      const validation = validateCSVSecurity(file, text);
      if (!validation.valid) { toast.error(validation.error || 'Arquivo inválido'); return; }

      const detected = detectAndParseCSV(text);

      if (detected.type === 'unknown') {
        toast.error('Formato de arquivo não reconhecido');
        return;
      }

      if (detected.type === 'operation_log' && detected.operationLog) {
        // Save operation log to existing metric row
        const { error } = await supabase
          .from('product_ads_metrics')
          .update({ operation_log: detected.operationLog as any })
          .eq('user_id', user.id)
          .eq('product_id', productId);
        if (error) {
          toast.error('Erro ao salvar log de operações');
        } else {
          toast.success('Log de operações importado');
          loadMetric();
        }
        return;
      }

      // Performance CSV — original flow
      const parsed = detected.performanceData;
      if (!parsed || parsed.metrics.length === 0) { toast.error('CSV inválido'); return; }
      const m = parsed.metrics[0];
      await supabase.from('product_ads_metrics').delete().eq('user_id', user.id).eq('product_id', productId);
      await supabase.from('product_ads_metrics').insert({
        user_id: user.id,
        product_id: productId,
        shopee_product_id: m.shopeeProductId || shopeeProductId || null,
        shopee_product_name: m.shopeeProductName || null,
        period_start: m.periodStart,
        period_end: m.periodEnd,
        impressions: m.impressions,
        clicks: m.clicks,
        items_sold: m.itemsSold,
        gmv: m.gmv,
        spend: m.spend,
        roas: m.roas,
        acos: m.acos,
        avg_position: m.avgPosition,
        ctr: m.ctr,
        conv_rate: m.convRate,
        direct_roas: m.directRoas,
        direct_acos: m.directAcos,
        cost_per_conv: m.costPerConv,
      } as any);
      toast.success('Dados de Ads atualizados');
      loadMetric();
    } catch { toast.error('Erro ao importar'); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleUnlink = async () => {
    if (!user || !productId) return;
    await supabase.from('product_ads_metrics').delete().eq('user_id', user.id).eq('product_id', productId);
    setMetric(null);
    toast.info('Dados de Ads desvinculados');
  };

  if (loading) return null;

  const periodLabel = metric ? (() => {
    const fmt = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}`; };
    return `${fmt(metric.periodStart)}–${fmt(metric.periodEnd)}`;
  })() : '';

  // Bid recommendation
  const bidRec = metric ? (() => {
    const roas = metric.roas;
    const pos = metric.avgPosition;
    if (pos === null) return null;
    if (roas >= 5 && pos > 10) return { icon: TrendingUp, color: 'text-success', text: 'Aumente o lance — ROAS comporta subir na busca' };
    if (roas >= 5 && pos <= 10) return { icon: CheckCircle, color: 'text-success', text: 'Eficiente — mantenha ou escale' };
    if (roas < 5 && roas >= 2 && pos <= 10) return { icon: AlertTriangle, color: 'text-warning', text: 'Reduza o lance — posição boa mas ROAS não compensa' };
    if (roas < 2 && pos > 10) return { icon: XCircle, color: 'text-destructive', text: 'Revise o produto — ROAS e posição estão ruins' };
    return null;
  })() : null;

  return (
    <div className="surface-card p-3.5 space-y-3">
      <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">ADS</span>
          {metric && <span className="text-[11px] text-text-2">· Período: {periodLabel}</span>}
        </div>
      </div>

      {!metric ? (
        <div className="text-center py-3 space-y-2">
          <p className="text-xs text-text-2">Nenhum dado de Ads vinculado</p>
          <Button onClick={handleImport} size="sm" variant="outline" className="h-9 text-xs gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Importar CSV deste produto
          </Button>
        </div>
      ) : (
        <>
          {/* Metrics grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'ROAS', value: metric.roas.toFixed(2), color: metric.roas >= 5 ? 'text-success' : metric.roas >= 2 ? 'text-warning' : 'text-destructive' },
              { label: 'ACOS', value: `${metric.acos.toFixed(1)}%`, color: metric.acos <= 20 ? 'text-success' : metric.acos <= 40 ? 'text-warning' : 'text-destructive' },
              { label: 'POSIÇÃO', value: metric.avgPosition !== null ? `#${metric.avgPosition}` : '—', color: 'text-foreground' },
              { label: 'CTR', value: `${metric.ctr.toFixed(2)}%`, color: 'text-foreground' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="section-label">{label}</p>
                <p className={cn('text-[13px] font-bold font-mono tabular-nums', color)}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'ROI', value: `${metric.roi.toFixed(0)}%`, color: metric.roi > 100 ? 'text-success' : 'text-warning' },
              { label: 'RETORNO LÍQ.', value: formatCurrency(metric.liquidReturn), color: metric.liquidReturn >= 0 ? 'text-success' : 'text-destructive' },
              { label: 'CUSTO/VENDA', value: metric.costPerSale > 0 ? formatCurrency(metric.costPerSale) : '—', color: 'text-foreground' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="section-label">{label}</p>
                <p className={cn('text-[13px] font-bold font-mono tabular-nums', color)}>{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div><p className="section-label">CONV%</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{metric.convRate.toFixed(2)}%</p></div>
            <div><p className="section-label">VENDIDOS</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{metric.itemsSold} itens</p></div>
            <div><p className="section-label">INVESTIDO</p><p className="text-[13px] font-bold font-mono tabular-nums text-foreground">{formatCurrency(metric.spend)}</p></div>
          </div>

          {/* Bid recommendation */}
          {bidRec ? (
            <div className="border-t border-dashed border-border pt-2 flex items-start gap-2">
              <bidRec.icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', bidRec.color)} />
              <p className="text-[11px] text-text-2">{bidRec.text}</p>
            </div>
          ) : metric.avgPosition === null ? (
            <div className="border-t border-dashed border-border pt-2 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-text-2" />
              <p className="text-[11px] text-text-2">Posição: não disponível. Importe o CSV por produto para ver a posição média</p>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={handleImport} size="sm" variant="outline" className="flex-1 h-8 text-[11px] gap-1">
              <RefreshCw className="w-3 h-3" /> Atualizar CSV
            </Button>
            <Button onClick={handleUnlink} size="sm" variant="ghost" className="h-8 text-[11px] text-text-2">
              Desvincular
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
