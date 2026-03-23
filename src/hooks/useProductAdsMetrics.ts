import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { deriveMetrics, AdMetricDerived, ParsedAdMetric } from '@/lib/shopeeAdsParser';

export interface ProductAdsMap {
  [productId: string]: AdMetricDerived;
}

function rowToMetric(r: any): AdMetricDerived & { _productId: string | null; _id: string } {
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
    const { data } = await supabase
      .from('product_ads_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('roas', { ascending: false });

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
