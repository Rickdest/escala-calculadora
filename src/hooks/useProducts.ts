import { useMemo, useCallback } from 'react';
import { useStore } from '@/contexts/StoreContext';
import { Product, SortOption } from '@/types/store';

/**
 * Domain hook for product-related operations.
 * Encapsulates sorting, filtering, and calculation logic.
 */
export function useProducts(searchQuery = '', sortBy: SortOption = 'recent') {
  const { currentStore, calculateProduct, addProduct, updateProduct, deleteProduct, duplicateProduct } = useStore();

  const products = useMemo(() => {
    if (!currentStore) return [];
    
    let filtered = currentStore.products;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
    }

    const withCalc = filtered.map(p => ({
      product: p,
      calc: calculateProduct(p, currentStore.config),
    }));

    switch (sortBy) {
      case 'margin-high': return withCalc.sort((a, b) => b.calc.realMargin - a.calc.realMargin);
      case 'margin-low': return withCalc.sort((a, b) => a.calc.realMargin - b.calc.realMargin);
      case 'profit-high': return withCalc.sort((a, b) => b.calc.netProfit - a.calc.netProfit);
      case 'profit-low': return withCalc.sort((a, b) => a.calc.netProfit - b.calc.netProfit);
      case 'name': return withCalc.sort((a, b) => a.product.name.localeCompare(b.product.name));
      case 'recent':
      default: return withCalc.sort((a, b) => 
        new Date(b.product.createdAt).getTime() - new Date(a.product.createdAt).getTime()
      );
    }
  }, [currentStore, searchQuery, sortBy, calculateProduct]);

  const topProducts = useMemo(() => {
    if (!currentStore) return [];
    return currentStore.products
      .map(p => ({ product: p, calc: calculateProduct(p, currentStore.config) }))
      .sort((a, b) => b.calc.realMargin - a.calc.realMargin)
      .slice(0, 3);
  }, [currentStore, calculateProduct]);

  const summary = useMemo(() => {
    if (!currentStore || products.length === 0) return null;
    const margins = products.map(p => p.calc.realMargin);
    return {
      bestMargin: Math.max(...margins),
      worstMargin: Math.min(...margins),
    };
  }, [currentStore, products]);

  const saveProduct = useCallback(async (productData: any, editingId?: string) => {
    if (editingId) {
      await updateProduct(editingId, productData);
    } else {
      await addProduct(productData);
    }
  }, [addProduct, updateProduct]);

  return {
    products,
    topProducts,
    summary,
    saveProduct,
    deleteProduct,
    duplicateProduct,
    calculateProduct: currentStore 
      ? (p: Product) => calculateProduct(p, currentStore.config)
      : null,
  };
}
