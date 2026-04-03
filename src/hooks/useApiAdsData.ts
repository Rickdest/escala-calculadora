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

  // Aggregate by item_id to avoid showing the same product multiple times
  const byItem = new Map<string, any>();
  for (const r of rows) {
    const key = String(r.item_id ?? r.campaign_id ?? r.id);
    const existing = byItem.get(key);
    if (!existing) {
      byItem.set(key, { ...r, campaign_ids: [r.campaign_id] });
    } else {
      // Merge metrics: sum numerical fields
      existing.impressions = (existing.impressions || 0) + (r.impressions || 0);
      existing.clicks = (existing.clicks || 0) + (r.clicks || 0);
      existing.expense = Number(existing.expense || 0) + Number(r.expense || 0);
      existing.gmv = Number(existing.gmv || 0) + Number(r.gmv || 0);
      existing.direct_gmv = Number(existing.direct_gmv || 0) + Number(r.direct_gmv || 0);
      existing.orders = (existing.orders || 0) + (r.orders || 0);
      existing.direct_orders = (existing.direct_orders || 0) + (r.direct_orders || 0);
      existing.campaign_ids.push(r.campaign_id);
      // Prioritize status: active > paused > ended
      const rStatus = r.status || 'ended';
      if (rStatus === 'active') existing.status = 'active';
      else if (rStatus === 'paused' && existing.status !== 'active') existing.status = 'paused';
      // Keep the most recent updated_at
      if ((r.updated_at || '') > (existing.updated_at || '')) {
        existing.updated_at = r.updated_at;
        existing.item_name = r.item_name || existing.item_name;
      }
      // Keep best avg_position
      if (r.avg_position && (!existing.avg_position || r.avg_position < existing.avg_position)) {
        existing.avg_position = r.avg_position;
      }
      // Merge daily data
      if (r.daily_data && Array.isArray(r.daily_data)) {
        const existingDaily = existing.daily_data || [];
        existing.daily_data = mergeDailyData(existingDaily, r.daily_data);
      }
    }
  }

  const uniqueRows = Array.from(byItem.values());

  // Recalculate derived metrics after aggregation
  for (const r of uniqueRows) {
    r.roas = r.expense > 0 ? r.gmv / r.expense : 0;
    r.direct_roas = r.expense > 0 ? (r.direct_gmv || 0) / r.expense : 0;
    r.acos = r.gmv > 0 ? (r.expense / r.gmv) * 100 : 0;
    r.ctr = r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0;
    r.cost_per_order = r.orders > 0 ? r.expense / r.orders : 0;
  }

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
      campaign_id: r.campaign_ids?.[0] ?? r.campaign_id,
      campaign_ids: r.campaign_ids || [r.campaign_id],
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
      status: r.status || 'ended',
    })),
    period_start: periodStart,
    period_end: periodEnd,
    campaign_count: uniqueRows.length,
  };
}

/** Merge daily data arrays by date, summing metrics */
function mergeDailyData(a: any[], b: any[]): any[] {
  const map = new Map<string, any>();
  for (const entry of [...a, ...b]) {
    const date = entry.date || '';
    const existing = map.get(date);
    if (!existing) {
      map.set(date, { ...entry });
    } else {
      existing.impressions = (existing.impressions || 0) + (entry.impressions || 0);
      existing.clicks = (existing.clicks || 0) + (entry.clicks || 0);
      existing.expense = (existing.expense || 0) + (entry.expense || 0);
      existing.gmv = (existing.gmv || 0) + (entry.gmv || 0);
      existing.orders = (existing.orders || 0) + (entry.orders || 0);
      existing.roas = existing.expense > 0 ? existing.gmv / existing.expense : 0;
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
