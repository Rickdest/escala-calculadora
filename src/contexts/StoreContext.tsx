import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Store, Product, StoreConfig, DEFAULT_STORE_CONFIG, ProductCalculation, getShopeeFeeForPrice } from '@/types/store';

interface StoreContextType {
  stores: Store[];
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
  addStore: (name: string) => Store;
  updateStore: (storeId: string, updates: Partial<Store>) => void;
  updateStoreConfig: (storeId: string, config: Partial<StoreConfig>) => void;
  deleteStore: (storeId: string) => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (productId: string, updates: Partial<Product>) => void;
  deleteProduct: (productId: string) => void;
  duplicateProduct: (productId: string) => Product | null;
  calculateProduct: (product: Product, config: StoreConfig) => ProductCalculation;
  getStoreStats: (store: Store) => { avgMargin: number; totalProducts: number; productsAboveTarget: number; productsBelowTarget: number; totalProfit: number };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = 'escala-calculadora-stores';
const CURRENT_STORE_KEY = 'escala-calculadora-current-store';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const savedStores = localStorage.getItem(STORAGE_KEY);
    const savedCurrentStoreId = localStorage.getItem(CURRENT_STORE_KEY);
    
    if (savedStores) {
      try {
        const parsed = JSON.parse(savedStores).map((store: Store) => ({
          ...store,
          config: {
            ...DEFAULT_STORE_CONFIG,
            ...store.config,
          },
          createdAt: new Date(store.createdAt),
          updatedAt: new Date(store.updatedAt),
          products: store.products.map((p: Product) => ({
            ...p,
            stockQuantity: p.stockQuantity ?? 0,
            hasVariations: p.hasVariations ?? false,
            variations: p.variations ?? [],
            adsRevenue: p.adsRevenue ?? 0,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          })),
        }));
        setStores(parsed);
        
        if (savedCurrentStoreId && parsed.length > 0) {
          const found = parsed.find((s: Store) => s.id === savedCurrentStoreId);
          setCurrentStoreState(found || parsed[0]);
        } else if (parsed.length > 0) {
          setCurrentStoreState(parsed[0]);
        }
      } catch (e) {
        console.error('Error loading stores:', e);
      }
    }
  }, []);

  // Save to localStorage whenever stores change
  useEffect(() => {
    if (stores.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
    }
  }, [stores]);

  // Save current store ID
  useEffect(() => {
    if (currentStore) {
      localStorage.setItem(CURRENT_STORE_KEY, currentStore.id);
    }
  }, [currentStore]);

  // Update currentStore when stores array changes
  useEffect(() => {
    if (currentStore) {
      const updated = stores.find(s => s.id === currentStore.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(currentStore)) {
        setCurrentStoreState(updated);
      }
    }
  }, [stores, currentStore]);

  const setCurrentStore = useCallback((store: Store) => {
    setCurrentStoreState(store);
  }, []);

  const addStore = useCallback((name: string): Store => {
    const newStore: Store = {
      id: generateId(),
      name,
      config: { ...DEFAULT_STORE_CONFIG },
      products: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setStores(prev => [...prev, newStore]);
    if (!currentStore) {
      setCurrentStoreState(newStore);
    }
    return newStore;
  }, [currentStore]);

  const updateStore = useCallback((storeId: string, updates: Partial<Store>) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, ...updates, updatedAt: new Date() }
        : store
    ));
  }, []);

  const updateStoreConfig = useCallback((storeId: string, config: Partial<StoreConfig>) => {
    setStores(prev => prev.map(store => 
      store.id === storeId 
        ? { ...store, config: { ...store.config, ...config }, updatedAt: new Date() }
        : store
    ));
  }, []);

  const deleteStore = useCallback((storeId: string) => {
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

  const addProduct = useCallback((productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      stockQuantity: productData.stockQuantity ?? 0,
      hasVariations: productData.hasVariations ?? false,
      variations: productData.variations ?? [],
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    setStores(prev => prev.map(store => 
      store.id === productData.storeId 
        ? { ...store, products: [...store.products, newProduct], updatedAt: new Date() }
        : store
    ));
    
    return newProduct;
  }, []);

  const updateProduct = useCallback((productId: string, updates: Partial<Product>) => {
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

  const deleteProduct = useCallback((productId: string) => {
    setStores(prev => prev.map(store => ({
      ...store,
      products: store.products.filter(p => p.id !== productId),
      updatedAt: store.products.some(p => p.id === productId) ? new Date() : store.updatedAt,
    })));
  }, []);

  const duplicateProduct = useCallback((productId: string): Product | null => {
    let duplicated: Product | null = null;
    
    setStores(prev => prev.map(store => {
      const product = store.products.find(p => p.id === productId);
      if (product) {
        duplicated = {
          ...product,
          id: generateId(),
          name: `${product.name} (Cópia)`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return {
          ...store,
          products: [...store.products, duplicated],
          updatedAt: new Date(),
        };
      }
      return store;
    }));
    
    return duplicated;
  }, []);

  const calculateProduct = useCallback((product: Product, config: StoreConfig): ProductCalculation => {
    const grossRevenue = product.salePrice;
    
    // Always use tiered fees based on price
    const range = getShopeeFeeForPrice(grossRevenue);
    const feePercent = range.percent;
    const feeFixed = range.fixed;
    
    const shopeeFeePercentValue = grossRevenue * (feePercent / 100);
    const shopeeFeeFixedValue = feeFixed;
    
    // CPF seller additional R$3 per item (only if >450 orders)
    const cpfAdditional = (config.isCpfSeller && config.hasOver450Orders) ? 3 : 0;
    
    const totalShopeeFee = shopeeFeePercentValue + shopeeFeeFixedValue + cpfAdditional;
    const taxesValue = grossRevenue * (config.taxes / 100);
    const packagingCost = config.enablePackaging ? product.packagingCost : 0;
    const adsCost = config.enableAds ? product.adsCost : 0;
    const affiliateCommissionValue = config.enableAffiliateCommission ? grossRevenue * ((config.affiliateCommission || 0) / 100) : 0;
    const shopeeCampaignsValue = config.enableShopeeCampaigns ? grossRevenue * ((config.shopeeCampaigns || 0) / 100) : 0;
    
    const totalCosts = product.costPrice + packagingCost + adsCost + totalShopeeFee + taxesValue + affiliateCommissionValue + shopeeCampaignsValue;
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
    
    return {
      avgMargin,
      totalProducts: store.products.length,
      productsAboveTarget,
      productsBelowTarget,
      totalProfit,
    };
  }, [calculateProduct]);

  return (
    <StoreContext.Provider value={{
      stores,
      currentStore,
      setCurrentStore,
      addStore,
      updateStore,
      updateStoreConfig,
      deleteStore,
      addProduct,
      updateProduct,
      deleteProduct,
      duplicateProduct,
      calculateProduct,
      getStoreStats,
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
