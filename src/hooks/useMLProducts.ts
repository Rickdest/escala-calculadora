import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MLProductRecord {
  id: string;
  user_id: string;
  store_id: string;
  ad_id: string | null;
  sku: string | null;
  name: string | null;
  variation: string | null;
  status: string | null;
  ad_type: 'classico' | 'premium' | null;
  sale_price: number | null;
  cost_price: number | null;
  packaging_cost: number | null;
  additional_cost: number | null;
  freight_cost: number | null;
  freight_mode: 'per_unit' | 'per_sale' | 'total_manual' | 'none';
  tax_value: number | null;
  tax_mode: 'percent' | 'fixed' | 'default';
  notes: string | null;
  linked_manually: boolean;
  updated_at: string;
}

export function useMLProducts(storeId?: string) {
  const { user } = useAuth();
  const [products, setProducts] = useState<MLProductRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId || !user) {
      setProducts([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase.from('ml_products').select('*').eq('store_id', storeId);
    setProducts((data as MLProductRecord[]) || []);
    setLoading(false);
  }, [storeId, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(
    async (row: Partial<MLProductRecord> & { ad_id?: string | null; sku?: string | null }) => {
      if (!user || !storeId) return null;
      const payload: any = {
        ...row,
        user_id: user.id,
        store_id: storeId,
      };
      // Match existing by (sku, ad_id) to keep saved config
      const existing = products.find(
        (p) =>
          (p.sku ?? '') === (row.sku ?? '') && (p.ad_id ?? '') === (row.ad_id ?? ''),
      );
      if (existing) payload.id = existing.id;
      const { data, error } = await supabase
        .from('ml_products')
        .upsert(payload)
        .select('*')
        .single();
      if (error) throw error;
      await refresh();
      return data as MLProductRecord;
    },
    [user, storeId, products, refresh],
  );

  const update = useCallback(
    async (id: string, patch: Partial<MLProductRecord>) => {
      const { error } = await supabase.from('ml_products').update(patch).eq('id', id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('ml_products').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const unlink = useCallback(
    async (id: string) => {
      await supabase.from('ml_products').update({ linked_manually: false, ad_id: null }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { products, loading, refresh, upsert, update, remove, unlink };
}
