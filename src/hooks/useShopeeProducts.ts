import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { toast } from 'sonner';

export function useShopeeProducts() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const { syncAds, isConnected } = useShopeeToken();
  const [importing, setImporting] = useState(false);

  const importProducts = async () => {
    if (!user || !currentStore || !isConnected) {
      toast.error('Conecte sua loja Shopee primeiro');
      return null;
    }

    try {
      setImporting(true);
      const result = await syncAds();
      const details = result?.results?.product_details?.response?.item_list || [];
      const modelsMap = result?.results?.product_models || {};

      if (details.length === 0) {
        toast.info('Nenhum produto encontrado na Shopee');
        return { imported: 0, withoutCost: 0 };
      }

      let imported = 0;
      for (const p of details) {
        const itemId = p.item_id;
        const models = modelsMap[itemId];

        // Calculate price and stock
        let salePrice = 0;
        let stockQty = 0;

        if (models && models.length > 0) {
          const prices = models
            .map((m: any) => {
              const pi = m.price_info?.[0];
              const raw = pi?.current_price || pi?.original_price || 0;
              return raw > 1000 ? raw / 100000 : raw;
            })
            .filter((pr: number) => pr > 0);
          salePrice = prices.length > 0 ? Math.min(...prices) : 0;
          stockQty = models.reduce((sum: number, m: any) => {
            return sum + (m.stock_info_v2?.summary_info?.total_available_stock ?? 0);
          }, 0);
        } else {
          const pi = p.price_info?.[0];
          const rawPrice = pi?.current_price || pi?.original_price || 0;
          salePrice = rawPrice > 1000 ? rawPrice / 100000 : rawPrice;
          stockQty = p.stock_info_v2?.summary_info?.total_available_stock ?? 0;
        }

        const imageUrl = p.image?.image_url_list?.[0] || null;

        // Check if product already exists by shopee_product_id
        const { data: existing } = await supabase
          .from('products')
          .select('id, cost_price')
          .eq('user_id', user.id)
          .eq('shopee_product_id', String(itemId))
          .maybeSingle();

        if (existing) {
          // Update without touching cost_price
          await supabase
            .from('products')
            .update({
              name: p.item_name,
              sale_price: salePrice,
              stock_quantity: stockQty,
              image_url: imageUrl,
              shopee_synced_at: new Date().toISOString(),
              shopee_product_id: String(itemId),
            } as any)
            .eq('id', existing.id);
        } else {
          // Insert new
          await (supabase
            .from('products')
            .insert as any)({
              user_id: user.id,
              store_id: currentStore.id,
              name: p.item_name,
              sale_price: salePrice,
              cost_price: 0,
              stock_quantity: stockQty,
              image_url: imageUrl,
              shopee_item_id: itemId,
              shopee_synced_at: new Date().toISOString(),
              shopee_product_id: String(itemId),
            } as any);
        }
        imported++;
      }

      // Count products without cost
      const { data: noCost } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', currentStore.id)
        .or('cost_price.is.null,cost_price.eq.0');

      const withoutCost = noCost?.length || 0;

      toast.success(`${imported} produtos importados da Shopee`);
      if (withoutCost > 0) {
        toast.info(`${withoutCost} produtos sem custo. Preencha para usar nas calculadoras.`);
      }

      return { imported, withoutCost };
    } catch (e) {
      console.error('Shopee import error:', e);
      toast.error('Erro ao importar produtos da Shopee');
      return null;
    } finally {
      setImporting(false);
    }
  };

  return { importProducts, importing, isConnected };
}
