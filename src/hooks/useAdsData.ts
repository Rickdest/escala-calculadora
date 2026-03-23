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

        // Use roas as fallback when roas_direto is 0
        const effectiveRoas = row.roas_direto && row.roas_direto > 0 ? row.roas_direto : row.roas;

        if (product && config) {
          roasEmpateResult = calcularRoasEmpate(product, config);
          if (roasEmpateResult.roasEmpate !== Infinity && roasEmpateResult.roasEmpate > 0) {
            classificacaoResult = classificarAnuncio(effectiveRoas, roasEmpateResult.roasEmpate);
          }
        } else if (row.roas_empate && row.roas_empate !== Infinity && row.roas_empate > 0) {
          roasEmpateResult = {
            roasEmpate: row.roas_empate,
            margemContribuicao: row.margem_contribuicao || 0,
            lucroPorUnidade: 0,
            acosMaximo: row.margem_contribuicao || 0,
          };
          classificacaoResult = classificarAnuncio(effectiveRoas, row.roas_empate);
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

    // Delete old general import data (rows without real position data)
    await supabase.from('ads_data' as any).delete()
      .eq('user_id', user.id)
      .is('posicao_media', null);

    const rows = parsed.metrics.map((m: ParsedAdMetric) => {
      const matched = findMatch(m.shopeeProductName, products);
      let roasEmpate: number | null = null;
      let margemContribuicao: number | null = null;
      let classificacao: string | null = null;

      // Use roas as fallback when directRoas is 0
      const effectiveRoas = m.directRoas && m.directRoas > 0 ? m.directRoas : m.roas;

      if (matched && config) {
        const emp = calcularRoasEmpate(matched, config);
        if (emp.roasEmpate !== Infinity && emp.roasEmpate > 0) {
          roasEmpate = emp.roasEmpate;
          margemContribuicao = emp.margemContribuicao;
          const cls = classificarAnuncio(effectiveRoas, emp.roasEmpate);
          classificacao = cls.classificacao;
        }
      }

      return {
        user_id: user.id,
        product_id: matched?.id || null,
        nome_produto_csv: m.shopeeProductName || `Produto ${m.shopeeProductId || 'Desconhecido'}`,
        shopee_product_id: m.shopeeProductId || null,
        impressoes: m.impressions,
        cliques: m.clicks,
        ctr: m.ctr,
        conversoes: m.conversions || 0,
        taxa_conversao: m.convRate,
        itens_vendidos: m.itemsSold,
        gmv: m.gmv,
        despesas: m.spend,
        roas: m.roas,
        acos: m.acos,
        roas_direto: m.directRoas,
        acos_direto: m.directAcos,
        gmv_direto: m.directGmv || m.gmv,
        custo_por_conversao: m.costPerConv,
        itens_vendidos_diretos: m.directItemsSold || m.itemsSold,
        conversoes_diretas: m.directConversions || m.conversions || 0,
        metodo_lance: m.bidMethod || null,
        status_anuncio: m.status || null,
        impressoes_produto: m.productImpressions ?? null,
        cliques_produto: m.productClicks ?? null,
        posicao_media: null,
        posicao_importada: false,
        roas_empate: roasEmpate,
        margem_contribuicao: margemContribuicao,
        classificacao,
        periodo_inicio: m.periodStart,
        periodo_fim: m.periodEnd,
      };
    });

    // Deduplicate by shopee_product_id or nome_produto_csv
    const uniqueRows = Object.values(
      rows.reduce((acc, row) => {
        const key = row.shopee_product_id || row.nome_produto_csv;
        if (!acc[key]) {
          acc[key] = row;
        } else {
          // Sum metrics
          acc[key].impressoes += row.impressoes;
          acc[key].cliques += row.cliques;
          acc[key].itens_vendidos += row.itens_vendidos;
          acc[key].gmv += row.gmv;
          acc[key].despesas += row.despesas;
          acc[key].gmv_direto += row.gmv_direto;
          acc[key].itens_vendidos_diretos += row.itens_vendidos_diretos;
          acc[key].conversoes += row.conversoes;
          acc[key].conversoes_diretas += row.conversoes_diretas;
          // Recalculate derived
          acc[key].ctr = acc[key].impressoes > 0 ? (acc[key].cliques / acc[key].impressoes) * 100 : 0;
          acc[key].roas = acc[key].despesas > 0 ? acc[key].gmv / acc[key].despesas : 0;
          acc[key].acos = acc[key].gmv > 0 ? (acc[key].despesas / acc[key].gmv) * 100 : 0;
          acc[key].taxa_conversao = acc[key].cliques > 0 ? (acc[key].conversoes / acc[key].cliques) * 100 : 0;
          acc[key].custo_por_conversao = acc[key].conversoes > 0 ? acc[key].despesas / acc[key].conversoes : 0;
          acc[key].roas_direto = acc[key].despesas > 0 ? acc[key].gmv_direto / acc[key].despesas : 0;
          acc[key].acos_direto = acc[key].gmv_direto > 0 ? (acc[key].despesas / acc[key].gmv_direto) * 100 : 0;
        }
        return acc;
      }, {} as Record<string, typeof rows[0]>)
    );

    const { error } = await supabase.from('ads_data' as any).insert(uniqueRows);
    if (error) {
      toast.error('Erro ao salvar dados');
      console.error(error);
    } else {
      toast.success(`${uniqueRows.length} produtos importados com sucesso`);
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
    const hasRealPosition = avgPos !== null && avgPos > 0;

    // Helper to calculate derived metrics for a given product
    const calcDerived = (productId: string | null) => {
      const product = productId ? products.find(p => p.id === productId) : undefined;
      let roasEmpate: number | null = null;
      let margemContribuicao: number | null = null;
      let classificacao: string | null = null;

      // Use roas as fallback when directRoas is 0
      const effectiveRoas = m.directRoas && m.directRoas > 0 ? m.directRoas : m.roas;

      if (product && config) {
        const emp = calcularRoasEmpate(product, config);
        if (emp.roasEmpate !== Infinity && emp.roasEmpate > 0) {
          roasEmpate = emp.roasEmpate;
          margemContribuicao = emp.margemContribuicao;
          const cls = classificarAnuncio(effectiveRoas, emp.roasEmpate);
          classificacao = cls.classificacao;
        }
      }
      return { roas_empate: roasEmpate, margem_contribuicao: margemContribuicao, classificacao };
    };

    console.log('[AdsImport] Product CSV:', { avgPos, hasRealPosition, targetAdsDataId, productName: m.shopeeProductName, shopeeProductId: m.shopeeProductId });

    if (targetAdsDataId) {
      // Get the existing row to find its product_id
      const existingRow = data.find(d => d.id === targetAdsDataId);
      const derived = calcDerived(existingRow?.product_id || null);

      await supabase.from('ads_data' as any).update({
        // Only overwrite position if new CSV has real position data
        ...(hasRealPosition ? { posicao_media: avgPos, posicao_importada: true } : {}),
        ...derived,
        ...(m.impressions > 0 ? {
          impressoes: m.impressions, cliques: m.clicks, ctr: m.ctr,
          itens_vendidos: m.itemsSold, gmv: m.gmv, despesas: m.spend,
          roas: m.roas, acos: m.acos, custo_por_conversao: m.costPerConv,
          taxa_conversao: m.convRate,
          roas_direto: m.directRoas || m.roas,
          gmv_direto: m.directGmv || m.gmv,
          itens_vendidos_diretos: m.directItemsSold || m.itemsSold,
          conversoes_diretas: m.directConversions || 0,
        } : {}),
      }).eq('id', targetAdsDataId);
    } else {
      const matched = findMatch(m.shopeeProductName, products);
      const derived = calcDerived(matched?.id || null);

      // Dedup: search by shopee_product_id first (most reliable, without period restriction)
      let existingId: string | undefined;

      if (m.shopeeProductId) {
        const byIdQuery = await supabase.from('ads_data' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('shopee_product_id', m.shopeeProductId)
          .order('importado_em', { ascending: false })
          .limit(1);
        existingId = (byIdQuery.data as any[])?.[0]?.id;
      }

      // Fallback: search by name + period
      if (!existingId) {
        const byNameQuery = await supabase.from('ads_data' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('nome_produto_csv', m.shopeeProductName)
          .eq('periodo_inicio', m.periodStart)
          .eq('periodo_fim', m.periodEnd)
          .limit(1);
        existingId = (byNameQuery.data as any[])?.[0]?.id;
      }

      // Fallback: fuzzy match by normalized name
      if (!existingId) {
        const allRows = await supabase.from('ads_data' as any)
          .select('id, nome_produto_csv, shopee_product_id')
          .eq('user_id', user.id)
          .limit(100);
        const normalizedName = normalize(m.shopeeProductName);
        const fuzzyMatch = (allRows.data as any[])?.find((r: any) => {
          const rName = normalize(r.nome_produto_csv);
          return rName.includes(normalizedName) || normalizedName.includes(rName);
        });
        existingId = fuzzyMatch?.id;
      }

      console.log('[AdsImport] Dedup result:', { existingId, productName: m.shopeeProductName });

      const rowData = {
        user_id: user.id,
        product_id: matched?.id || null,
        nome_produto_csv: m.shopeeProductName || `Produto ${m.shopeeProductId || 'Desconhecido'}`,
        shopee_product_id: m.shopeeProductId || null,
        impressoes: m.impressions, cliques: m.clicks, ctr: m.ctr,
        conversoes: m.conversions || 0, taxa_conversao: m.convRate,
        itens_vendidos: m.itemsSold, gmv: m.gmv, despesas: m.spend,
        roas: m.roas, acos: m.acos,
        roas_direto: m.directRoas || m.roas,
        acos_direto: m.directAcos || m.acos,
        gmv_direto: m.directGmv || m.gmv,
        custo_por_conversao: m.costPerConv,
        itens_vendidos_diretos: m.directItemsSold || m.itemsSold,
        conversoes_diretas: m.directConversions || 0,
        ...(hasRealPosition ? { posicao_media: avgPos, posicao_importada: true } : {}),
        periodo_inicio: m.periodStart, periodo_fim: m.periodEnd,
        ...derived,
      };

      if (existingId) {
        await supabase.from('ads_data' as any).update(rowData).eq('id', existingId);
      } else {
        await supabase.from('ads_data' as any).insert(rowData);
      }
    }

    if (hasRealPosition) {
      toast.success(`📍 Posição #${avgPos} na Pesquisa detectada!`, {
        description: 'O Posicionamento Médio foi extraído automaticamente do CSV.',
        duration: 5000,
      });
    } else {
      toast.success('Dados do produto importados com sucesso');
    }
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
      if (emp.roasEmpate !== Infinity && emp.roasEmpate > 0) {
        roasEmpate = emp.roasEmpate;
        margemContribuicao = emp.margemContribuicao;
        const effectiveRoas = row.roas_direto && row.roas_direto > 0 ? row.roas_direto : row.roas;
        const cls = classificarAnuncio(effectiveRoas, emp.roasEmpate);
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
