import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SavedProfitAnalysis {
  id: string;
  name: string | null;
  store_id: string | null;
  period_start: string | null;
  period_end: string | null;
  report_type: string;
  granularity: string;
  avg_cost_pct: number | null;
  total_revenue: number;
  total_fees: number;
  total_taxes: number;
  total_cost: number;
  total_profit: number;
  margin_pct: number;
  raw_rows: any;
  created_at: string;
}

export function useProfitAnalyses(storeId?: string) {
  const [analyses, setAnalyses] = useState<SavedProfitAnalysis[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId) {
      setAnalyses([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profit_analyses')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });
    if (!error && data) setAnalyses(data as any);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (payload: Omit<SavedProfitAnalysis, 'id' | 'created_at'>) => {
      const { data: userRes } = await supabase.auth.getUser();
      const user_id = userRes.user?.id;
      if (!user_id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('profit_analyses')
        .insert({ ...payload, user_id })
        .select('*')
        .single();
      if (error) throw error;
      await refresh();
      return data as SavedProfitAnalysis;
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('profit_analyses').delete().eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  return { analyses, loading, refresh, save, remove };
}
