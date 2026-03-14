import { useState, useMemo } from 'react';
import { X, Camera, Calculator, TrendingUp, TrendingDown, AlertTriangle, Save, Loader2, Plus, Trash2, ChevronDown, CalendarDays, Settings2 } from 'lucide-react';
import { Product, ProductCalculation, StoreConfig, ProductVariation, ShopeeAceleraOption } from '@/types/store';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | Partial<Product>) => void | Promise<void>;
}

export function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const { currentStore, calculateProduct } = useStore();

  const [name, setName] = useState(product?.name || '');
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() || '');
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || '');
  const [packagingCost, setPackagingCost] = useState(product?.packagingCost?.toString() || '0');
  const [adsCost, setAdsCost] = useState(product?.adsCost?.toString() || '0');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity?.toString() || '0');
  const [hasVariations, setHasVariations] = useState(product?.hasVariations || false);
  const [variations, setVariations] = useState<ProductVariation[]>(product?.variations || []);
  const [variationsOpen, setVariationsOpen] = useState(product?.hasVariations || false);
  const [monthlySales, setMonthlySales] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [optionalCostsOpen, setOptionalCostsOpen] = useState(false);

  const config = currentStore?.config;

  // Use store-level shopeeAcelera setting
  const shopeeAcelera: ShopeeAceleraOption = (currentStore as any)?.shopee_acelera || product?.shopeeAcelera || 'none';

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
      adsRevenue: 0,
      stockQuantity: parseInt(stockQuantity) || 0,
      hasVariations,
      variations,
      shopeeAcelera,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return calculateProduct(tempProduct, config);
  }, [config, costPrice, salePrice, packagingCost, adsCost, calculateProduct, currentStore?.id, name, stockQuantity, hasVariations, variations, shopeeAcelera]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !name || !costPrice || !salePrice) return;
    setIsSaving(true);
    try {
      const productData = {
        ...(product?.id && { id: product.id }),
        storeId: currentStore.id,
        name,
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        packagingCost: parseFloat(packagingCost) || 0,
        adsCost: parseFloat(adsCost) || 0,
        imageUrl: imageUrl || undefined,
        stockQuantity: parseInt(stockQuantity) || 0,
        hasVariations,
        variations: hasVariations ? variations : [],
        shopeeAcelera,
      };
      await Promise.resolve(onSave(productData));
    } catch {
      // Error handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setImageUrl(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const addVariation = () => {
    const newVariation: ProductVariation = {
      id: Math.random().toString(36).substring(2, 15),
      name: '',
      costPrice: parseFloat(costPrice) || 0,
      salePrice: parseFloat(salePrice) || 0,
      stockQuantity: 0,
    };
    setVariations([...variations, newVariation]);
  };

  const updateVariation = (id: string, updates: Partial<ProductVariation>) => {
    setVariations(variations.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const removeVariation = (id: string) => {
    setVariations(variations.filter(v => v.id !== id));
  };

  const isValid = name && costPrice && salePrice;
  const TrendIcon = calculation?.isAboveTarget ? TrendingUp : TrendingDown;

  // Check if there are any optional costs enabled
  const hasOptionalCosts = config?.enablePackaging || config?.enableAds;

  // Monthly simulation
  const monthlyRevenue = calculation ? calculation.grossRevenue * monthlySales : 0;
  const monthlyCosts = calculation ? calculation.totalCosts * monthlySales : 0;
  const monthlyProfit = calculation ? calculation.netProfit * monthlySales : 0;
  const monthlyStatus = monthlyProfit <= 0 ? 'danger' : monthlyProfit < monthlyRevenue * 0.05 ? 'warning' : 'success';
  const monthlyStatusConfig = {
    danger: { emoji: '🔴', label: 'Prejuízo', bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive' },
    warning: { emoji: '🟡', label: 'Atenção', bg: 'bg-warning/10 border-warning/30', text: 'text-warning' },
    success: { emoji: '🟢', label: 'Lucrativo', bg: 'bg-success/10 border-success/30', text: 'text-success' },
  }[monthlyStatus];

  // ROAS calculation
  const roasValues = useMemo(() => {
    if (!calculation || !costPrice || !salePrice) return null;
    const sp = parseFloat(salePrice) || 0;
    if (sp <= 0 || calculation.totalCosts <= 0) return null;
    const breakEvenRoas = sp / calculation.netProfit > 0 ? calculation.totalCosts / calculation.netProfit : 0;
    const roasSaudavel = breakEvenRoas > 0 ? breakEvenRoas * 1.4 : 0;
    const roasIdeal = roasSaudavel > 0 ? roasSaudavel * 1.3 : 0;
    return { roasSaudavel, roasIdeal };
  }, [calculation, costPrice, salePrice]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm animate-fade-up">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="text-lg font-bold">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-secondary rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Image Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer group">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Preview" className="w-28 h-28 rounded-2xl object-cover ring-2 ring-border group-hover:ring-primary transition-all" />
                  <div className="absolute inset-0 bg-foreground/30 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-7 h-7 text-background" />
                  </div>
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-secondary flex flex-col items-center justify-center gap-2 group-hover:bg-secondary/80 transition-colors ring-2 ring-transparent group-hover:ring-primary/30">
                  <Camera className="w-7 h-7 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Adicionar</span>
                </div>
              )}
            </label>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold">Nome do Produto *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Camiseta Básica" className="input-modern h-12" required />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPrice" className="text-sm font-semibold">Custo *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input id="costPrice" type="number" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0,00" className="pl-12 input-modern h-12" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice" className="text-sm font-semibold">Venda *</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                <Input id="salePrice" type="number" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0,00" className="pl-12 input-modern h-12" required />
              </div>
            </div>
          </div>

          {/* Stock */}
          <div className="space-y-2">
            <Label htmlFor="stockQuantity" className="text-sm font-semibold">Quantidade em Estoque</Label>
            <Input id="stockQuantity" type="number" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} placeholder="0" className="input-modern h-12" />
          </div>

          {/* Custos Opcionais - Collapsible */}
          {hasOptionalCosts && (
            <Collapsible open={optionalCostsOpen} onOpenChange={setOptionalCostsOpen}>
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold">Custos Opcionais</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", optionalCostsOpen && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {config?.enablePackaging && (
                    <div className="space-y-2">
                      <Label htmlFor="packagingCost" className="text-sm font-semibold">Embalagem</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                        <Input id="packagingCost" type="number" step="0.01" min="0" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} placeholder="0,00" className="pl-12 input-modern h-12" />
                      </div>
                    </div>
                  )}
                  {config?.enableAds && (
                    <div className="space-y-2">
                      <Label htmlFor="adsCost" className="text-sm font-semibold">Shopee Ads</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">R$</span>
                        <Input id="adsCost" type="number" step="0.01" min="0" value={adsCost} onChange={(e) => setAdsCost(e.target.value)} placeholder="0,00" className="pl-12 input-modern h-12" />
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Variations Section */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Variações</Label>
                <p className="text-xs text-muted-foreground">Tamanhos, cores, etc.</p>
              </div>
              <Switch
                checked={hasVariations}
                onCheckedChange={(checked) => {
                  setHasVariations(checked);
                  setVariationsOpen(checked);
                  if (checked && variations.length === 0) addVariation();
                }}
              />
            </div>
            {hasVariations && (
              <Collapsible open={variationsOpen} onOpenChange={setVariationsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span>{variations.length} variações</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", variationsOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  {variations.map((variation, index) => (
                    <div key={variation.id} className="bg-secondary/50 rounded-xl p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Variação {index + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeVariation(variation.id)} className="h-8 w-8 p-0 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <Input value={variation.name} onChange={(e) => updateVariation(variation.id, { name: e.target.value })} placeholder="Ex: P, M, G ou Azul, Vermelho" className="input-modern h-10 text-sm" />
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label className="text-xs">Custo</Label><Input type="number" step="0.01" min="0" value={variation.costPrice} onChange={(e) => updateVariation(variation.id, { costPrice: parseFloat(e.target.value) || 0 })} className="input-modern h-9 text-sm" /></div>
                        <div><Label className="text-xs">Venda</Label><Input type="number" step="0.01" min="0" value={variation.salePrice} onChange={(e) => updateVariation(variation.id, { salePrice: parseFloat(e.target.value) || 0 })} className="input-modern h-9 text-sm" /></div>
                        <div><Label className="text-xs">Estoque</Label><Input type="number" min="0" value={variation.stockQuantity} onChange={(e) => updateVariation(variation.id, { stockQuantity: parseInt(e.target.value) || 0 })} className="input-modern h-9 text-sm" /></div>
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addVariation} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Variação
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          {/* Live Calculation */}
          {calculation && (
            <div className={cn('rounded-2xl p-5 space-y-4 animate-scale-up', calculation.isAboveTarget ? 'bg-success-muted' : 'bg-danger-muted')}>
              <div className="flex items-center gap-2">
                <Calculator className={cn('w-5 h-5', calculation.isAboveTarget ? 'text-success' : 'text-danger')} />
                <span className={cn('font-bold text-sm', calculation.isAboveTarget ? 'text-success' : 'text-danger')}>Prévia do Cálculo</span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className={cn('text-xs font-medium opacity-70', calculation.isAboveTarget ? 'text-success' : 'text-danger')}>Lucro Líquido</p>
                  <p className={cn('number-lg', calculation.isAboveTarget ? 'text-success' : 'text-danger')}>{formatCurrency(calculation.netProfit)}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-xs font-medium opacity-70', calculation.isAboveTarget ? 'text-success' : 'text-danger')}>Margem Real</p>
                  <div className="flex items-center justify-end gap-1.5">
                    <TrendIcon className={cn('w-5 h-5', calculation.isAboveTarget ? 'text-success' : 'text-danger')} />
                    <span className={cn('number-lg', calculation.isAboveTarget ? 'text-success' : 'text-danger')}>{calculation.realMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className={cn('pt-3 border-t text-xs space-y-1', calculation.isAboveTarget ? 'border-success/20' : 'border-danger/20')}>
                <div className="flex justify-between opacity-70">
                  <span>Taxa Shopee (automática)</span>
                  <span>{formatCurrency(calculation.totalShopeeFee)}</span>
                </div>
                <div className="flex justify-between opacity-70">
                  <span>Impostos ({config?.taxes}%)</span>
                  <span>{formatCurrency(calculation.taxes)}</span>
                </div>
                {calculation.shopeeAcelera > 0 && (
                  <div className="flex justify-between opacity-70">
                    <span>Shopee Acelera</span>
                    <span>{formatCurrency(calculation.shopeeAcelera)}</span>
                  </div>
                )}
                {(config?.affiliateCommission || 0) > 0 && (
                  <div className="flex justify-between opacity-70">
                    <span>Comissão Afiliados ({config?.affiliateCommission}%)</span>
                    <span>{formatCurrency(calculation.affiliateCommission)}</span>
                  </div>
                )}
                {(config?.shopeeCampaigns || 0) > 0 && (
                  <div className="flex justify-between opacity-70">
                    <span>Campanhas ({config?.shopeeCampaigns}%)</span>
                    <span>{formatCurrency(calculation.shopeeCampaigns)}</span>
                  </div>
                )}
              </div>

              {!calculation.isAboveTarget && (
                <div className="flex items-center gap-2 pt-3 border-t border-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-xs font-medium text-danger">
                    {Math.abs(calculation.marginDifference).toFixed(1)}% abaixo da meta de {config?.desiredMargin}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ROAS Section */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">ROAS Saudável</p>
              <p className="text-2xl font-extrabold tabular-nums text-foreground">
                {roasValues ? roasValues.roasSaudavel.toFixed(2) : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">Mínimo para não ter prejuízo</p>
            </div>
            <div className="glass-card p-4 space-y-1 border-2 border-orange-400/50 relative">
              <div className="absolute -top-2 right-3 bg-orange-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">IDEAL</div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">ROAS Ideal</p>
              <p className="text-2xl font-extrabold tabular-nums text-orange-500">
                {roasValues ? roasValues.roasIdeal.toFixed(2) : '--'}
              </p>
              <p className="text-[10px] text-muted-foreground">Meta recomendada para escalar</p>
            </div>
          </div>

          {/* Monthly Sales Simulation */}
          {calculation && (
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold">Análise de Vendas Mensais</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Quantas vendas você espera por mês?</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={monthlySales}
                    onChange={(e) => setMonthlySales(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 h-8 text-sm text-center font-bold input-modern"
                  />
                </div>
                <Slider value={[monthlySales]} onValueChange={([v]) => setMonthlySales(v)} min={1} max={1000} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1</span><span>500</span><span>1000</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Receita mensal</p>
                  <p className="text-sm font-extrabold tabular-nums mt-1">{formatCurrency(monthlyRevenue)}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Custos no mês</p>
                  <p className="text-sm font-extrabold tabular-nums text-destructive mt-1">{formatCurrency(monthlyCosts)}</p>
                </div>
                <div className="bg-secondary/30 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Lucro mensal</p>
                  <p className={cn('text-sm font-extrabold tabular-nums mt-1', monthlyProfit >= 0 ? 'text-success' : 'text-destructive')}>
                    {formatCurrency(monthlyProfit)}
                  </p>
                </div>
              </div>
              <div className={cn('rounded-xl border p-3 flex items-center gap-2', monthlyStatusConfig.bg)}>
                <span className="text-lg">{monthlyStatusConfig.emoji}</span>
                <div>
                  <p className={cn('text-sm font-bold', monthlyStatusConfig.text)}>{monthlyStatusConfig.label}</p>
                  <p className="text-[10px] text-muted-foreground">{monthlySales} vendas/mês × {formatCurrency(parseFloat(salePrice) || 0)}/un</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer with Save Button */}
        <div className="p-5 border-t border-border/50 safe-bottom bg-card">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full h-14 text-base font-bold gradient-primary hover:opacity-90 transition-opacity"
            disabled={!isValid || isSaving}
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Salvando...</>
            ) : (
              <><Save className="w-5 h-5 mr-2" />{product ? 'Salvar Alterações' : 'Salvar Produto'}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
