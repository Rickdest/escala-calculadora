import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { compressImage, uploadEstoqueImage, deleteEstoqueImage } from '@/lib/imageUtils';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface EstoqueProduto {
  id: string;
  user_id: string;
  nome: string;
  categoria: string | null;
  sku_base: string | null;
  descricao: string | null;
  image_url: string | null;
  tem_variacoes: boolean;
  created_at: string;
  updated_at: string;
  variacoes: EstoqueVariacao[];
}

export interface EstoqueVariacao {
  id: string;
  produto_id: string;
  user_id: string;
  atributos: Record<string, string>;
  sku: string | null;
  preco_custo: number;
  quantidade: number;
  quantidade_minima: number;
  created_at: string;
  updated_at: string;
}

export interface EstoqueMovimentacao {
  id: string;
  variacao_id: string;
  user_id: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  motivo: string | null;
  created_at: string;
}

const LOCAL_STOCK_IMAGES_KEY = 'precify-stock-images';

function getLocalStockImages(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LOCAL_STOCK_IMAGES_KEY) || '{}'); } catch { return {}; }
}

export function saveLocalStockImage(productId: string, dataUrl: string) {
  const imgs = getLocalStockImages();
  imgs[productId] = dataUrl;
  localStorage.setItem(LOCAL_STOCK_IMAGES_KEY, JSON.stringify(imgs));
}

export function removeLocalStockImage(productId: string) {
  const imgs = getLocalStockImages();
  delete imgs[productId];
  localStorage.setItem(LOCAL_STOCK_IMAGES_KEY, JSON.stringify(imgs));
}

export function getLocalStockImage(productId: string): string | null {
  return getLocalStockImages()[productId] || null;
}

function mapDbVariacao(v: Tables<'estoque_variacoes'>): EstoqueVariacao {
  return {
    id: v.id,
    produto_id: v.produto_id,
    user_id: v.user_id,
    atributos: (v.atributos ?? {}) as Record<string, string>,
    sku: v.sku,
    preco_custo: Number(v.preco_custo),
    quantidade: v.quantidade,
    quantidade_minima: v.quantidade_minima,
    created_at: v.created_at,
    updated_at: v.updated_at,
  };
}

