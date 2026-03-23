import { useState, useMemo } from 'react';
import { X, Camera, Calculator, TrendingUp, TrendingDown, AlertTriangle, Save, Loader2, ChevronDown, CalendarDays, Settings2, Info, ExternalLink } from 'lucide-react';
import { ProductAdsSection } from '@/components/forms/ProductAdsSection';
import { Product, ShopeeAceleraOption, getShopeeFeeForPrice, OutrosCanais } from '@/types/store';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn, getMarginStatus } from '@/lib/utils';
import { compressImage } from '@/lib/imageUtils';

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> | Partial<Product>) => void | Promise<void>;
}

export function ProductForm({ product, onClose, onSave }: ProductFormProps) {
  const { currentStore } = useStore();
  const config = currentStore?.config;

  const [name, setName] = useState(product?.name || '');
  const [costPrice, setCostPrice] = useState(product?.costPrice?.toString() || '');
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || '');
  const [packagingCost, setPackagingCost] = useState(product?.packagingCost?.toString() || '0');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  const [enableAds, setEnableAds] = useState((product?.adsCost || 0) > 0);
  const [adsCostValue, setAdsCostValue] = useState(product?.adsCost?.toString() || '0');
  const [optionalCostsOpen, setOptionalCostsOpen] = useState(false);
  const [monthlySales, setMonthlySales] = useState(50);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const activeGlobalConfigs = useMemo(() => {
    if (!config) return [];
    const items: string[] = [];
    if (config.isCpfSeller && config.hasOver450Orders) items.push('Adicional CPF R$3,00');
    if ((config.taxes || 0) > 0) items.push(`Impostos ${config.taxes}%`);
    if (config.enableAffiliateCommission && (config.affiliateCommission || 0) > 0) items.push(`Afiliados ${config.affiliateCommission}%`);
    if (config.enableShopeeCampaigns && (config.shopeeCampaigns || 0) > 0) items.push(`Campanhas ${config.shopeeCampaigns}%`);
    if (config.shopeeAcelera === 'indicado') items.push('Shopee Acelera 2,5%');
    if (config.shopeeAcelera === 'nao_indicado') items.push('Shopee Acelera 3,5%');
    return items;
  }, [config]);

  const localCalc = useMemo(() => {
    const sp = parseFloat(salePrice) || 0;
    const cp = parseFloat(costPrice) || 0;
    const pkg = parseFloat(packagingCost) || 0;
    if (sp <= 0 || cp <= 0) return null;

    const range = getShopeeFeeForPrice(sp);
    const shopeeFeePercent = sp * (range.percent / 100);
    const shopeeFeeFixed = range.fixed;
    const cpfExtra = config?.isCpfSeller && config?.hasOver450Orders ? 3 : 0;
    const totalShopeeFee = shopeeFeePercent + shopeeFeeFixed + cpfExtra;
    const adsCost = enableAds ? (parseFloat(adsCostValue) || 0) : 0;
    const taxesCost = (config?.taxes || 0) > 0 ? sp * ((config?.taxes || 0) / 100) : 0;
    const affiliateCost = config?.enableAffiliateCommission ? sp * ((config?.affiliateCommission || 0) / 100) : 0;
    const campaignsCost = config?.enableShopeeCampaigns ? sp * ((config?.shopeeCampaigns || 0) / 100) : 0;
    const aceleraVal = config?.shopeeAcelera || 'none';
    const aceleraCost = aceleraVal === 'indicado' ? sp * 0.025 : aceleraVal === 'nao_indicado' ? sp * 0.035 : 0;

    const totalCosts = cp + pkg + totalShopeeFee + adsCost + taxesCost + affiliateCost + campaignsCost + aceleraCost;
    const netProfit = sp - totalCosts;
    const realMargin = sp > 0 ? (netProfit / sp) * 100 : 0;

    return {
      grossRevenue: sp, totalShopeeFee, shopeeFeePercent,
      shopeeFeeFixed: shopeeFeeFixed + cpfExtra, adsCost, taxesCost,
      affiliateCost, campaignsCost, aceleraCost, totalCosts, netProfit, realMargin,
      isAboveTarget: realMargin >= (config?.desiredMargin || 17),
      marginDifference: realMargin - (config?.desiredMargin || 17),
    };
  }, [salePrice, costPrice, packagingCost, enableAds, adsCostValue, config]);

  const roasValues = useMemo(() => {
    if (!localCalc || localCalc.grossRevenue <= 0) return null;
    const sp = localCalc.grossRevenue;
    const costs = localCalc.totalCosts;
    const roasEmpate = sp / (sp - costs);
    if (!isFinite(roasEmpate) || roasEmpate <= 0) return null;
    return { roasEmpate, roasSaudavel: roasEmpate * 1.2, roasIdeal: roasEmpate * 1.5 };
  }, [localCalc]);

  const monthlyRevenue = localCalc ? localCalc.grossRevenue * monthlySales : 0;
  const monthlyCosts = localCalc ? localCalc.totalCosts * monthlySales : 0;
  const monthlyProfit = localCalc ? localCalc.netProfit * monthlySales : 0;
  const monthlyMargin = localCalc ? localCalc.realMargin : 0;
  const monthlyStatusConfig = (() => {
    const s = getMarginStatus(monthlyMargin);
    return { emoji: s.emoji, label: s.label, bg: `${s.bg} ${s.border}`, text: s.color, message: s.message };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore || !name.trim() || parseFloat(costPrice) <= 0 || parseFloat(salePrice) <= 0) return;
    setIsSaving(true);
    try {
      const productData = {
        ...(product?.id && { id: product.id }),
        storeId: currentStore.id,
        name: name.trim(),
        costPrice: parseFloat(costPrice) || 0,
        salePrice: parseFloat(salePrice) || 0,
        packagingCost: parseFloat(packagingCost) || 0,
        adsCost: enableAds ? (parseFloat(adsCostValue) || 0) : 0,
        adsRevenue: 0,
        imageUrl: imageUrl || undefined,
        stockQuantity: product?.stockQuantity || 0,
        hasVariations: product?.hasVariations || false,
        attributes: product?.attributes || [],
        variations: product?.variations || [],
        shopeeAcelera: 'none' as ShopeeAceleraOption,
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
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setImageUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const isValid =
    name.trim().length > 0 &&
    parseFloat(costPrice) > 0 &&
    parseFloat(salePrice) > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-up">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-surface rounded-t-2xl animate-slide-up max-h-[92vh] overflow-hidden flex flex-col border-t border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">{product ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-2" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Image Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer group">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="Preview" className="w-24 h-24 rounded-xl object-cover ring-1 ring-border group-hover:ring-primary transition-all" />
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-surface-2 border border-border flex flex-col items-center justify-center gap-1.5 group-hover:border-primary/30 transition-colors">
                  <Camera className="w-6 h-6 text-text-3" />
                  <span className="text-[10px] text-text-3">Adicionar</span>
                </div>
              )}
            </label>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="section-label">Nome do Produto *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Camiseta Básica" className="h-12 bg-surface-2 border-border rounded-lg focus:border-primary" required />
          </div>

          {/* Custo + Venda */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="section-label">Preço de Custo *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
                <Input type="number" inputMode="decimal" step="0.01" min="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0,00" className="pl-12 h-12 bg-surface-2 border-border rounded-lg focus:border-primary font-mono font-mono-num" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="section-label">Preço de Venda *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
                <Input type="number" inputMode="decimal" step="0.01" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="0,00" className="pl-12 h-12 bg-surface-2 border-border rounded-lg focus:border-primary font-mono font-mono-num" required />
              </div>
            </div>
          </div>

          {/* Embalagem */}
          <div className="space-y-1.5">
            <label className="section-label">Embalagem e Insumos</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
              <Input type="number" inputMode="decimal" step="0.01" min="0" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} placeholder="0,00" className="pl-12 h-12 bg-surface-2 border-border rounded-lg focus:border-primary font-mono font-mono-num" />
            </div>
          </div>

          {/* Optional Costs */}
          <Collapsible open={optionalCostsOpen} onOpenChange={setOptionalCostsOpen}>
            <CollapsibleTrigger asChild>
              <button type="button" className="w-full surface-card p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-text-2" />
                  <span className="text-sm font-medium text-foreground">Custos Opcionais</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-text-3 transition-transform duration-150", optionalCostsOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              <div className="surface-card p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Shopee Ads</span>
                  <Switch checked={enableAds} onCheckedChange={setEnableAds} />
                </div>
                {enableAds && (
                  <div className="space-y-1.5">
                    <label className="section-label">Custo de Ads (R$)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-sm border-r border-border pr-2">R$</span>
                      <Input type="number" inputMode="decimal" step="0.01" min="0" value={adsCostValue} onChange={(e) => setAdsCostValue(e.target.value)} placeholder="0,00" className="pl-12 h-10 bg-surface-2 border-border rounded-lg focus:border-primary font-mono font-mono-num" />
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Global Configs */}
          <div className="surface-card p-3.5">
            {activeGlobalConfigs.length > 0 ? (
              <div className="flex items-start gap-2">
                <span className="text-success mt-0.5 flex-shrink-0 text-sm">✓</span>
                <div>
                  <p className="text-xs font-medium text-foreground">Aplicando: {activeGlobalConfigs.join(' · ')}</p>
                  <a href="/settings" className="text-[10px] text-primary hover:underline inline-flex items-center gap-1 mt-1">
                    Alterar nas configurações <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-text-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-text-2">Configure taxas globais em Configurações para aplicar automaticamente.</p>
                  <a href="/settings" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1 font-medium">
                    Ir para Configurações <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Live Calculation Preview */}
          {localCalc && (
            <div className={cn('rounded-[14px] p-4 space-y-3 animate-fade-up border', getMarginStatus(localCalc.realMargin).bg, getMarginStatus(localCalc.realMargin).border)}>
              <div className="flex items-center gap-2">
                <Calculator className={cn('w-4 h-4', getMarginStatus(localCalc.realMargin).color)} />
                <span className={cn('font-semibold text-sm', getMarginStatus(localCalc.realMargin).color)}>Prévia do Cálculo</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="section-label mb-0.5">Lucro Líquido</p>
                  <p className={cn('font-mono text-2xl font-bold font-mono-num', getMarginStatus(localCalc.realMargin).color)}>{formatCurrency(localCalc.netProfit)}</p>
                </div>
                <div className="text-right">
                  <p className="section-label mb-0.5">Margem Real</p>
                  <div className="flex items-center justify-end gap-1.5">
                    {localCalc.realMargin >= 0 ? <TrendingUp className={cn('w-4 h-4', getMarginStatus(localCalc.realMargin).color)} /> : <TrendingDown className={cn('w-4 h-4', getMarginStatus(localCalc.realMargin).color)} />}
                    <span className={cn('font-mono text-2xl font-bold font-mono-num', getMarginStatus(localCalc.realMargin).color)}>{localCalc.realMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className={cn('pt-3 border-t text-xs space-y-1', localCalc.isAboveTarget ? 'border-success/20' : 'border-danger/20')}>
                <div className="flex justify-between text-text-2"><span>Taxa Shopee (automática)</span><span className="font-mono font-mono-num">{formatCurrency(localCalc.totalShopeeFee)}</span></div>
                {localCalc.taxesCost > 0 && <div className="flex justify-between text-text-2"><span>Impostos ({config?.taxes}%)</span><span className="font-mono font-mono-num">{formatCurrency(localCalc.taxesCost)}</span></div>}
                {localCalc.adsCost > 0 && <div className="flex justify-between text-text-2"><span>Shopee Ads</span><span className="font-mono font-mono-num">{formatCurrency(localCalc.adsCost)}</span></div>}
                {localCalc.campaignsCost > 0 && <div className="flex justify-between text-text-2"><span>Campanhas ({config?.shopeeCampaigns}%)</span><span className="font-mono font-mono-num">{formatCurrency(localCalc.campaignsCost)}</span></div>}
                {localCalc.affiliateCost > 0 && <div className="flex justify-between text-text-2"><span>Afiliados ({config?.affiliateCommission}%)</span><span className="font-mono font-mono-num">{formatCurrency(localCalc.affiliateCost)}</span></div>}
                {localCalc.aceleraCost > 0 && <div className="flex justify-between text-text-2"><span>Shopee Acelera</span><span className="font-mono font-mono-num">{formatCurrency(localCalc.aceleraCost)}</span></div>}
              </div>

              {!localCalc.isAboveTarget && (
                <div className="flex items-center gap-2 pt-3 border-t border-danger/20">
                  <AlertTriangle className="w-4 h-4 text-danger" />
                  <span className="text-xs font-medium text-danger">{Math.abs(localCalc.marginDifference).toFixed(1)}% abaixo da meta de {config?.desiredMargin}%</span>
                </div>
              )}
            </div>
          )}

          {/* Ads Section */}
          {product?.id && (
            <ProductAdsSection productId={product.id} />
          )}

          {/* ROAS */}
          <div className="grid grid-cols-3 gap-2">
            <div className="surface-card p-3 space-y-1 border-danger/20">
              <p className="section-label">ROAS Empate</p>
              <p className="font-mono text-lg font-bold font-mono-num text-danger">{roasValues && isFinite(roasValues.roasEmpate) && roasValues.roasEmpate > 0 ? roasValues.roasEmpate.toFixed(2) : '--'}</p>
              <p className="text-[9px] text-text-3 leading-tight">Abaixo disso é prejuízo</p>
            </div>
            <div className="surface-card p-3 space-y-1 border-warning/20">
              <p className="section-label">ROAS Saudável</p>
              <p className="font-mono text-lg font-bold font-mono-num text-warning">{roasValues && isFinite(roasValues.roasSaudavel) && roasValues.roasSaudavel > 0 ? roasValues.roasSaudavel.toFixed(2) : '--'}</p>
              <p className="text-[9px] text-text-3 leading-tight">Mínimo para lucrar</p>
            </div>
            <div className="surface-card p-3 space-y-1 border-success/30 relative">
              <div className="absolute -top-2 right-2 bg-success text-success-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-[6px]">META</div>
              <p className="section-label">ROAS Ideal</p>
              <p className="font-mono text-lg font-bold font-mono-num text-success">{roasValues && isFinite(roasValues.roasIdeal) && roasValues.roasIdeal > 0 ? roasValues.roasIdeal.toFixed(2) : '--'}</p>
              <p className="text-[9px] text-text-3 leading-tight">Meta para escalar</p>
            </div>
          </div>

          {/* Monthly Projection */}
          <div className="surface-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-text-2" />
              <span className="text-sm font-semibold text-foreground">Projeção Mensal</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-2">Quantas vendas por mês?</span>
                <Input type="number" min={1} max={1000} value={monthlySales} onChange={(e) => setMonthlySales(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))} className="w-20 h-8 text-sm text-center font-bold font-mono font-mono-num bg-surface-2 border-border rounded-lg" />
              </div>
              <Slider value={[monthlySales]} onValueChange={([v]) => setMonthlySales(v)} min={1} max={1000} step={1} />
              <div className="flex justify-between text-[10px] text-text-3"><span>1</span><span>500</span><span>1000</span></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="section-label">Receita Bruta</p>
                <p className="text-sm font-bold font-mono font-mono-num mt-1 text-foreground">{localCalc ? formatCurrency(monthlyRevenue) : '--'}</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="section-label">Custos Totais</p>
                <p className="text-sm font-bold font-mono font-mono-num text-destructive mt-1">{localCalc ? formatCurrency(monthlyCosts) : '--'}</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="section-label">Lucro Mensal</p>
                <p className={cn('text-sm font-bold font-mono font-mono-num mt-1', localCalc ? (monthlyProfit >= 0 ? 'text-success' : 'text-destructive') : 'text-foreground')}>{localCalc ? formatCurrency(monthlyProfit) : '--'}</p>
              </div>
              <div className="bg-surface-2 rounded-lg p-3">
                <p className="section-label">Margem de Lucro</p>
                <p className={cn('text-sm font-bold font-mono font-mono-num mt-1', localCalc ? getMarginStatus(monthlyMargin).color : 'text-foreground')}>{localCalc ? `${monthlyMargin.toFixed(1)}%` : '--'}</p>
              </div>
            </div>
            {localCalc && (
              <div className={cn('rounded-lg border p-3 flex items-center gap-2', monthlyStatusConfig.bg)}>
                <span className="text-lg">{monthlyStatusConfig.emoji}</span>
                <div>
                  <p className={cn('text-sm font-semibold', monthlyStatusConfig.text)}>{monthlyStatusConfig.label}</p>
                  <p className="text-[10px] text-text-2">{monthlySales} vendas/mês × {formatCurrency(parseFloat(salePrice) || 0)}/un</p>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-border safe-bottom bg-surface">
          <Button type="submit" onClick={handleSubmit} className="w-full h-12 text-[15px] font-semibold bg-primary hover:bg-primary/90 rounded-[10px] transition-colors active:scale-[0.98]" disabled={!isValid || isSaving}>
            {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Save className="w-4 h-4 mr-2" />{product ? 'Salvar Alterações' : 'Salvar Produto'}</>)}
          </Button>
        </div>
      </div>
    </div>
  );
}
