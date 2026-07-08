import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ShopeeProductLink {
  id: string;
  user_id: string;
  store_id: string;
  shopee_item_id: string;
  parent_sku: string | null;
  variation_sku: string | null;
  product_id: string | null;
  manual_unit_cost: number | null;
  link_type: string;
}

export function useShopeeProductLinks(storeId?: string) {
  const { user } = useAuth();
  const [links, setLinks] = useState<ShopeeProductLink[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!storeId || !user) {
      setLinks([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('shopee_product_links')
      .select('*')
      .eq('store_id', storeId);
    setLinks((data as ShopeeProductLink[]) || []);
    setLoading(false);
  }, [storeId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertLink = useCallback(
    async (input: {
      shopee_item_id: string;
      parent_sku?: string | null;
      variation_sku?: string | null;
      product_id?: string | null;
      manual_unit_cost?: number | null;
      link_type: 'product' | 'manual_cost' | 'none';
    }) => {
      if (!user || !storeId) return;
      const payload = {
        user_id: user.id,
        store_id: storeId,
        shopee_item_id: input.shopee_item_id,
        parent_sku: input.parent_sku ?? null,
        variation_sku: input.variation_sku ?? null,
        product_id: input.product_id ?? null,
        manual_unit_cost: input.manual_unit_cost ?? null,
        link_type: input.link_type,
      };
      await supabase
        .from('shopee_product_links')
        .upsert(payload, { onConflict: 'user_id,store_id,shopee_item_id' });
      await refresh();
    },
    [user, storeId, refresh],
  );

  const removeLink = useCallback(
    async (shopee_item_id: string) => {
      if (!user || !storeId) return;
      await supabase
        .from('shopee_product_links')
        .delete()
        .eq('store_id', storeId)
        .eq('shopee_item_id', shopee_item_id);
      await refresh();
    },
    [user, storeId, refresh],
  );

  return { links, loading, refresh, upsertLink, removeLink };
}
