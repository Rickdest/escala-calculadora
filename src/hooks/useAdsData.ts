import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { parseShopeeAdsCSV, ParsedAdMetric } from '@/lib/shopeeAdsParser';
import { calcularRoasEmpate, classificarAnuncio, ClassificacaoResult, RoasEmpateResult } from '@/lib/adsLogic';
import { Product } from '@/types/store';
import { toast } from 'sonner';

export interface AdsDataRow {
  id: string;
  user_id: string;
  product_id: string | null;
  nome_produto_csv: string;
  shopee_product_id: string | null;
  impressoes: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  taxa_conversao: number;
  itens_vendidos: number;
  gmv: number;
  despesas: number;
  roas: number;
  acos: number;
  roas_direto: number;
  acos_direto: number;
  gmv_direto: number;
  custo_por_conversao: number;
  itens_vendidos_diretos: number;
  conversoes_diretas: number;
  metodo_lance: string | null;
  status_anuncio: string | null;
  impressoes_produto: number | null;
  cliques_produto: number | null;
  posicao_media: number | null;
  posicao_importada: boolean;
  roas_empate: number | null;
  margem_contribuicao: number | null;
  classificacao: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  importado_em: string;
  created_at: string;
}

export interface EnrichedAdsData extends AdsDataRow {
  product?: Product;
  classificacaoResult?: ClassificacaoResult;
  roasEmpateResult?: RoasEmpateResult;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findMatch(csvName: string, products: Product[]): Product | undefined {
  const n = normalize(csvName);
  let match = products.find(p => normalize(p.name) === n);
  if (match) return match;
  match = products.find(p => n.includes(normalize(p.name)) || normalize(p.name).includes(n));
  return match;
}

export function useAdsData() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [data, setData] = useState<EnrichedAdsData[]>([]);
  const [loading, setLoading] = useState(true);

  const products = currentStore?.products || [];
  const config = currentStore?.config;

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from('ads_data' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('importado_em', { ascending: false });

    if (rows) {
      const enriched: EnrichedAdsData[] = (rows as any[]).map((row: AdsDataRow) => {
        const product = row.product_id ? products.find(p => p.id === row.product_id) : undefined;
        let classificacaoResult: ClassificacaoResult | undefined;
        let roasEmpateResult: RoasEmpateResult | undefined;

        if (product && config) {
          roasEmpateResult = calcularRoasEmpate(product, config);
          if (roasEmpateResult.roasEmpate !== Infinity) {
            classificacaoResult = classificarAnuncio(row.roas_direto || row.roas, roasEmpateResult.roasEmpate);
          }
        } else if (row.roas_empate && row.roas_empate !== Infinity) {
          // Fallback: use DB-stored values when products haven't loaded yet
          roasEmpateResult = {
            roasEmpate: row.roas_empate,
            margemContribuicao: row.margem_contribuicao || 0,
            lucroPorUnidade: 0,
            acosMaximo: row.margem_contribuicao || 0,
          };
          classificacaoResult = classificarAnuncio(row.roas_direto || row.roas, row.roas_empate);
        }

        return { ...row, product, classificacaoResult, roasEmpateResult };
      });
      setData(enriched);
    }
    setLoading(false);
  }, [user, products, config]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const importGeneralCSV = useCallback(async (csvText: string) => {
    if (!user) return;
    const parsed = parseShopeeAdsCSV(csvText);
    if (!parsed || parsed.metrics.length === 0) {
      toast.error('CSV inválido ou sem dados');
      return;
    }

    // Delete old general import data
    await supabase.from('ads_data' as any).delete()
      .eq('user_id', user.id).eq('posicao_importada', false);

    const rows = parsed.metrics.map((m: ParsedAdMetric) => {
      const matched = findMatch(m.shopeeProductName, products);
      let roasEmpate: number | null = null;
      let margemContribuicao: number | null = null;
      let classificacao: string | null = null;

      if (matched && config) {
        const emp = calcularRoasEmpate(matched, config);
        if (emp.roasEmpate !== Infinity) {
          roasEmpate = emp.roasEmpate;
          margemContribuicao = emp.margemContribuicao;
          const cls = classificarAnuncio(m.directRoas || m.roas, emp.roasEmpate);
          classificacao = cls.classificacao;
        }
      }

      return {
        user_id: user.id,
        product_id: matched?.id || null,
        nome_produto_csv: m.shopeeProductName,
        shopee_product_id: m.shopeeProductId || null,
        impressoes: m.impressions,
        cliques: m.clicks,
        ctr: m.ctr,
        conversoes: (m as any).conversions || 0,
        taxa_conversao: m.convRate,
        itens_vendidos: m.itemsSold,
        gmv: m.gmv,
        despesas: m.spend,
        roas: m.roas,
        acos: m.acos,
        roas_direto: m.directRoas,
        acos_direto: m.directAcos,
        gmv_direto: (m as any).directGmv || 0,
        custo_por_conversao: m.costPerConv,
        itens_vendidos_diretos: (m as any).directItemsSold || 0,
        conversoes_diretas: (m as any).directConversions || (m as any).conversions || 0,
        metodo_lance: (m as any).bidMethod || null,
        status_anuncio: (m as any).status || null,
        impressoes_produto: (m as any).productImpressions ?? null,
        cliques_produto: (m as any).productClicks ?? null,
        posicao_media: null,
        posicao_importada: false,
        roas_empate: roasEmpate,
        margem_contribuicao: margemContribuicao,
        classificacao,
        periodo_inicio: m.periodStart,
        periodo_fim: m.periodEnd,
      };
    });

    const { error } = await supabase.from('ads_data' as any).insert(rows);
    if (error) {
      toast.error('Erro ao salvar dados');
      console.error(error);
    } else {
      toast.success(`${rows.length} produtos importados com sucesso`);
      await fetchData();
    }
  }, [user, products, config, fetchData]);