async function fetchEstoque(userId: string): Promise<EstoqueProduto[]> {
  const [{ data: prods, error: e1 }, { data: vars, error: e2 }] = await Promise.all([
    supabase.from('estoque_produtos').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('estoque_variacoes').select('*').eq('user_id', userId),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const varMap = new Map<string, EstoqueVariacao[]>();
  for (const v of vars || []) {
    const mapped = mapDbVariacao(v);
    const list = varMap.get(mapped.produto_id) || [];
    list.push(mapped);
    varMap.set(mapped.produto_id, list);
  }

  return (prods || []).map((p): EstoqueProduto => ({
    id: p.id,
    user_id: p.user_id,
    nome: p.nome,
    categoria: p.categoria,
    sku_base: p.sku_base,
    descricao: p.descricao,
    image_url: p.image_url,
    tem_variacoes: p.tem_variacoes,
    created_at: p.created_at,
    updated_at: p.updated_at,
    variacoes: varMap.get(p.id) || [],
  }));
}

export function useEstoque() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['estoque', user?.id], [user?.id]);

  const { data: produtos = [], isLoading: loading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchEstoque(user!.id),
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (isError) toast.error('Erro ao carregar estoque');
  }, [isError]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const addProduto = useCallback(async (data: {
    nome: string;
    categoria?: string;
    sku_base?: string;
    descricao?: string;
    tem_variacoes: boolean;
    imageDataUrl?: string;
    variacoes: Omit<EstoqueVariacao, 'id' | 'produto_id' | 'user_id' | 'created_at' | 'updated_at'>[];
  }) => {
    if (!user) throw new Error('Não autenticado');

    const insertData: TablesInsert<'estoque_produtos'> = {
      user_id: user.id,
      nome: data.nome,
      categoria: data.categoria || null,
      sku_base: data.sku_base || null,
      descricao: data.descricao || null,
      tem_variacoes: data.tem_variacoes,
    };

    const { data: prod, error } = await supabase
      .from('estoque_produtos')
      .insert(insertData)
      .select()
      .single();
    if (error) { toast.error('Erro ao criar produto'); throw error; }

    if (data.imageDataUrl) {
      const url = await uploadEstoqueImage(user.id, prod.id, data.imageDataUrl);
      if (url) {
        await supabase.from('estoque_produtos').update({ image_url: url }).eq('id', prod.id);
      } else {
        const compressed = await compressImage(data.imageDataUrl);
        saveLocalStockImage(prod.id, compressed);
      }
    }

    if (data.variacoes.length > 0) {
      const rows: TablesInsert<'estoque_variacoes'>[] = data.variacoes.map(v => ({
        produto_id: prod.id,
        user_id: user.id,
        atributos: v.atributos as TablesInsert<'estoque_variacoes'>['atributos'],
        sku: v.sku || null,
        preco_custo: v.preco_custo,
        quantidade: v.quantidade,
        quantidade_minima: v.quantidade_minima,
      }));
      const { error: ve } = await supabase.from('estoque_variacoes').insert(rows);
      if (ve) { toast.error('Erro ao salvar variações'); throw ve; }
    }

    invalidate();
    toast.success('Produto adicionado ao estoque!');
    return prod;
  }, [user, invalidate]);

  const updateProduto = useCallback(async (id: string, data: TablesUpdate<'estoque_produtos'>) => {
    const { error } = await supabase.from('estoque_produtos').update(data).eq('id', id);
    if (error) { toast.error('Erro ao atualizar produto'); return; }
    invalidate();
  }, [invalidate]);

  const deleteProduto = useCallback(async (id: string) => {
    if (user) await deleteEstoqueImage(user.id, id);
    const { error } = await supabase.from('estoque_produtos').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir produto'); return; }
    removeLocalStockImage(id);
    invalidate();
    toast.success('Produto excluído');
  }, [user, invalidate]);

  const updateVariacao = useCallback(async (id: string, data: TablesUpdate<'estoque_variacoes'>) => {
    const { error } = await supabase.from('estoque_variacoes').update(data).eq('id', id);
    if (error) { toast.error('Erro ao atualizar variação'); return; }
    invalidate();
  }, [invalidate]);

  const addMovimentacao = useCallback(async (variacaoId: string, tipo: 'entrada' | 'saida' | 'ajuste', quantidade: number, motivo?: string) => {
    if (!user) return;

    const prod = produtos.find(p => p.variacoes.some(v => v.id === variacaoId));
    const variacao = prod?.variacoes.find(v => v.id === variacaoId);
    if (!variacao) return;

    let newQty = variacao.quantidade;
    if (tipo === 'entrada') newQty += quantidade;
    else if (tipo === 'saida') newQty = Math.max(0, newQty - quantidade);
    else newQty = quantidade;

    await supabase.from('estoque_variacoes').update({ quantidade: newQty }).eq('id', variacaoId);

    const movInsert: TablesInsert<'estoque_movimentacoes'> = {
      variacao_id: variacaoId,
      user_id: user.id,
      tipo,
      quantidade,
      motivo: motivo || null,
    };
    await supabase.from('estoque_movimentacoes').insert(movInsert);

    invalidate();
    toast.success('Estoque atualizado');
  }, [user, produtos, invalidate]);

  const getMovimentacoes = useCallback(async (variacaoIds: string[]): Promise<EstoqueMovimentacao[]> => {
    if (!user || variacaoIds.length === 0) return [];
    const { data, error } = await supabase
      .from('estoque_movimentacoes')
      .select('*')
      .in('variacao_id', variacaoIds)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return [];
    return (data || []).map((m): EstoqueMovimentacao => ({
      id: m.id,
      variacao_id: m.variacao_id,
      user_id: m.user_id,
      tipo: m.tipo as EstoqueMovimentacao['tipo'],
      quantidade: m.quantidade,
      motivo: m.motivo,
      created_at: m.created_at,
    }));
  }, [user]);

  const stats = useMemo(() => ({
    total: produtos.length,
    ativo: produtos.filter(p => {
      const vars = p.variacoes;
      if (vars.length === 0) return true;
      return vars.some(v => v.quantidade > 0);
    }).length,
    baixo: produtos.reduce((acc, p) => {
      return acc + p.variacoes.filter(v => v.quantidade > 0 && v.quantidade <= v.quantidade_minima).length;
    }, 0),
    zerado: produtos.reduce((acc, p) => {
      if (p.variacoes.length === 0) return acc;
      return acc + p.variacoes.filter(v => v.quantidade === 0).length;
    }, 0),
    valorTotal: produtos.reduce((acc, p) => {
      return acc + p.variacoes.reduce((s, v) => s + v.preco_custo * v.quantidade, 0);
    }, 0),
  }), [produtos]);

  return {
    produtos,
    loading,
    loadError: isError,
    retryLoad: refetch,
    stats,
    addProduto,
    updateProduto,
    deleteProduto,
    updateVariacao,
    addMovimentacao,
    getMovimentacoes,
    reload: refetch,
  };
}
