import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { parseShopeeAdsCSV, ParsedAdMetric } from '@/lib/shopeeAdsParser';
import { calcularRoasEmpate, classificarAnuncio, ClassificacaoResult, RoasEmpateResult } from '@/lib/adsLogic';
import { Product } from '@/types/store';
import { toast } from 'sonner';

const MAX_IMPORTS_PER_MINUTE = 5;

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

/** Calculates similarity ratio between two strings (0-1) using longest common subsequence */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const lenA = a.length;
  const lenB = b.length;
  const dp: number[][] = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return (2 * dp[lenA][lenB]) / (lenA + lenB);
}

const MATCH_THRESHOLD = 0.75;

function findMatch(csvName: string, products: Product[], shopeeProductId?: string | null): Product | undefined {
  // 1) Match by shopee_product_id (exact numeric match)
  if (shopeeProductId) {
    const byShopeeId = products.find(p => {
      const pShopeeId = (p as any).shopeeProductId || String((p as any).shopeeItemId || '');
      return pShopeeId === shopeeProductId || String(p.shopeeItemId) === shopeeProductId;
    });
    if (byShopeeId) return byShopeeId;
  }
  
  const n = normalize(csvName);
  // 2) Exact name match
  const exact = products.find(p => normalize(p.name) === n);
  if (exact) return exact;
  // 3) Similarity-based match (must exceed threshold)
  let best: Product | undefined;
  let bestScore = 0;
  for (const p of products) {
    const score = similarity(n, normalize(p.name));
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? best : undefined;
}

export function useAdsData() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [data, setData] = useState<EnrichedAdsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);
  const dataRef = useRef<EnrichedAdsData[]>([]);
  const hasResolved = useRef(false);
  const operationLock = useRef(false);
  const importCount = useRef(0);
  const importResetTimer = useRef<ReturnType<typeof setTimeout>>();

  const acquireLock = useCallback(() => {
    if (operationLock.current) return false;
    operationLock.current = true;
    setOperating(true);
    return true;
  }, []);

  const releaseLock = useCallback(() => {
    operationLock.current = false;
    setOperating(false);
  }, []);

  const checkRateLimit = useCallback(() => {
    if (importCount.current >= MAX_IMPORTS_PER_MINUTE) {
      toast.error('Muitas importações seguidas. Aguarde 1 minuto.');
      return false;
    }
    importCount.current++;
    if (!importResetTimer.current) {
      importResetTimer.current = setTimeout(() => {
        importCount.current = 0;
        importResetTimer.current = undefined;
      }, 60000);
    }
    return true;
  }, []);

  const products = currentStore?.products || [];
  const config = currentStore?.config;

  const fetchData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    if (!hasResolved.current) setLoading(true);
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
      dataRef.current = enriched;
    }
    hasResolved.current = true;
    setLoading(false);
  }, [user?.id, products, config]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const importGeneralCSV = useCallback(async (csvText: string) => {
    if (!user) { toast.error('Faça login para importar'); return; }
    if (!currentStore) { toast.error('Selecione uma loja primeiro'); return; }
    if (!acquireLock()) { toast.error('Operação em andamento...'); return; }
    if (!checkRateLimit()) { releaseLock(); return; }
    try {
    const parsed = parseShopeeAdsCSV(csvText);
    if (!parsed || parsed.metrics.length === 0) {
      toast.error('CSV inválido ou sem dados');
      return;
    }

    const periodStart = parsed.metrics[0].periodStart;
    const periodEnd = parsed.metrics[0].periodEnd;

    let linkedCount = 0;
    let autoCreatedCount = 0;
    let noMatchCount = 0;

    const rows = [];
    for (const m of parsed.metrics) {
      let matched = findMatch(m.shopeeProductName, products, m.shopeeProductId);
      
      // Auto-create draft product if shopeeProductId exists but no match
      if (!matched && m.shopeeProductId && currentStore) {
        try {
          const { data: newProd } = await supabase.from('products').insert({
            store_id: currentStore.id,
            user_id: user.id,
            name: m.shopeeProductName || `Produto ${m.shopeeProductId}`,
            cost_price: 0,
            sale_price: m.gmv && m.itemsSold > 0 ? Math.round((m.gmv / m.itemsSold) * 100) / 100 : 0,
            shopee_product_id: m.shopeeProductId,
            draft: true,
            source: 'ads_csv',
          } as any).select('id').single();
          
          if (newProd) {
            matched = { id: newProd.id, name: m.shopeeProductName, storeId: currentStore.id } as Product;
            autoCreatedCount++;
          }
        } catch { /* ignore auto-create failures */ }
      }

      if (matched) {
        linkedCount++;
      } else {
        noMatchCount++;
      }

      let roasEmpate: number | null = null;
      let margemContribuicao: number | null = null;
      let classificacao: string | null = null;
      const effectiveRoas = m.directRoas && m.directRoas > 0 ? m.directRoas : m.roas;

      if (matched && config) {
        const realProduct = products.find(p => p.id === matched!.id) || matched;
        const emp = calcularRoasEmpate(realProduct, config);
        if (emp.roasEmpate !== Infinity && emp.roasEmpate > 0) {
          roasEmpate = emp.roasEmpate;
          margemContribuicao = emp.margemContribuicao;
          const cls = classificarAnuncio(effectiveRoas, emp.roasEmpate);
          classificacao = cls.classificacao;
        }
      }

      rows.push({
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
      });
    }

    // Deduplicate within the CSV by shopee_product_id or nome_produto_csv
    const uniqueRows = Object.values(
      rows.reduce((acc, row) => {
        const key = row.shopee_product_id || row.nome_produto_csv;
        if (!acc[key]) {
          acc[key] = row;
        } else {
          acc[key].impressoes += row.impressoes;
          acc[key].cliques += row.cliques;
          acc[key].itens_vendidos += row.itens_vendidos;
          acc[key].gmv += row.gmv;
          acc[key].despesas += row.despesas;
          acc[key].gmv_direto += row.gmv_direto;
          acc[key].itens_vendidos_diretos += row.itens_vendidos_diretos;
          acc[key].conversoes += row.conversoes;
          acc[key].conversoes_diretas += row.conversoes_diretas;
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

    // Delete existing data for this period, then insert fresh
    if (uniqueRows.length > 0) {
      const firstRow = uniqueRows[0] as typeof rows[0];
      await supabase.from('ads_data' as any).delete()
        .eq('user_id', user.id)
        .eq('periodo_inicio', firstRow.periodo_inicio)
        .eq('periodo_fim', firstRow.periodo_fim);
    }

    const { error } = await supabase.from('ads_data' as any).insert(uniqueRows);

    if (error) {
      toast.error('Erro ao salvar dados');
      console.error(error);
    } else {
      const parts = [`${uniqueRows.length} produtos processados`];
      if (linkedCount > 0) parts.push(`${linkedCount} vinculados`);
      toast.success(parts.join(' · '));
      
      if (autoCreatedCount > 0) {
        toast.info(
          `${autoCreatedCount} produto${autoCreatedCount > 1 ? 's' : ''} novo${autoCreatedCount > 1 ? 's' : ''} criado${autoCreatedCount > 1 ? 's' : ''} automaticamente. Preencha o custo para calcular a margem real.`,
          {
            action: {
              label: 'Ver produtos →',
              onClick: () => window.location.href = '/products?filter=draft',
            },
            duration: 8000,
          }
        );
      }
      
      if (noMatchCount > 0 && autoCreatedCount === 0) {
        toast.warning(`${noMatchCount} anúncio${noMatchCount > 1 ? 's' : ''} sem vínculo. Use o relatório por produto para vincular automaticamente.`);
      }
      
      await fetchData();
    }
    } finally { releaseLock(); }
  }, [user, currentStore, products, config, fetchData, acquireLock, releaseLock, checkRateLimit]);

  const importProductCSV = useCallback(async (csvText: string, targetAdsDataId?: string) => {
    if (!user) { toast.error('Faça login para importar'); return; }
    if (!acquireLock()) { toast.error('Operação em andamento...'); return; }
    if (!checkRateLimit()) { releaseLock(); return; }
    try {
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

    if (targetAdsDataId) {
      // Get the existing row to find its product_id
      const existingRow = dataRef.current.find(d => d.id === targetAdsDataId);
      const derived = calcDerived(existingRow?.product_id || null);

      await supabase.from('ads_data' as any).update({
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
      }).eq('id', targetAdsDataId).eq('user_id', user.id);
    } else {
      const matched = findMatch(m.shopeeProductName, products, m.shopeeProductId);
      const derived = calcDerived(matched?.id || null);

      // Fetch existing records for this user to find overlapping periods
      const { data: allExisting } = await supabase.from('ads_data' as any)
        .select('id, nome_produto_csv, shopee_product_id, periodo_inicio, periodo_fim, posicao_importada')
        .eq('user_id', user.id);
      const existingRows = (allExisting || []) as any[];

      // Find overlapping records by product identity + period overlap
      const overlapping = existingRows.filter(e => {
        const nameMatch = e.shopee_product_id && m.shopeeProductId
          ? e.shopee_product_id === m.shopeeProductId
          : normalize(e.nome_produto_csv) === normalize(m.shopeeProductName)
            || normalize(e.nome_produto_csv).includes(normalize(m.shopeeProductName))
            || normalize(m.shopeeProductName).includes(normalize(e.nome_produto_csv));
        if (!nameMatch) return false;
        // Period overlap check: inicioA <= fimB && inicioB <= fimA
        return e.periodo_inicio <= m.periodEnd && m.periodStart <= e.periodo_fim;
      });

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

      if (overlapping.length > 0) {
        // If importing position-only CSV, update existing record instead of replacing
        if (hasRealPosition && !m.impressions) {
          await supabase.from('ads_data' as any).update({
            posicao_media: avgPos,
            posicao_importada: true,
            ...derived,
          }).eq('id', overlapping[0].id);
        } else {
          // Preserve product_id from existing record if new doesn't have one
          const existingWithProduct = overlapping.find((e: any) => e.product_id);
          if (existingWithProduct && !rowData.product_id) {
            rowData.product_id = existingWithProduct.product_id;
          }
          // Delete all overlapping and insert new
          const idsToDelete = overlapping.map((e: any) => e.id);
          await supabase.from('ads_data' as any).delete().in('id', idsToDelete);
          await supabase.from('ads_data' as any).insert(rowData);
        }
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
    } finally { releaseLock(); }
  }, [user, products, config, fetchData, acquireLock, releaseLock, checkRateLimit]);

  const linkProduct = useCallback(async (adsDataId: string, productId: string) => {
    if (!user) return;
    if (!acquireLock()) return;
    try {
    const product = products.find(p => p.id === productId);
    const row = dataRef.current.find(d => d.id === adsDataId);
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
    }).eq('id', adsDataId).eq('user_id', user.id);

    toast.success('Produto vinculado');
    await fetchData();
    } finally { releaseLock(); }
  }, [user, products, config, fetchData, acquireLock, releaseLock]);

  const unlinkProduct = useCallback(async (adsDataId: string) => {
    if (!user) return;
    await supabase.from('ads_data' as any).update({
      product_id: null, roas_empate: null,
      margem_contribuicao: null, classificacao: null,
    }).eq('id', adsDataId).eq('user_id', user.id);
    toast.info('Produto desvinculado');
    await fetchData();
  }, [user, fetchData]);

  const deleteAdsData = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('ads_data' as any).delete().eq('id', id).eq('user_id', user.id);
    setData(prev => prev.filter(d => d.id !== id));
    toast.info('Dados removidos');
  }, [user]);

  const deleteAll = useCallback(async () => {
    if (!user) return;
    await supabase.from('ads_data' as any).delete().eq('user_id', user.id);
    setData([]);
    toast.info('Todos os dados de Ads removidos');
  }, [user]);

  const importFromApi = useCallback(async (adsPerformance: any) => {
    if (!user || !currentStore) return;
    if (!acquireLock()) { toast.error('Operação em andamento...'); return; }
    try {
      const adsByProduct = adsPerformance?.ads_by_product || [];
      const shopSummary = adsPerformance?.shop_summary;
      
      // If no per-product data AND no shop summary, nothing to import
      if (adsByProduct.length === 0 && (!shopSummary || shopSummary.impressions === 0)) {
        toast.info('Nenhum dado de Ads retornado pela API.');
        return;
      }

      const periodStart = adsPerformance.period_start;
      const periodEnd = adsPerformance.period_end;
      
      // If we have shop summary but no per-product breakdown, create a single "Loja Total" entry
      const effectiveAdsByProduct = adsByProduct.length > 0
        ? adsByProduct
        : [{
            item_id: 0,
            item_name: 'Total da Loja (Ads)',
            impressions: shopSummary.impressions,
            clicks: shopSummary.clicks,
            expense: shopSummary.expense,
            gmv: shopSummary.gmv,
            orders: shopSummary.orders,
            ctr: shopSummary.ctr,
            roas: shopSummary.roas,
          }];

      let linkedCount = 0;
      let autoCreatedCount = 0;

      const rows = [];
      for (const ad of effectiveAdsByProduct) {
        const itemId = String(ad.item_id);
        
        // Match by shopee_item_id
        let matched = products.find(p => String(p.shopeeItemId) === itemId);
        
        // Also try shopee_product_id
        if (!matched) {
          matched = products.find(p => (p as any).shopeeProductId === itemId);
        }

        // Auto-create draft if no match
        if (!matched && currentStore) {
          try {
            const { data: newProd } = await supabase.from('products').insert({
              store_id: currentStore.id,
              user_id: user.id,
              name: ad.item_name || `Produto ${itemId}`,
              cost_price: 0,
              sale_price: ad.orders > 0 ? Math.round((ad.gmv / ad.orders) * 100) / 100 : 0,
              shopee_item_id: ad.item_id,
              shopee_product_id: itemId,
              draft: true,
              source: 'ads_api',
            } as any).select('id').single();
            
            if (newProd) {
              matched = { id: newProd.id, name: ad.item_name, storeId: currentStore.id } as Product;
              autoCreatedCount++;
            }
          } catch { /* ignore */ }
        }

        if (matched) linkedCount++;

        let roasEmpate: number | null = null;
        let margemContribuicao: number | null = null;
        let classificacao: string | null = null;

        if (matched && config) {
          const realProduct = products.find(p => p.id === matched!.id) || matched;
          const emp = calcularRoasEmpate(realProduct, config);
          if (emp.roasEmpate !== Infinity && emp.roasEmpate > 0) {
            roasEmpate = emp.roasEmpate;
            margemContribuicao = emp.margemContribuicao;
            const cls = classificarAnuncio(ad.roas, emp.roasEmpate);
            classificacao = cls.classificacao;
          }
        }

        rows.push({
          user_id: user.id,
          product_id: matched?.id || null,
          nome_produto_csv: ad.item_name || `Produto ${itemId}`,
          shopee_product_id: itemId,
          impressoes: ad.impressions,
          cliques: ad.clicks,
          ctr: ad.ctr,
          conversoes: ad.orders,
          taxa_conversao: ad.clicks > 0 ? (ad.orders / ad.clicks) * 100 : 0,
          itens_vendidos: ad.orders,
          gmv: ad.gmv,
          despesas: ad.expense,
          roas: ad.roas,
          acos: ad.gmv > 0 ? (ad.expense / ad.gmv) * 100 : 0,
          roas_direto: ad.roas,
          acos_direto: ad.gmv > 0 ? (ad.expense / ad.gmv) * 100 : 0,
          gmv_direto: ad.gmv,
          custo_por_conversao: ad.orders > 0 ? ad.expense / ad.orders : 0,
          itens_vendidos_diretos: ad.orders,
          conversoes_diretas: ad.orders,
          metodo_lance: 'CPC',
          status_anuncio: 'active',
          posicao_importada: false,
          roas_empate: roasEmpate,
          margem_contribuicao: margemContribuicao,
          classificacao,
          periodo_inicio: periodStart,
          periodo_fim: periodEnd,
        });
      }

      // Delete existing data for this API period, then insert
      if (rows.length > 0) {
        await supabase.from('ads_data' as any).delete()
          .eq('user_id', user.id)
          .eq('periodo_inicio', periodStart)
          .eq('periodo_fim', periodEnd);
      }

      const { error } = await supabase.from('ads_data' as any).insert(rows);

      if (error) {
        toast.error('Erro ao salvar dados de Ads da API');
        console.error(error);
      } else {
        toast.success(`${rows.length} anúncios sincronizados via API · ${linkedCount} vinculados`);
        
        if (autoCreatedCount > 0) {
          toast.info(
            `${autoCreatedCount} produto${autoCreatedCount > 1 ? 's' : ''} novo${autoCreatedCount > 1 ? 's' : ''} criado${autoCreatedCount > 1 ? 's' : ''} automaticamente. Preencha o custo.`,
            {
              action: {
                label: 'Ver produtos →',
                onClick: () => window.location.href = '/products?filter=draft',
              },
              duration: 8000,
            }
          );
        }
        
        await fetchData();
      }
    } finally { releaseLock(); }
  }, [user, currentStore, products, config, fetchData, acquireLock, releaseLock]);

  return {
    data, loading, operating, reload: fetchData,
    importGeneralCSV, importProductCSV, importFromApi,
    linkProduct, unlinkProduct,
    deleteAdsData, deleteAll,
  };
}
