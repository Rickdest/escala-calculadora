import { useState, useRef } from 'react';
import { X, Upload, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '@/types/store';
import { parseShopeeAdsCSV, ParsedAdMetric } from '@/lib/shopeeAdsParser';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImportAdsModalProps {
  products: Product[];
  preselectedProductId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportAdsModal({ products, preselectedProductId, onClose, onSuccess }: ImportAdsModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(preselectedProductId || null);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

  const step = preselectedProductId ? 'upload' : (selectedProductId ? 'upload' : 'select');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedProductId) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = parseShopeeAdsCSV(text);
      if (!parsed || parsed.metrics.length === 0) {
        toast.error('CSV inválido ou sem dados');
        return;
      }

      const metric = parsed.metrics[0];
      await saveMetric(metric, selectedProductId);
      toast.success('Dados de Ads importados com sucesso');
      onSuccess();
      onClose();
    } catch {
      toast.error('Erro ao importar CSV');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveMetric = async (metric: ParsedAdMetric, productId: string) => {
    if (!user) return;
    // Remove old metrics for this product
    await supabase.from('product_ads_metrics').delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    await supabase.from('product_ads_metrics').insert({
      user_id: user.id,
      product_id: productId,
      shopee_product_id: metric.shopeeProductId || null,
      shopee_product_name: metric.shopeeProductName || null,
      period_start: metric.periodStart,
      period_end: metric.periodEnd,
      impressions: metric.impressions,
      clicks: metric.clicks,
      items_sold: metric.itemsSold,
      gmv: metric.gmv,
      spend: metric.spend,
      roas: metric.roas,
      acos: metric.acos,
      avg_position: metric.avgPosition,
      ctr: metric.ctr,
      conv_rate: metric.convRate,
      direct_roas: metric.directRoas,
      direct_acos: metric.directAcos,
      cost_per_conv: metric.costPerConv,
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground text-sm">
            {step === 'select' ? 'Selecione o produto' : 'Importar CSV de Ads'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {step === 'select' ? (
            <>
              <p className="text-xs text-muted-foreground">
                Escolha o produto para vincular os dados de anúncios:
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-10 h-10 text-sm"
                />
              </div>
              <div className="space-y-1 max-h-[300px] overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
                {filtered.length > 0 ? filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProductId(p.id)}
                    className="w-full text-left p-2.5 rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-3"
                  >
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        R$ {p.salePrice.toFixed(2)}
                      </p>
                    </div>
                  </button>
                )) : (
                  <p className="text-center text-sm text-muted-foreground py-6">Nenhum produto encontrado</p>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected product info */}
              {selectedProduct && (
                <div className="surface-card p-3 flex items-center gap-3">
                  {selectedProduct.imageUrl ? (
                    <img src={selectedProduct.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{selectedProduct.name}</p>
                    <p className="text-[11px] text-muted-foreground">R$ {selectedProduct.salePrice.toFixed(2)}</p>
                  </div>
                  {!preselectedProductId && (
                    <button onClick={() => setSelectedProductId(null)} className="text-xs text-primary underline flex-shrink-0">
                      Trocar
                    </button>
                  )}
                </div>
              )}

              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />

              <div className="text-center space-y-3 py-4">
                <p className="text-xs text-muted-foreground">
                  Exporte o CSV "Por Produto" no painel de Ads da Shopee e importe aqui.
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="h-12 w-full rounded-xl text-sm font-bold gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importando...' : 'Selecionar arquivo CSV'}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  Shopee Ads → Relatório → Por Produto → Exportar CSV
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
