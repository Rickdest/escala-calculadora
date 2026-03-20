import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Store, Product, StoreConfig, DEFAULT_STORE_CONFIG, ProductCalculation, getShopeeFeeForPrice, ShopeeAceleraOption } from '@/types/store';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageUtils';

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  isLoading: boolean;
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

const LOCAL_IMAGES_KEY = 'precify-local-images';
const CURRENT_STORE_KEY = 'precify-current-store';

function getLocalImages(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LOCAL_IMAGES_KEY) || '{}'); } catch { return {}; }
}

function saveLocalImage(productId: string, imageUrl: string) {
  const images = getLocalImages();
  images[productId] = imageUrl;
  localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(images));
}

function removeLocalImage(productId: string) {
  const images = getLocalImages();
  delete images[productId];
  localStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(images));
}

function mapDbProduct(p: any): Product {
  const localImages = getLocalImages();
  const variations = p.variations ?? [];
  const attributes = p.attributes ?? [];
  const hasVariations = p.has_variations ?? false;
  // If product has variations, stockQuantity = sum of variation stocks
  const stockQuantity = hasVariations && variations.length > 0
    ? variations.reduce((sum: number, v: any) => sum + (Number(v.stockQuantity) || 0), 0)
    : Number(p.stock_quantity ?? 0);

  return {
    id: p.id,
    storeId: p.store_id,
    name: p.name,
    category: p.category || undefined,
    description: p.description || undefined,
    costPrice: Number(p.cost_price),
    salePrice: Number(p.sale_price),
    packagingCost: Number(p.packaging_cost ?? 0),
    adsCost: Number(p.ads_cost ?? 0),
    adsRevenue: Number(p.ads_revenue ?? 0),
    imageUrl: localImages[p.id] || undefined,
    stockQuantity,
    minStockQuantity: Number(p.min_stock_quantity ?? 5),
    hasVariations,
    attributes,
    variations,
    shopeeAcelera: (p.shopee_acelera as ShopeeAceleraOption) ?? 'none',
    createdAt: new Date(p.created_at),
    updatedAt: new Date(p.updated_at),
  };
}

