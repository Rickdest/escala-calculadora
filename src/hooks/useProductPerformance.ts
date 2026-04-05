import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { parseProductPerformanceExcel } from '@/lib/parsers/parseProductPerformanceExcel';
import { toast } from 'sonner';

export interface ProductPerformanceDB {
  id: string;
  item_id: string;
  nome: string | null;
  period_start: string;
  period_end: string;
  vendas_pago: number;
  pedidos_pagos: number;
  unidades_pagas: number;
  compradores_pagos: number;
  ticket_medio: number;
  impressoes: number;
  cliques: number;
  ctr: number;
  taxa_conversao: number;
  taxa_rejeicao: number;
  add_carrinho: number;
  taxa_carrinho: number;
  taxa_recompra: number;
  ads_roas: number | null;
  ads_gasto: number | null;
  ads_gmv: number | null;
  ads_pedidos: number | null;
  ads_impressoes: number | null;
  ads_cliques: number | null;
  variacoes: any[];
  source: string;
}

export function useProductPerformance() {
  const { user } = useAuth();
  const { currentStore: selectedStore } = useStore();
  const [data, setData] = useState<ProductPerformanceDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [periodLabel, setPeriodLabel] = useState<string | null>(null);

  const storeId = selectedStore?.id;

  const loadData = useCallback(async () => {
    if (!user?.id || !storeId) { setLoading(false); return; }
    try {
      const { data: rows, error } = await supabase
        .from('product_performance')
        .select('*')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .order('vendas_pago', { ascending: false });

      if (error) throw error;

      const typed = (rows || []).map((r: any) => ({
        ...r,
        variacoes: Array.isArray(r.variacoes) ? r.variacoes : JSON.parse(r.variacoes || '[]'),
      })) as ProductPerformanceDB[];

      setData(typed);
      if (typed.length > 0) {
        setPeriodLabel(`${formatDate(typed[0].period_start)} a ${formatDate(typed[0].period_end)}`);
      }
    } catch (e) {
      console.error('[useProductPerformance] load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const importExcel = useCallback(async (file: File) => {
    if (!user?.id || !storeId) {
      toast.error('Selecione uma loja primeiro.');
      return;
    }
    try {
      setImporting(true);
      const { products, period_start, period_end } = await parseProductPerformanceExcel(file);

      if (products.length === 0) {
        toast.error('Nenhum produto encontrado no arquivo.');
        return;
      }

      const pStart = `${period_start.slice(0, 4)}-${period_start.slice(4, 6)}-${period_start.slice(6, 8)}`;
      const pEnd = `${period_end.slice(0, 4)}-${period_end.slice(4, 6)}-${period_end.slice(6, 8)}`;

      // Fetch existing ads data for matching
      const { data: adsRows } = await supabase
        .from('shopee_ads_by_product')
        .select('item_id, expense, gmv, roas, impressions, clicks, orders')
        .eq('user_id', user.id);

      const adsMap: Record<string, any> = {};
      if (adsRows) {
        for (const r of adsRows) {
          const key = String(r.item_id);
          if (!adsMap[key]) adsMap[key] = { expense: 0, gmv: 0, roas: 0, impressions: 0, clicks: 0, orders: 0 };
          adsMap[key].expense += Number(r.expense || 0);
          adsMap[key].gmv += Number(r.gmv || 0);
          adsMap[key].impressions += Number(r.impressions || 0);
          adsMap[key].clicks += Number(r.clicks || 0);
          adsMap[key].orders += Number(r.orders || 0);
        }
        for (const v of Object.values(adsMap)) {
          (v as any).roas = (v as any).expense > 0 ? (v as any).gmv / (v as any).expense : 0;
        }
      }

      const rows = products.map(p => {
        const ads = adsMap[p.item_id];
        return {
          user_id: user.id,
          store_id: storeId,
          item_id: p.item_id,
          nome: p.nome,
          period_start: pStart,
          period_end: pEnd,
          vendas_pago: p.vendas_pago,
          pedidos_pagos: p.pedidos_pagos,
          unidades_pagas: p.unidades_pagas,
          compradores_pagos: p.compradores_pagos,
          ticket_medio: p.ticket_medio,
          impressoes: p.impressoes,
          cliques: p.cliques,
          ctr: p.ctr,
          taxa_conversao: p.taxa_conversao,
          taxa_rejeicao: p.taxa_rejeicao,
          add_carrinho: p.add_carrinho,
          taxa_carrinho: p.taxa_carrinho,
          taxa_recompra: p.taxa_recompra,
          variacoes: p.variacoes,
          ads_roas: ads?.roas ?? null,
          ads_gasto: ads?.expense ?? null,
          ads_gmv: ads?.gmv ?? null,
          ads_pedidos: ads?.orders ?? null,
          ads_impressoes: ads?.impressions ?? null,
          ads_cliques: ads?.clicks ?? null,
          source: 'excel',
        };
      });

      // Upsert in batches of 50
      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase
          .from('product_performance')
          .upsert(batch as any, { onConflict: 'store_id,item_id,period_start,period_end' });
        if (error) throw error;
      }

      const semAds = rows.filter(r => !r.ads_roas).length;
      toast.success(`${products.length} produtos importados!${semAds > 0 ? ` (${semAds} sem dados de Ads)` : ''}`);
      await loadData();
    } catch (err: any) {
      console.error('[useProductPerformance] import error:', err);
      toast.error(err?.message || 'Erro ao importar arquivo.');
    } finally {
      setImporting(false);
    }
  }, [user?.id, storeId, loadData]);

  return { data, loading, importing, importExcel, periodLabel, reload: loadData };
}

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