  const importProductCSV = useCallback(async (csvText: string, targetAdsDataId?: string) => {
    if (!user) return;
    const parsed = parseShopeeAdsCSV(csvText);
    if (!parsed || parsed.metrics.length === 0 || parsed.format !== 'product') {
      toast.error('CSV inválido. Use o relatório "Por Produto" da Shopee.');
      return;
    }

    const m = parsed.metrics[0];
    const avgPos = m.avgPosition;

    // Helper to calculate derived metrics for a given product
    const calcDerived = (productId: string | null) => {
      const product = productId ? products.find(p => p.id === productId) : undefined;
      let roasEmpate: number | null = null;
      let margemContribuicao: number | null = null;
      let classificacao: string | null = null;

      if (product && config) {
        const emp = calcularRoasEmpate(product, config);
        if (emp.roasEmpate !== Infinity) {
          roasEmpate = emp.roasEmpate;
          margemContribuicao = emp.margemContribuicao;
          const roasForClass = m.directRoas || m.roas;
          const cls = classificarAnuncio(roasForClass, emp.roasEmpate);
          classificacao = cls.classificacao;
        }
      }
      return { roas_empate: roasEmpate, margem_contribuicao: margemContribuicao, classificacao };
    };

    if (targetAdsDataId) {
      // Get the existing row to find its product_id
      const existingRow = data.find(d => d.id === targetAdsDataId);
      const derived = calcDerived(existingRow?.product_id || null);

      await supabase.from('ads_data' as any).update({
        posicao_media: avgPos,
        posicao_importada: true,
        ...derived,
        ...(m.impressions > 0 ? {
          impressoes: m.impressions, cliques: m.clicks, ctr: m.ctr,
          itens_vendidos: m.itemsSold, gmv: m.gmv, despesas: m.spend,
          roas: m.roas, acos: m.acos, custo_por_conversao: m.costPerConv,
          taxa_conversao: m.convRate,
        } : {}),
      }).eq('id', targetAdsDataId);
    } else {
      const matched = findMatch(m.shopeeProductName, products);
      const derived = calcDerived(matched?.id || null);

      // Dedup: check if a row already exists for same product + period
      const existingQuery = await supabase.from('ads_data' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('nome_produto_csv', m.shopeeProductName)
        .eq('periodo_inicio', m.periodStart)
        .eq('periodo_fim', m.periodEnd)
        .limit(1);

      const existingId = (existingQuery.data as any[])?.[0]?.id;

      const rowData = {
        user_id: user.id,
        product_id: matched?.id || null,
        nome_produto_csv: m.shopeeProductName,
        shopee_product_id: m.shopeeProductId || null,
        impressoes: m.impressions, cliques: m.clicks, ctr: m.ctr,
        conversoes: 0, taxa_conversao: m.convRate,
        itens_vendidos: m.itemsSold, gmv: m.gmv, despesas: m.spend,
        roas: m.roas, acos: m.acos,
        roas_direto: m.directRoas || 0, acos_direto: m.directAcos || 0,
        gmv_direto: (m as any).directGmv || 0,
        custo_por_conversao: m.costPerConv,
        posicao_media: avgPos, posicao_importada: true,
        periodo_inicio: m.periodStart, periodo_fim: m.periodEnd,
        ...derived,
      };

      if (existingId) {
        await supabase.from('ads_data' as any).update(rowData).eq('id', existingId);
      } else {
        await supabase.from('ads_data' as any).insert(rowData);
      }
    }

    toast.success('Dados de posição importados');
    await fetchData();
  }, [user, products, config, data, fetchData]);

  const linkProduct = useCallback(async (adsDataId: string, productId: string) => {
    if (!user) return;
    const product = products.find(p => p.id === productId);
    const row = data.find(d => d.id === adsDataId);
    let roasEmpate: number | null = null;
    let margemContribuicao: number | null = null;
    let classificacao: string | null = null;

    if (product && config && row) {
      const emp = calcularRoasEmpate(product, config);
      if (emp.roasEmpate !== Infinity) {
        roasEmpate = emp.roasEmpate;
        margemContribuicao = emp.margemContribuicao;
        const cls = classificarAnuncio(row.roas_direto || row.roas, emp.roasEmpate);
        classificacao = cls.classificacao;
      }
    }

    await supabase.from('ads_data' as any).update({
      product_id: productId, roas_empate: roasEmpate,
      margem_contribuicao: margemContribuicao, classificacao,
    }).eq('id', adsDataId);

    toast.success('Produto vinculado');
    await fetchData();
  }, [user, products, config, data, fetchData]);

  const unlinkProduct = useCallback(async (adsDataId: string) => {
    await supabase.from('ads_data' as any).update({
      product_id: null, roas_empate: null,
      margem_contribuicao: null, classificacao: null,
    }).eq('id', adsDataId);
    toast.info('Produto desvinculado');
    await fetchData();
  }, [fetchData]);

  const deleteAdsData = useCallback(async (id: string) => {
    await supabase.from('ads_data' as any).delete().eq('id', id);
    setData(prev => prev.filter(d => d.id !== id));
    toast.info('Dados removidos');
  }, []);

  const deleteAll = useCallback(async () => {
    if (!user) return;
    await supabase.from('ads_data' as any).delete().eq('user_id', user.id);
    setData([]);
    toast.info('Todos os dados de Ads removidos');
  }, [user]);

  return {
    data, loading, reload: fetchData,
    importGeneralCSV, importProductCSV,
    linkProduct, unlinkProduct,
    deleteAdsData, deleteAll,
  };
}
