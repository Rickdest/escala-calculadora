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
  const [importingAds, setImportingAds] = useState(false);
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

  // Import data from shopee_ads_by_product into product_performance
  const importFromAdsApi = useCallback(async () => {
    if (!user?.id || !storeId) {
      toast.error('Selecione uma loja primeiro.');
      return;
    }
    try {
      setImportingAds(true);

      const { data: adsRows, error: adsError } = await supabase
        .from('shopee_ads_by_product')
        .select('*')
        .eq('user_id', user.id);

      if (adsError) throw adsError;
      if (!adsRows || adsRows.length === 0) {
        toast.info('Nenhum dado de Ads encontrado. Sincronize primeiro na aba Integrações.');
        return;
      }

      // Aggregate by item_id
      const itemMap: Record<string, {
        item_name: string;
        expense: number; gmv: number; impressions: number; clicks: number; orders: number;
        period_start: string; period_end: string;
      }> = {};

      for (const r of adsRows) {
        const key = String(r.item_id);
        if (!itemMap[key]) {
          itemMap[key] = {
            item_name: r.item_name || `Produto ${r.item_id}`,
            expense: 0, gmv: 0, impressions: 0, clicks: 0, orders: 0,
            period_start: r.period_start, period_end: r.period_end,
          };
        }
        const m = itemMap[key];
        m.expense += Number(r.expense || 0);
        m.gmv += Number(r.gmv || 0);
        m.impressions += Number(r.impressions || 0);
        m.clicks += Number(r.clicks || 0);
        m.orders += Number(r.orders || 0);
        if (r.period_start < m.period_start) m.period_start = r.period_start;
        if (r.period_end > m.period_end) m.period_end = r.period_end;
      }

      // Fetch existing records to decide update vs insert
      const { data: existing } = await supabase
        .from('product_performance')
        .select('id, item_id, source')
        .eq('user_id', user.id)
        .eq('store_id', storeId);

      const existingMap: Record<string, { id: string; source: string }> = {};
      if (existing) {
        for (const e of existing) {
          existingMap[e.item_id] = { id: e.id, source: e.source || 'excel' };
        }
      }

      let updated = 0, inserted = 0;
      for (const [itemId, m] of Object.entries(itemMap)) {
        const adsFields = {
          ads_roas: m.expense > 0 ? m.gmv / m.expense : 0,
          ads_gasto: m.expense,
          ads_gmv: m.gmv,
          ads_pedidos: m.orders,
          ads_impressoes: m.impressions,
          ads_cliques: m.clicks,
        };

        const ex = existingMap[itemId];
        if (ex) {
          // Update only ads fields, preserve organic data
          const updateData: any = { ...adsFields };
          if (ex.source === 'ads_api') {
            // Also update revenue approximations since no Excel data yet
            updateData.vendas_pago = m.gmv;
            updateData.pedidos_pagos = m.orders;
            updateData.unidades_pagas = m.orders;
            updateData.ticket_medio = m.orders > 0 ? m.gmv / m.orders : 0;
            updateData.period_start = m.period_start;
            updateData.period_end = m.period_end;
          }
          const { error } = await supabase
            .from('product_performance')
            .update(updateData)
            .eq('id', ex.id);
          if (error) throw error;
          updated++;
        } else {
          // Insert new record with ads data
          const { error } = await supabase
            .from('product_performance')
            .insert({
              user_id: user.id,
              store_id: storeId,
              item_id: itemId,
              nome: m.item_name,
              period_start: m.period_start,
              period_end: m.period_end,
              vendas_pago: m.gmv,
              pedidos_pagos: m.orders,
              unidades_pagas: m.orders,
              compradores_pagos: 0,
              ticket_medio: m.orders > 0 ? m.gmv / m.orders : 0,
              impressoes: 0, cliques: 0, ctr: 0,
              taxa_conversao: 0, taxa_rejeicao: 0,
              add_carrinho: 0, taxa_carrinho: 0, taxa_recompra: 0,
              variacoes: [],
              ...adsFields,
              source: 'ads_api',
            } as any);
          if (error) throw error;
          inserted++;
        }
      }

      toast.success(`Ads importados! ${inserted} novos, ${updated} atualizados.`);
      await loadData();
    } catch (err: any) {
      console.error('[useProductPerformance] importFromAdsApi error:', err);
      toast.error(err?.message || 'Erro ao importar dados de Ads.');
    } finally {
      setImportingAds(false);
    }
  }, [user?.id, storeId, loadData]);

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

  const clearData = useCallback(async () => {
    if (!user?.id || !storeId) return;
    try {
      const { error } = await supabase
        .from('product_performance')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId);
      if (error) throw error;
      setData([]);
      setPeriodLabel(null);
      toast.success('Dados de performance removidos.');
    } catch (err: any) {
      console.error('[useProductPerformance] clearData error:', err);
      toast.error(err?.message || 'Erro ao limpar dados.');
    }
  }, [user?.id, storeId]);

  return { data, loading, importing, importingAds, importExcel, importFromAdsApi, clearData, periodLabel, reload: loadData };
}

function formatDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
