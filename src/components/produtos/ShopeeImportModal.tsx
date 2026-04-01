import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { cn } from '@/lib/utils';

export interface ShopeeProduct {
  item_id: number;
  item_name: string;
  price: number;
  stock: number;
  image_url?: string;
  already_imported: boolean;
  price_changed?: boolean;
}

interface ShopeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (selectedIds: number[], products: ShopeeProduct[]) => Promise<void>;
}

export function ShopeeImportModal({ isOpen, onClose, onImport }: ShopeeImportModalProps) {
  const { user } = useAuth();
  const { syncAds } = useShopeeToken();
  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchShopeeProducts();
  }, [isOpen]);

  async function fetchShopeeProducts() {
    setLoading(true);
    setError(null);
    try {
      const result = await syncAds();
      const details = result?.results?.product_details?.response?.item_list || [];
      const modelsMap = result?.results?.product_models || {};

      if (details.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Get existing products
      const { data: existing } = await supabase
        .from('products')
        .select('shopee_product_id, shopee_item_id, sale_price')
        .eq('user_id', user?.id || '')
        .not('shopee_product_id', 'is', null);

      const existingMap = new Map<string, number>();
      existing?.forEach(p => {
        if (p.shopee_product_id) existingMap.set(p.shopee_product_id, p.sale_price);
        if (p.shopee_item_id) existingMap.set(String(p.shopee_item_id), p.sale_price);
      });

      const mapped: ShopeeProduct[] = details.map((p: any) => {
        const itemId = p.item_id;
        const models = modelsMap[itemId];
        let salePrice = 0;
        let stockQty = 0;

        if (models && models.length > 0) {
          const prices = models
            .map((m: any) => {
              const pi = m.price_info?.[0];
              const raw = pi?.current_price || pi?.original_price || 0;
              return raw > 1000 ? raw / 100000 : raw;
            })
            .filter((pr: number) => pr > 0);
          salePrice = prices.length > 0 ? Math.min(...prices) : 0;
          stockQty = models.reduce((sum: number, m: any) => {
            return sum + (m.stock_info_v2?.summary_info?.total_available_stock ?? 0);
          }, 0);
        } else {
          const pi = p.price_info?.[0];
          const rawPrice = pi?.current_price || pi?.original_price || 0;
          salePrice = rawPrice > 1000 ? rawPrice / 100000 : rawPrice;
          stockQty = p.stock_info_v2?.summary_info?.total_available_stock ?? 0;
        }

        const imageUrl = p.image?.image_url_list?.[0] || undefined;
        const existingPrice = existingMap.get(String(itemId));
        const alreadyImported = existingMap.has(String(itemId));
        const priceChanged = alreadyImported && existingPrice !== undefined && Math.abs(existingPrice - salePrice) > 0.01;

        return {
          item_id: itemId,
          item_name: p.item_name,
          price: salePrice,
          stock: stockQty,
          image_url: imageUrl,
          already_imported: alreadyImported,
          price_changed: priceChanged,
        };
      });

      setProducts(mapped);

      // Pre-select new ones + ones with price changes
      const autoSelect = mapped
        .filter(p => !p.already_imported || p.price_changed)
        .map(p => p.item_id);
      setSelected(new Set(autoSelect));
    } catch (e) {
      console.error('Shopee fetch error:', e);
      setError('Erro ao buscar produtos da Shopee.');
    } finally {
      setLoading(false);
    }
  }

  const importableProducts = products.filter(p => !p.already_imported || p.price_changed);
  const allImportableSelected = importableProducts.length > 0 && importableProducts.every(p => selected.has(p.item_id));

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (allImportableSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(importableProducts.map(p => p.item_id)));
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      await onImport(Array.from(selected), products);
    } finally {
      setImporting(false);
    }
  };

  const formatPrice = (v: number) =>
    `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="w-5 h-5 text-[#EE4D2D]" />
            Importar da Shopee
          </DialogTitle>
          <DialogDescription className="text-xs">
            {loading
              ? 'Buscando produtos...'
              : `${products.length} produtos encontrados · selecione quais importar`}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Carregando produtos da Shopee...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">{error}</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado na sua loja Shopee.
            </div>
          ) : (
            <>
              {/* Select all */}
              <button
                type="button"
                onClick={toggleAll}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-3 w-full"
              >
                <div className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                  allImportableSelected
                    ? 'bg-[#EE4D2D] border-[#EE4D2D]'
                    : 'border-border'
                )}>
                  {allImportableSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span>Selecionar todos</span>
                <span className="ml-auto text-[11px] text-[#EE4D2D]">
                  {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Product list */}
              <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                {products.map(product => {
                  const isDisabled = product.already_imported && !product.price_changed;
                  const isSelected = selected.has(product.item_id);

                  return (
                    <div
                      key={product.item_id}
                      onClick={() => !isDisabled && toggleSelect(product.item_id)}
                      className={cn(
                        'flex items-center gap-2.5 p-2.5 rounded-lg border transition-all',
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed border-border'
                          : isSelected
                            ? 'border-[#EE4D2D]/40 bg-[#EE4D2D]/5 cursor-pointer'
                            : 'border-border hover:border-muted-foreground/30 cursor-pointer'
                      )}
                    >
                      {/* Checkbox */}
                      <div className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                        isSelected && !isDisabled
                          ? 'bg-[#EE4D2D] border-[#EE4D2D]'
                          : 'border-border'
                      )}>
                        {isSelected && !isDisabled && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Thumbnail */}
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt=""
                          className="w-9 h-9 rounded-md object-cover border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-surface-2 border border-border flex items-center justify-center flex-shrink-0 text-sm">
                          📦
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium truncate text-foreground">
                            {product.item_name}
                          </p>
                          {!product.already_imported && (
                            <span className="text-[10px] bg-emerald-500/15 text-emerald-500 rounded px-1.5 py-0.5 flex-shrink-0">
                              novo
                            </span>
                          )}
                          {product.price_changed && (
                            <span className="text-[10px] bg-[#EE4D2D]/15 text-[#EE4D2D] rounded px-1.5 py-0.5 flex-shrink-0">
                              atualizar preço
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatPrice(product.price)} · estoque: {product.stock} un
                          {product.already_imported && !product.price_changed && (
                            <span className="text-muted-foreground/60"> · já cadastrado</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Note */}
              <div className="text-[11px] text-muted-foreground bg-surface-2 rounded-md p-2.5 mt-3 leading-relaxed">
                🔒 Preço de venda e estoque serão importados como somente leitura. Você preencherá o custo depois.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!loading && products.length > 0 && (
          <DialogFooter className="px-5 py-4 border-t border-border gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={handleImport}
              disabled={selected.size === 0 || importing}
              className="bg-[#EE4D2D] hover:bg-[#EE4D2D]/90 text-white"
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Importando...</>
              ) : (
                `Importar ${selected.size} produto${selected.size !== 1 ? 's' : ''} →`
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
