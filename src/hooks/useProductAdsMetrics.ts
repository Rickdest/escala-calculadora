import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { deriveMetrics, AdMetricDerived, ParsedAdMetric } from '@/lib/shopeeAdsParser';

export interface ProductAdsMap {
  [productId: string]: AdMetricDerived;
}

function rowToMetric(r: any): AdMetricDerived & { _productId: string | null; _id: string } {
  const m: ParsedAdMetric = {
    shopeeProductId: r.shopee_product_id || r.shopee_product_id || '',
    shopeeProductName: r.nome_produto_csv || r.shopee_product_name || '',
    periodStart: r.periodo_inicio || r.period_start,
    periodEnd: r.periodo_fim || r.period_end,
    impressions: r.impressoes ?? r.impressions,
    clicks: r.cliques ?? r.clicks,
    itemsSold: r.itens_vendidos ?? r.items_sold,
    gmv: Number(r.gmv),
    spend: Number(r.despesas ?? r.spend),
    roas: Number(r.roas),
    acos: Number(r.acos),
    avgPosition: r.posicao_media ?? r.avg_position,
    ctr: Number(r.ctr),
    convRate: Number(r.taxa_conversao ?? r.conv_rate),
    directRoas: Number(r.roas_direto ?? r.direct_roas),
    directAcos: Number(r.acos_direto ?? r.direct_acos),
    costPerConv: Number(r.custo_por_conversao ?? r.cost_per_conv),
  };
  return { ...deriveMetrics(m), _productId: r.product_id, _id: r.id };
}

export function useProductAdsMetrics() {
  const { user } = useAuth();
  const [metricsMap, setMetricsMap] = useState<ProductAdsMap>({});
  const [allMetrics, setAllMetrics] = useState<(AdMetricDerived & { _productId: string | null; _id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMetrics = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    // Try ads_data first, fall back to product_ads_metrics
    let result = await supabase
      .from('ads_data' as any)
      .select('*')
      .eq('user_id', user.id)
      .not('product_id', 'is', null)
      .order('roas', { ascending: false });

    if (!result.data || result.data.length === 0) {
      result = await supabase
        .from('product_ads_metrics')
        .select('*')
        .eq('user_id', user.id)
        .order('roas', { ascending: false });
    }

    const data = result.data;

    if (data) {
      const derived = data.map(rowToMetric);
      setAllMetrics(derived);
      const map: ProductAdsMap = {};
      for (const m of derived) {
        if (m._productId) map[m._productId] = m;
      }
      setMetricsMap(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  return { metricsMap, allMetrics, loading, reload: loadMetrics };
}
