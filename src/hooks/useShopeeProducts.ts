import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { toast } from 'sonner';
import type { ShopeeProduct } from '@/components/produtos/ShopeeImportModal';

export function useShopeeProducts() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const { isConnected } = useShopeeToken();
  const [importing, setImporting] = useState(false);

  /**
   * Import selected products from Shopee.
   * When called with selectedIds + shopeeProducts (from modal), only imports those.
   * When called without args, imports all (legacy).
   */
  const importProducts = async (
    selectedIds?: number[],
    shopeeProducts?: ShopeeProduct[]
  ) => {
    if (!user || !currentStore || !isConnected) {
      toast.error('Conecte sua loja Shopee primeiro');
      return null;
    }

    try {
      setImporting(true);

      // If we have pre-fetched products from the modal, use them directly
      if (selectedIds && shopeeProducts) {
        const toImport = shopeeProducts.filter(p => selectedIds.includes(p.item_id));

        if (toImport.length === 0) {
          toast.info('Nenhum produto selecionado');
          return { imported: 0, withoutCost: 0 };
        }

        let imported = 0;
        for (const p of toImport) {
          const { data: existing } = await supabase
            .from('products')
            .select('id, cost_price')
            .eq('user_id', user.id)
            .eq('shopee_product_id', String(p.item_id))
            .maybeSingle();

          if (existing) {
            await (supabase.from('products').update as any)({
              name: p.item_name,
              sale_price: p.price,
              stock_quantity: p.stock,
              image_url: p.image_url || null,
              shopee_synced_at: new Date().toISOString(),
              shopee_product_id: String(p.item_id),
              shopee_item_id: p.item_id,
            }).eq('id', existing.id);
          } else {
            await (supabase.from('products').insert as any)({
              user_id: user.id,
              store_id: currentStore.id,
              name: p.item_name,
              sale_price: p.price,
              cost_price: 0,
              stock_quantity: p.stock,
              image_url: p.image_url || null,
              shopee_item_id: p.item_id,
              shopee_synced_at: new Date().toISOString(),
              shopee_product_id: String(p.item_id),
            } as any);
          }
          imported++;
        }

        const { data: noCost } = await supabase
          .from('products')
          .select('id')
          .eq('user_id', user.id)
          .eq('store_id', currentStore.id)
          .or('cost_price.is.null,cost_price.eq.0');

        const withoutCost = noCost?.length || 0;

        toast.success(`${imported} produto${imported !== 1 ? 's' : ''} importado${imported !== 1 ? 's' : ''} da Shopee`);
        if (withoutCost > 0) {
          toast.info(`${withoutCost} produto${withoutCost !== 1 ? 's' : ''} sem custo. Preencha para usar nas calculadoras.`);
        }

        return { imported, withoutCost };
      }

      // Legacy: shouldn't be called anymore but kept for safety
      return { imported: 0, withoutCost: 0 };
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
