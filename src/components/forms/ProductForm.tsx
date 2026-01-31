import { useState, useEffect, useMemo } from 'react';
import { X, Camera, Calculator, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig } from '@/types/store';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | Partial<Product>) => void;
}

export function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const { currentStore, calculateProduct } = useStore();
  
  const [name, setName] = useState(product?.name || '');
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() || '');
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || '');
  const [packagingCost, setPackagingCost] = useState(product?.packagingCost?.toString() || '0');
  const [adsCost, setAdsCost] = useState(product?.adsCost?.toString() || '0');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');

  const config = currentStore?.config;

  const calculation = useMemo<ProductCalculation | null>(() => {
    if (!config || !costPrice || !salePrice) return null;
    
    const tempProduct: Product = {
      id: 'temp',
      storeId: currentStore?.id || '',
      name,
      costPrice: parseFloat(costPrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      packagingCost: parseFloat(packagingCost) || 0,
      adsCost: parseFloat(adsCost) || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return calculateProduct(tempProduct, config);
  }, [config, costPrice, salePrice, packagingCost, adsCost, calculateProduct, currentStore?.id, name]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentStore || !name || !costPrice || !salePrice) return;

    const productData = {
      ...(product?.id && { id: product.id }),
      storeId: currentStore.id,
      name,
      costPrice: parseFloat(costPrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      packagingCost: parseFloat(packagingCost) || 0,
      adsCost: parseFloat(adsCost) || 0,
      imageUrl: imageUrl || undefined,
    };

    onSave(productData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const TrendIcon = calculation?.isAboveTarget ? TrendingUp : TrendingDown;
  const marginStatus = calculation?.isAboveTarget ? 'success' : 'danger';

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-xl animate-slide-in-bottom max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {product ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Image Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              {imageUrl ? (
                <div className="relative">
                  <img 
                    src={imageUrl} 
                    alt="Preview" 
                    className="w-24 h-24 rounded-2xl object-cover"
                  />
                  <div className="absolute inset-0 bg-foreground/20 rounded-2xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-background" />
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-secondary flex flex-col items-center justify-center gap-1 hover:bg-secondary/80 transition-colors">
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Foto</span>
                </div>
              )}
            </label>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Produto *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Camiseta Básica"
              className="input-focus"
              required
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice">Preço de Custo *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-10 input-focus"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice">Preço de Venda *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0,00"
                  className="pl-10 input-focus"
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Costs */}
          {config?.enablePackaging && (
            <div className="space-y-2">
              <Label htmlFor="packagingCost">Custo de Embalagem</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="packagingCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  placeholder="0,00"
                  className="pl-10 input-focus"
                />
              </div>
            </div>
          )}

          {config?.enableAds && (
            <div className="space-y-2">
              <Label htmlFor="adsCost">Custo de Shopee Ads</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input
                  id="adsCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={adsCost}
                  onChange={(e) => setAdsCost(e.target.value)}
                  placeholder="0,00"
                  className="pl-10 input-focus"
                />
              </div>
            </div>
          )}

          {/* Live Calculation */}
          {calculation && (
            <div className={cn(
              'rounded-2xl p-4 space-y-3 animate-scale-in',
              calculation.isAboveTarget ? 'bg-success-muted' : 'bg-danger-muted'
            )}>
              <div className="flex items-center gap-2">
                <Calculator className={cn(
                  'w-5 h-5',
                  calculation.isAboveTarget ? 'text-success' : 'text-danger'
                )} />
                <span className={cn(
                  'font-semibold',
                  calculation.isAboveTarget ? 'text-success' : 'text-danger'
                )}>
                  Cálculo em Tempo Real
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className={cn(
                    'text-xs',
                    calculation.isAboveTarget ? 'text-success/70' : 'text-danger/70'
                  )}>
                    Lucro Líquido
                  </p>
                  <p className={cn(
                    'text-xl font-bold',
                    calculation.isAboveTarget ? 'text-success' : 'text-danger'
                  )}>
                    {formatCurrency(calculation.netProfit)}
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-xs',
                    calculation.isAboveTarget ? 'text-success/70' : 'text-danger/70'
                  )}>
                    Margem Real
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    <TrendIcon className={cn(
                      'w-5 h-5',
                      calculation.isAboveTarget ? 'text-success' : 'text-danger'
                    )} />
                    <span className={cn(
                      'text-xl font-bold',
                      calculation.isAboveTarget ? 'text-success' : 'text-danger'
                    )}>
                      {calculation.realMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {!calculation.isAboveTarget && (
                <div className="flex items-center gap-2 pt-2 border-t border-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-xs text-danger">
                    Margem {Math.abs(calculation.marginDifference).toFixed(1)}% abaixo do desejado ({config?.desiredMargin}%)
                  </span>
                </div>
              )}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border safe-bottom">
          <Button 
            type="submit" 
            onClick={handleSubmit}
            className="w-full h-12 text-base font-semibold"
            disabled={!name || !costPrice || !salePrice}
          >
            {product ? 'Salvar Alterações' : 'Adicionar Produto'}
          </Button>
        </div>
      </div>
    </div>
  );
}
