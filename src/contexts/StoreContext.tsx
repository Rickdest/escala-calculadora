import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Product, StoreConfig, DEFAULT_STORE_CONFIG, ProductCalculation, ShopeeAceleraOption } from '@/types/store';
import { calculateProduct as calculateProductFn, getStoreStats as getStoreStatsFn } from '@/lib/calculateProduct';
import { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { uploadProductImage, deleteProductImage } from '@/lib/imageUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CURRENT_STORE_KEY,
  mapDbProduct, mapDbStore, fetchStoresAndProducts,
  VariationRecord,
} from '@/lib/storeMappers';

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
  loadError: boolean;
  retryLoad: () => void;
  setCurrentStore: (store: Store) => void;
  addStore: (name: string) => Promise<Store>;
  updateStore: (storeId: string, updates: Partial<Store>) => Promise<void>;
  updateStoreConfig: (storeId: string, config: Partial<StoreConfig>) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  duplicateProduct: (productId: string) => Promise<Product | null>;
  calculateProduct: (product: Product, config: StoreConfig) => ProductCalculation;
  getStoreStats: (store: Store) => { avgMargin: number; totalProducts: number; productsAboveTarget: number; productsBelowTarget: number; totalProfit: number };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const queryClient = useQueryClient();
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);

  const queryKey = useMemo(() => ['stores-and-products', user?.id], [user?.id]);

  const {
    data: stores = [],
    isLoading,
    isError: loadError,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchStoresAndProducts(user!.id),
    enabled: authReady && !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    meta: { errorMessage: 'Erro ao carregar dados da nuvem' },
  });

  // Show toast on error
  useEffect(() => {
    if (loadError) {
      toast.error('Erro ao carregar dados da nuvem');
    }
  }, [loadError]);

  // Select current store when stores data changes
  useEffect(() => {
    if (stores.length === 0) {
      if (!isLoading && !user) setCurrentStoreState(null);
      return;
    }

    const savedStoreId = localStorage.getItem(CURRENT_STORE_KEY);

    setCurrentStoreState(prev => {
      if (prev) {
        const updated = stores.find(s => s.id === prev.id);
        return updated || stores[0];
      }
      const found = savedStoreId ? stores.find(s => s.id === savedStoreId) : null;
      return found || stores[0];
    });
  }, [stores, isLoading, user]);

  // Persist current store selection
  useEffect(() => {
    if (currentStore) {
      localStorage.setItem(CURRENT_STORE_KEY, currentStore.id);
    }
  }, [currentStore?.id]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  // Clean up old localStorage images (one-time migration)
  useEffect(() => {
    try { localStorage.removeItem('precify-local-images'); localStorage.removeItem('precify-images-migrated'); } catch {}
  }, []);

  const retryLoad = useCallback(() => { refetch(); }, [refetch]);

  const setCurrentStore = useCallback((store: Store) => {
    setCurrentStoreState(store);
  }, []);

  const addStore = useCallback(async (name: string): Promise<Store> => {
    if (!user) throw new Error('Não autenticado');
    const insertData: TablesInsert<'stores'> = {
      name,
      user_id: user.id,
      taxes: DEFAULT_STORE_CONFIG.taxes,
      desired_margin: DEFAULT_STORE_CONFIG.desiredMargin,
      enable_packaging: DEFAULT_STORE_CONFIG.enablePackaging,
      enable_ads: DEFAULT_STORE_CONFIG.enableAds,
      affiliate_commission: DEFAULT_STORE_CONFIG.affiliateCommission,
      shopee_campaigns: DEFAULT_STORE_CONFIG.shopeeCampaigns,
    };
    const { data, error } = await supabase.from('stores').insert(insertData).select().single();

    if (error) { toast.error('Erro ao criar loja'); throw error; }
    const newStore = mapDbStore(data, []);
    invalidate();
    if (!currentStore) setCurrentStoreState(newStore);
    return newStore;
  }, [user, currentStore, invalidate]);

  const updateStore = useCallback(async (storeId: string, updates: Partial<Store>) => {
    const dbUpdates: TablesUpdate<'stores'> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (!user) return;
    const { error } = await supabase.from('stores').update(dbUpdates).eq('id', storeId).eq('user_id', user.id);
    if (error) { toast.error('Erro ao atualizar loja'); return; }
    invalidate();
  }, [invalidate]);

  const updateStoreConfig = useCallback(async (storeId: string, config: Partial<StoreConfig>) => {
    const dbConfig: TablesUpdate<'stores'> = {};
    if (config.taxes !== undefined) dbConfig.taxes = config.taxes;
    if (config.desiredMargin !== undefined) dbConfig.desired_margin = config.desiredMargin;
    if (config.enablePackaging !== undefined) dbConfig.enable_packaging = config.enablePackaging;
    if (config.enableAds !== undefined) dbConfig.enable_ads = config.enableAds;
    if (config.affiliateCommission !== undefined) dbConfig.affiliate_commission = config.affiliateCommission;
    if (config.shopeeCampaigns !== undefined) dbConfig.shopee_campaigns = config.shopeeCampaigns;
    if (config.isCpfSeller !== undefined) dbConfig.is_cpf_seller = config.isCpfSeller;
    if (config.hasOver450Orders !== undefined) dbConfig.has_over_450_orders = config.hasOver450Orders;
    if (config.enableAffiliateCommission !== undefined) dbConfig.enable_affiliate_commission = config.enableAffiliateCommission;
    if (config.enableShopeeCampaigns !== undefined) dbConfig.enable_shopee_campaigns = config.enableShopeeCampaigns;
    if (config.shopeeAcelera !== undefined) dbConfig.shopee_acelera = config.shopeeAcelera;

    if (!user) return;
    const { error } = await supabase.from('stores').update(dbConfig).eq('id', storeId).eq('user_id', user.id);
    if (error) { toast.error('Erro ao atualizar configuração'); return; }
    invalidate();
  }, [invalidate]);

  const deleteStore = useCallback(async (storeId: string) => {
    if (!user) return;
    const { error: prodError } = await supabase.from('products').delete().eq('store_id', storeId).eq('user_id', user.id);
    if (prodError) { toast.error('Erro ao excluir produtos da loja'); return; }
    const { error } = await supabase.from('stores').delete().eq('id', storeId).eq('user_id', user.id);
    if (error) { toast.error('Erro ao excluir loja'); return; }
    if (currentStore?.id === storeId) setCurrentStoreState(null);
    invalidate();
  }, [currentStore, invalidate]);

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    if (!user) throw new Error('Não autenticado');

    const hasVars = productData.hasVariations || false;
    const variations = productData.variations || [];
    const stockQty = hasVars && variations.length > 0
      ? variations.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)
      : productData.stockQuantity || 0;

    const insertData: TablesInsert<'products'> = {
      store_id: productData.storeId,
      user_id: user.id,
      name: productData.name,
      cost_price: productData.costPrice,
      sale_price: productData.salePrice,
      packaging_cost: productData.packagingCost || 0,
      ads_cost: productData.adsCost || 0,
      ads_revenue: productData.adsRevenue || 0,
      stock_quantity: stockQty,
      has_variations: hasVars,
      attributes: (productData.attributes || []) as unknown as TablesInsert<'products'>['attributes'],
      variations: variations as unknown as TablesInsert<'products'>['variations'],
      shopee_acelera: productData.shopeeAcelera || 'none',
      category: productData.category || null,
      description: productData.description || null,
      min_stock_quantity: productData.minStockQuantity ?? 5,
      outros_canais: (productData.outrosCanais ?? null) as TablesInsert<'products'>['outros_canais'],
      price_variants: (productData.priceVariants ?? []) as unknown as TablesInsert<'products'>['price_variants'],
    };
    const { data, error } = await supabase.from('products').insert(insertData).select().single();

    if (error) { toast.error('Erro ao salvar produto'); throw error; }

    if (productData.imageUrl) {
      const url = await uploadProductImage(user.id, data.id, productData.imageUrl);
      if (url) {
        await supabase.from('products').update({ image_url: url }).eq('id', data.id);
        data.image_url = url;
      }
    }

    const newProduct = mapDbProduct(data);
    invalidate();
    return newProduct;
  }, [user, invalidate]);

  const updateProduct = useCallback(async (productId: string, updates: Partial<Product>) => {
    const dbUpdates: TablesUpdate<'products'> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
    if (updates.packagingCost !== undefined) dbUpdates.packaging_cost = updates.packagingCost;
    if (updates.adsCost !== undefined) dbUpdates.ads_cost = updates.adsCost;
    if (updates.adsRevenue !== undefined) dbUpdates.ads_revenue = updates.adsRevenue;
    if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = updates.stockQuantity;
    if (updates.hasVariations !== undefined) dbUpdates.has_variations = updates.hasVariations;
    if (updates.attributes !== undefined) dbUpdates.attributes = updates.attributes as unknown as TablesUpdate<'products'>['attributes'];
    if (updates.variations !== undefined) dbUpdates.variations = updates.variations as unknown as TablesUpdate<'products'>['variations'];
    if (updates.shopeeAcelera !== undefined) dbUpdates.shopee_acelera = updates.shopeeAcelera;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.minStockQuantity !== undefined) dbUpdates.min_stock_quantity = updates.minStockQuantity;
    if (updates.outrosCanais !== undefined) dbUpdates.outros_canais = (updates.outrosCanais ?? null) as TablesUpdate<'products'>['outros_canais'];
    if (updates.variations !== undefined && updates.hasVariations !== false) {
      const vars = updates.variations || [];
      if (vars.length > 0) {
        dbUpdates.stock_quantity = vars.reduce((sum: number, v: VariationRecord) => sum + (v.stockQuantity || 0), 0);
      }
    }

    if (Object.keys(dbUpdates).length > 0) {
      if (!user) return;
      const { error } = await supabase.from('products').update(dbUpdates).eq('id', productId).eq('user_id', user.id);
      if (error) { toast.error('Erro ao atualizar produto'); return; }
    }

    if (updates.imageUrl !== undefined && user) {
      if (updates.imageUrl) {
        // Only upload if it's a new dataUrl, not an existing Storage URL
        if (updates.imageUrl.startsWith('data:')) {
          const url = await uploadProductImage(user.id, productId, updates.imageUrl);
          if (url) {
            await supabase.from('products').update({ image_url: url }).eq('id', productId);
          }
        }
      } else {
        await deleteProductImage(user.id, productId);
        await supabase.from('products').update({ image_url: null }).eq('id', productId);
      }
    }

    invalidate();
  }, [user, invalidate]);

  const deleteProduct = useCallback(async (productId: string) => {
    if (!user) return;
    await deleteProductImage(user.id, productId);
    const { error } = await supabase.from('products').delete().eq('id', productId).eq('user_id', user.id);
    if (error) { toast.error('Erro ao excluir produto'); return; }
    invalidate();
  }, [user, invalidate]);

  const duplicateProduct = useCallback(async (productId: string): Promise<Product | null> => {
    if (!user) return null;
    let original: Product | undefined;
    for (const store of stores) {
      original = store.products.find(p => p.id === productId);
      if (original) break;
    }
    if (!original) return null;

    const insertData: TablesInsert<'products'> = {
      store_id: original.storeId,
      user_id: user.id,
      name: `${original.name} (Cópia)`,
      cost_price: original.costPrice,
      sale_price: original.salePrice,
      packaging_cost: original.packagingCost,
      ads_cost: original.adsCost,
      ads_revenue: original.adsRevenue,
      stock_quantity: original.stockQuantity,
      has_variations: original.hasVariations,
      attributes: (original.attributes || []) as unknown as TablesInsert<'products'>['attributes'],
      variations: original.variations as unknown as TablesInsert<'products'>['variations'],
      shopee_acelera: original.shopeeAcelera || 'none',
      category: original.category || null,
      description: original.description || null,
      min_stock_quantity: original.minStockQuantity ?? 5,
      outros_canais: (original.outrosCanais ?? null) as TablesInsert<'products'>['outros_canais'],
    };
    const { data, error } = await supabase.from('products').insert(insertData).select().single();

    if (error) { toast.error('Erro ao duplicar produto'); return null; }

    if (original.imageUrl && user) {
      const url = await uploadProductImage(user.id, data.id, original.imageUrl);
      if (url) {
        await supabase.from('products').update({ image_url: url }).eq('id', data.id);
        data.image_url = url;
      }
    }

    const duplicated = mapDbProduct(data);
    invalidate();
    return duplicated;
  }, [user, stores, invalidate]);

  const calculateProduct = useCallback(calculateProductFn, []);

  const getStoreStats = useCallback((store: Store) => getStoreStatsFn(store, calculateProduct), [calculateProduct]);

  return (
    <StoreContext.Provider value={{
      stores, currentStore, isLoading, loadError, retryLoad, setCurrentStore, addStore, updateStore, updateStoreConfig,
      deleteStore, addProduct, updateProduct, deleteProduct, duplicateProduct, calculateProduct, getStoreStats,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