function mapDbStore(s: any, products: Product[]): Store {
  return {
    id: s.id,
    name: s.name,
    config: {
      isCpfSeller: s.is_cpf_seller ?? false,
      hasOver450Orders: s.has_over_450_orders ?? false,
      taxes: Number(s.taxes ?? 0),
      desiredMargin: Number(s.desired_margin ?? 17),
      currency: 'BRL',
      enablePackaging: s.enable_packaging ?? true,
      enableAds: s.enable_ads ?? true,
      enableAffiliateCommission: s.enable_affiliate_commission ?? false,
      enableShopeeCampaigns: s.enable_shopee_campaigns ?? false,
      affiliateCommission: Number(s.affiliate_commission ?? 0),
      shopeeCampaigns: Number(s.shopee_campaigns ?? 0),
      shopeeAcelera: (s.shopee_acelera as ShopeeAceleraOption) || 'none',
    },
    products: products.filter(p => p.storeId === s.id),
    createdAt: new Date(s.created_at),
    updatedAt: new Date(s.updated_at),
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase when user changes
  useEffect(() => {
    if (!user) {
      setStores([]);
      setCurrentStoreState(null);
      setIsLoading(false);
      return;
    }
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [{ data: storesData, error: storesErr }, { data: productsData, error: productsErr }] = await Promise.all([
        supabase.from('stores').select('*').eq('user_id', user.id),
        supabase.from('products').select('*').eq('user_id', user.id),
      ]);

      if (storesErr) throw storesErr;
      if (productsErr) throw productsErr;

      const products = (productsData || []).map((p: any) => mapDbProduct(p));
      const loaded = (storesData || []).map((s: any) => mapDbStore(s, products));

      if (loaded.length > 0) {
        setStores(loaded);
        const savedStoreId = localStorage.getItem(CURRENT_STORE_KEY);
        const found = savedStoreId ? loaded.find(s => s.id === savedStoreId) : null;
        setCurrentStoreState(found || loaded[0]);
      } else {
        // Auto-create first store for new users
        const { data, error: createErr } = await supabase.from('stores').insert({
          name: 'Minha Loja',
          user_id: user.id,
          taxes: DEFAULT_STORE_CONFIG.taxes,
          desired_margin: DEFAULT_STORE_CONFIG.desiredMargin,
          enable_packaging: DEFAULT_STORE_CONFIG.enablePackaging,
          enable_ads: DEFAULT_STORE_CONFIG.enableAds,
          affiliate_commission: DEFAULT_STORE_CONFIG.affiliateCommission,
          shopee_campaigns: DEFAULT_STORE_CONFIG.shopeeCampaigns,
        } as any).select().single();
        if (!createErr && data) {
          const newStore = mapDbStore(data, []);
          setStores([newStore]);
          setCurrentStoreState(newStore);
        }
      }
    } catch (err) {
      toast.error('Erro ao carregar dados da nuvem');
    } finally {
      setIsLoading(false);
    }
  };

  // Sync currentStore with stores array
  useEffect(() => {
    if (currentStore) {
      const updated = stores.find(s => s.id === currentStore.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentStore)) {
        setCurrentStoreState(updated);
      }
      localStorage.setItem(CURRENT_STORE_KEY, currentStore.id);
    }
  }, [stores, currentStore]);

  const setCurrentStore = useCallback((store: Store) => {
    setCurrentStoreState(store);
  }, []);

  const addStore = useCallback(async (name: string): Promise<Store> => {
    if (!user) throw new Error('Não autenticado');
    const { data, error } = await supabase.from('stores').insert({
      name,
      user_id: user.id,
      taxes: DEFAULT_STORE_CONFIG.taxes,
      desired_margin: DEFAULT_STORE_CONFIG.desiredMargin,
      enable_packaging: DEFAULT_STORE_CONFIG.enablePackaging,
      enable_ads: DEFAULT_STORE_CONFIG.enableAds,
      affiliate_commission: DEFAULT_STORE_CONFIG.affiliateCommission,
      shopee_campaigns: DEFAULT_STORE_CONFIG.shopeeCampaigns,
    } as any).select().single();

    if (error) { toast.error('Erro ao criar loja'); throw error; }
    const newStore = mapDbStore(data, []);
    setStores(prev => [...prev, newStore]);
    if (!currentStore) setCurrentStoreState(newStore);
    return newStore;
  }, [user, currentStore]);

  const updateStore = useCallback(async (storeId: string, updates: Partial<Store>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    const { error } = await supabase.from('stores').update(dbUpdates).eq('id', storeId);
    if (error) { toast.error('Erro ao atualizar loja'); return; }
    setStores(prev => prev.map(store =>
      store.id === storeId ? { ...store, ...updates, updatedAt: new Date() } : store
    ));
  }, []);

  const updateStoreConfig = useCallback(async (storeId: string, config: Partial<StoreConfig>) => {
    const dbConfig: any = {};
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

    const { error } = await supabase.from('stores').update(dbConfig).eq('id', storeId);
    if (error) { toast.error('Erro ao atualizar configuração'); return; }
    setStores(prev => prev.map(store =>
      store.id === storeId
        ? { ...store, config: { ...store.config, ...config }, updatedAt: new Date() }
        : store
    ));
  }, []);

  const deleteStore = useCallback(async (storeId: string) => {
    // Delete products first, then store
    await supabase.from('products').delete().eq('store_id', storeId);
    const { error } = await supabase.from('stores').delete().eq('id', storeId);
    if (error) { toast.error('Erro ao excluir loja'); return; }
    setStores(prev => {
      const filtered = prev.filter(s => s.id !== storeId);
      if (currentStore?.id === storeId && filtered.length > 0) {
        setCurrentStoreState(filtered[0]);
      } else if (filtered.length === 0) {
        setCurrentStoreState(null);
      }
      return filtered;
    });
  }, [currentStore]);

  const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> => {
    if (!user) throw new Error('Não autenticado');

    // Calculate stock from variations if applicable
    const hasVars = productData.hasVariations || false;
    const variations = productData.variations || [];
    const stockQty = hasVars && variations.length > 0
      ? variations.reduce((sum, v) => sum + (v.stockQuantity || 0), 0)
      : productData.stockQuantity || 0;

    const { data, error } = await supabase.from('products').insert({
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
      attributes: productData.attributes || [],
      variations: variations,
      shopee_acelera: productData.shopeeAcelera || 'none',
      category: productData.category || null,
      description: productData.description || null,
      min_stock_quantity: productData.minStockQuantity ?? 5,
    } as any).select().single();

    if (error) { toast.error('Erro ao salvar produto'); throw error; }

    // Save image locally (compressed)
    if (productData.imageUrl) {
      const compressed = await compressImage(productData.imageUrl);
      saveLocalImage(data.id, compressed);
    }

    const newProduct = mapDbProduct(data);
    if (productData.imageUrl) newProduct.imageUrl = productData.imageUrl;

    setStores(prev => prev.map(store =>
      store.id === productData.storeId
        ? { ...store, products: [...store.products, newProduct], updatedAt: new Date() }
        : store
    ));

    return newProduct;
  }, [user]);

  const updateProduct = useCallback(async (productId: string, updates: Partial<Product>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice;
    if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice;
    if (updates.packagingCost !== undefined) dbUpdates.packaging_cost = updates.packagingCost;
    if (updates.adsCost !== undefined) dbUpdates.ads_cost = updates.adsCost;
    if (updates.adsRevenue !== undefined) dbUpdates.ads_revenue = updates.adsRevenue;
    if (updates.stockQuantity !== undefined) dbUpdates.stock_quantity = updates.stockQuantity;
    if (updates.hasVariations !== undefined) dbUpdates.has_variations = updates.hasVariations;
    if (updates.attributes !== undefined) dbUpdates.attributes = updates.attributes;
    if (updates.variations !== undefined) dbUpdates.variations = updates.variations;
    if (updates.shopeeAcelera !== undefined) dbUpdates.shopee_acelera = updates.shopeeAcelera;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.minStockQuantity !== undefined) dbUpdates.min_stock_quantity = updates.minStockQuantity;
    // Recalculate stock from variations if applicable
    if (updates.variations !== undefined && updates.hasVariations !== false) {
      const vars = updates.variations || [];
      if (vars.length > 0) {
        dbUpdates.stock_quantity = vars.reduce((sum: number, v: any) => sum + (v.stockQuantity || 0), 0);
        if (updates.stockQuantity === undefined) {
          updates.stockQuantity = dbUpdates.stock_quantity;
        }
      }
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('products').update(dbUpdates).eq('id', productId);
      if (error) { toast.error('Erro ao atualizar produto'); return; }
    }

    // Save image locally (compressed)
    if (updates.imageUrl !== undefined) {
      if (updates.imageUrl) {
        const compressed = await compressImage(updates.imageUrl);
        saveLocalImage(productId, compressed);
      } else {
        removeLocalImage(productId);
      }
    }

    setStores(prev => prev.map(store => ({
      ...store,
      products: store.products.map(product =>
        product.id === productId
          ? { ...product, ...updates, updatedAt: new Date() }
          : product
      ),
      updatedAt: store.products.some(p => p.id === productId) ? new Date() : store.updatedAt,
    })));
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) { toast.error('Erro ao excluir produto'); return; }
    removeLocalImage(productId);
    setStores(prev => prev.map(store => ({
      ...store,
      products: store.products.filter(p => p.id !== productId),
      updatedAt: store.products.some(p => p.id === productId) ? new Date() : store.updatedAt,
    })));
  }, []);

  const duplicateProduct = useCallback(async (productId: string): Promise<Product | null> => {
    if (!user) return null;
    let original: Product | undefined;
    for (const store of stores) {
      original = store.products.find(p => p.id === productId);
      if (original) break;
    }
    if (!original) return null;

    const { data, error } = await supabase.from('products').insert({
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
      attributes: original.attributes || [],
      variations: original.variations,
      shopee_acelera: original.shopeeAcelera || 'none',
      category: original.category || null,
      description: original.description || null,
      min_stock_quantity: original.minStockQuantity ?? 5,
    } as any).select().single();

    if (error) { toast.error('Erro ao duplicar produto'); return null; }

    if (original.imageUrl) saveLocalImage(data.id, original.imageUrl);

    const duplicated = mapDbProduct(data);
    if (original.imageUrl) duplicated.imageUrl = original.imageUrl;

    setStores(prev => prev.map(store =>
      store.id === original!.storeId
        ? { ...store, products: [...store.products, duplicated], updatedAt: new Date() }
        : store
    ));

    return duplicated;
  }, [user, stores]);

  const calculateProduct = useCallback((product: Product, config: StoreConfig): ProductCalculation => {
    const grossRevenue = product.salePrice;
    const range = getShopeeFeeForPrice(grossRevenue);
    const feePercent = range.percent;
    const feeFixed = range.fixed;

    const shopeeFeePercentValue = grossRevenue * (feePercent / 100);
    const shopeeFeeFixedValue = feeFixed;
    const cpfAdditional = (config.isCpfSeller && config.hasOver450Orders) ? 3 : 0;
    const totalShopeeFee = shopeeFeePercentValue + shopeeFeeFixedValue + cpfAdditional;
    const taxesValue = grossRevenue * (config.taxes / 100);
    const packagingCost = config.enablePackaging ? product.packagingCost : 0;
    const adsCost = config.enableAds ? product.adsCost : 0;
    const affiliateCommissionValue = config.enableAffiliateCommission ? grossRevenue * ((config.affiliateCommission || 0) / 100) : 0;
    const shopeeCampaignsValue = config.enableShopeeCampaigns ? grossRevenue * ((config.shopeeCampaigns || 0) / 100) : 0;

    const aceleraCost = config.shopeeAcelera === 'indicado'
      ? grossRevenue * 0.025
      : config.shopeeAcelera === 'nao_indicado'
      ? grossRevenue * 0.035
      : 0;

    const totalCosts = product.costPrice + packagingCost + adsCost + totalShopeeFee + taxesValue + affiliateCommissionValue + shopeeCampaignsValue + aceleraCost;
    const netProfit = grossRevenue - totalCosts;
    const realMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
    const marginDifference = realMargin - config.desiredMargin;

    return {
      grossRevenue,
      shopeeFeePercent: shopeeFeePercentValue,
      shopeeFeeFixed: shopeeFeeFixedValue + cpfAdditional,
      totalShopeeFee,
      taxes: taxesValue,
      affiliateCommission: affiliateCommissionValue,
      shopeeCampaigns: shopeeCampaignsValue,
      shopeeAcelera: aceleraCost,
      totalCosts,
      netProfit,
      realMargin,
      marginDifference,
      isAboveTarget: realMargin >= config.desiredMargin,
    };
  }, []);

  const getStoreStats = useCallback((store: Store) => {
    if (store.products.length === 0) {
      return { avgMargin: 0, totalProducts: 0, productsAboveTarget: 0, productsBelowTarget: 0, totalProfit: 0 };
    }
    const calculations = store.products.map(p => calculateProduct(p, store.config));
    const avgMargin = calculations.reduce((sum, c) => sum + c.realMargin, 0) / calculations.length;
    const productsAboveTarget = calculations.filter(c => c.isAboveTarget).length;
    const productsBelowTarget = calculations.filter(c => !c.isAboveTarget).length;
    const totalProfit = calculations.reduce((sum, c) => sum + c.netProfit, 0);
    return { avgMargin, totalProducts: store.products.length, productsAboveTarget, productsBelowTarget, totalProfit };
  }, [calculateProduct]);

  return (
    <StoreContext.Provider value={{
      stores, currentStore, isLoading, setCurrentStore, addStore, updateStore, updateStoreConfig,
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
