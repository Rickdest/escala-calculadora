import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useApiAdsData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['shopee-ads-by-product', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shopee_ads_by_product')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['shopee-ads-by-product'] });

  return { ...query, invalidate };
}

export function buildApiAdsDataFromRows(rows: any[]) {
  if (!rows || rows.length === 0) return null;

  // Deduplicate by campaign_id, keep most recent updated_at
  const deduped = new Map<string, any>();
  for (const r of rows) {
    const key = String(r.campaign_id ?? r.item_id ?? r.id);
    const existing = deduped.get(key);
    if (!existing || (r.updated_at || '') > (existing.updated_at || '')) {
      deduped.set(key, r);
    }
  }
  const uniqueRows = Array.from(deduped.values());

  const totalExpense = uniqueRows.reduce((s, r) => s + Number(r.expense || 0), 0);
  const totalGmv = uniqueRows.reduce((s, r) => s + Number(r.gmv || 0), 0);
  const totalImpressions = uniqueRows.reduce((s, r) => s + Number(r.impressions || 0), 0);
  const totalClicks = uniqueRows.reduce((s, r) => s + Number(r.clicks || 0), 0);
  const totalOrders = uniqueRows.reduce((s, r) => s + Number(r.orders || 0), 0);

  const periodStart = uniqueRows.reduce((min, r) => r.period_start < min ? r.period_start : min, uniqueRows[0].period_start);
  const periodEnd = uniqueRows.reduce((max, r) => r.period_end > max ? r.period_end : max, uniqueRows[0].period_end);

  return {
    summary: {
      total_expense: totalExpense,
      total_gmv: totalGmv,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_orders: totalOrders,
      roas_geral: totalExpense > 0 ? totalGmv / totalExpense : 0,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      days: 0,
    },
    daily_entries: [],
    campaign_details: [],
    total_balance: null,
    ads_by_campaign: uniqueRows.map(r => ({
      campaign_id: r.campaign_id,
      item_id: r.item_id,
      item_name: r.item_name || `Item #${r.item_id}`,
      impressions: r.impressions || 0,
      clicks: r.clicks || 0,
      expense: Number(r.expense || 0),
      gmv: Number(r.gmv || 0),
      direct_gmv: Number(r.direct_gmv || 0),
      orders: r.orders || 0,
      direct_orders: r.direct_orders || 0,
      roas: Number(r.roas || 0),
      direct_roas: Number(r.direct_roas || 0),
      acos: Number(r.acos || 0),
      ctr: Number(r.ctr || 0),
      avg_position: r.avg_position ? Number(r.avg_position) : null,
      cost_per_order: Number(r.cost_per_order || 0),
      days_active: r.days_active || 0,
      daily_data: r.daily_data || [],
      status: r.item_name?.includes('Pausado') ? 'paused' : 'active',
    })),
    period_start: periodStart,
    period_end: periodEnd,
    campaign_count: uniqueRows.length,
  };
}
