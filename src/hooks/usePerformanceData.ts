import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { toast } from 'sonner';

export interface PerformanceData {
  product_sales: Record<string, {
    name: string;
    total_qty: number;
    total_revenue: number;
    variants: Record<string, { qty: number; revenue: number }>;
    daily_sales?: Record<string, number>;
    image_url?: string;
    likes?: number;
    views?: number;
    sales?: number;
    item_status?: string;
    current_price?: number | null;
    min_price?: number | null;
    max_price?: number | null;
    stock_available?: number | null;
    rating_star?: number | null;
    comment_count?: number;
    category_id?: number | null;
    weight?: number | null;
    days_to_ship?: number | null;
  }>;
  summary: {
    total_orders: number;
    total_revenue: number;
    avg_ticket: number;
    status_counts: Record<string, number>;
    period_days: number;
  };
}

interface PerformanceRow {
  summary: PerformanceData['summary'];
  product_sales: PerformanceData['product_sales'];
  synced_at: string;
}

export function usePerformanceData() {
  const { user } = useAuth();
  const { syncStoreData } = useShopeeToken();
  const [data, setData] = useState<PerformanceData | null>(null);
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadFromDb = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: rows } = await supabase
        .from('shopee_performance')
        .select('summary, product_sales, synced_at')
        .eq('user_id', user.id)
        .limit(1);

      if (rows && rows.length > 0) {
        const row = rows[0] as unknown as PerformanceRow;
        setData({ summary: row.summary, product_sales: row.product_sales });
        setSyncedAt(row.synced_at);
      }
    } catch (e) {
      console.error('[usePerformanceData] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadFromDb();
  }, [loadFromDb]);

  const sync = useCallback(async () => {
    try {
      setSyncing(true);
      let result: any = null;
      try {
        result = await syncStoreData();
      } catch (syncErr: any) {
        // syncStoreData may throw on needs_reauth or other errors
        console.error('[usePerformanceData] syncStoreData threw:', syncErr);
        const msg = syncErr?.message || '';
        if (msg.includes('reconectada') || msg.includes('reauth') || msg.includes('shop_no_linked')) {
          toast.error('Sua loja Shopee precisa ser reconectada. Vá em Integrações e reconecte.', { duration: 6000 });
          return;
        }
        toast.error('Erro ao sincronizar dados da loja.');
        return;
      }

      // Handle needs_reauth from backend (success: false)
      if (result?.needs_reauth || result?.success === false) {
        const msg = result?.message || 'Sua loja Shopee precisa ser reconectada. Vá em Integrações e reconecte.';
        toast.error(msg, { duration: 6000 });
        await loadFromDb();
        return;
      }

      const perf = result?.results?.order_performance || result?.order_performance;
      if (perf) {
        setData(perf);
        setSyncedAt(new Date().toISOString());
        if (perf.summary?.total_orders === 0) {
          toast.info('Sua loja não tem pedidos nos últimos 90 dias.');
        } else {
          toast.success(`${perf.summary.total_orders} pedidos carregados!`);
        }
      } else {
        toast.info('Nenhum dado de performance disponível.');
      }
      await loadFromDb();
    } catch (err) {
      console.error('[usePerformanceData] sync error:', err);
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  }, [syncStoreData, loadFromDb]);

  return { data, syncedAt, loading, syncing, sync };
}
