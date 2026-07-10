import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MLImportHistoryRecord {
  id: string;
  user_id: string;
  store_id: string;
  file_name: string | null;
  file_hash: string | null;
  period_start: string | null;
  period_end: string | null;
  ads_count: number;
  linked_count: number;
  unlinked_count: number;
  gross_sales_total: number;
  raw_rows: any;
  created_at: string;
}

export function useMLImportHistory(storeId?: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<MLImportHistoryRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!storeId || !user) {
      setItems([]);
      return;
    }
    const { data } = await supabase
      .from('ml_import_history')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50);
    setItems((data as MLImportHistoryRecord[]) || []);
  }, [storeId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const insert = useCallback(
    async (row: Omit<MLImportHistoryRecord, 'id' | 'user_id' | 'store_id' | 'created_at'>) => {
      if (!user || !storeId) return null;
      const { data, error } = await supabase
        .from('ml_import_history')
        .insert({ ...row, user_id: user.id, store_id: storeId })
        .select('*')
        .single();
      if (error) throw error;
      await refresh();
      return data as MLImportHistoryRecord;
    },
    [user, storeId, refresh],
  );

  const findDuplicate = useCallback(
    (params: { file_hash: string; period_start: string | null; period_end: string | null; gross_sales_total: number; ads_count: number }) => {
      return items.find(
        (it) =>
          it.file_hash === params.file_hash ||
          (it.period_start === params.period_start &&
            it.period_end === params.period_end &&
            it.ads_count === params.ads_count &&
            Math.abs(Number(it.gross_sales_total) - params.gross_sales_total) < 0.5),
      );
    },
    [items],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('ml_import_history').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { items, refresh, insert, findDuplicate, remove };
}
