import { useState, useEffect } from 'react';
import { X, Percent, DollarSign, Settings2, Save, Loader2, Info } from 'lucide-react';
import { ShopeeAceleraOption } from '@/types/store';
import { cn } from '@/lib/utils';
import { useStore } from '@/contexts/StoreContext';
import { SHOPEE_FEE_RANGES } from '@/types/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface StoreConfigFormProps {
  onClose: () => void;
}

export function StoreConfigForm({ onClose }: StoreConfigFormProps) {
  const { currentStore, updateStoreConfig } = useStore();
  
  const [isCpfSeller, setIsCpfSeller] = useState(currentStore?.config.isCpfSeller ?? false);
  const [hasOver450Orders, setHasOver450Orders] = useState(currentStore?.config.hasOver450Orders ?? false);
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '0');
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '17');
  const [affiliateCommission, setAffiliateCommission] = useState((currentStore?.config.affiliateCommission || 0).toString());
  const [shopeeCampaigns, setShopeeCampaigns] = useState((currentStore?.config.shopeeCampaigns || 0).toString());
  const [enablePackaging, setEnablePackaging] = useState(currentStore?.config.enablePackaging ?? true);
  const [enableAds, setEnableAds] = useState(currentStore?.config.enableAds ?? true);
  const [enableAffiliateCommission, setEnableAffiliateCommission] = useState(currentStore?.config.enableAffiliateCommission ?? false);
  const [enableShopeeCampaigns, setEnableShopeeCampaigns] = useState(currentStore?.config.enableShopeeCampaigns ?? false);
  const [shopeeAcelera, setShopeeAcelera] = useState<ShopeeAceleraOption>((currentStore as any)?.shopee_acelera || 'none');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentStore) {
      setIsCpfSeller(currentStore.config.isCpfSeller ?? false);
      setHasOver450Orders(currentStore.config.hasOver450Orders ?? false);
      setTaxes(currentStore.config.taxes.toString());
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setAffiliateCommission((currentStore.config.affiliateCommission || 0).toString());
      setShopeeCampaigns((currentStore.config.shopeeCampaigns || 0).toString());
      setEnablePackaging(currentStore.config.enablePackaging);
      setEnableAds(currentStore.config.enableAds);
      setEnableAffiliateCommission(currentStore.config.enableAffiliateCommission ?? false);
      setEnableShopeeCampaigns(currentStore.config.enableShopeeCampaigns ?? false);
      setShopeeAcelera((currentStore as any).shopee_acelera || 'none');
    }
  }, [currentStore]);

  const handleSave = async () => {
    if (!currentStore) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateStoreConfig(currentStore.id, {
      isCpfSeller,
      hasOver450Orders,
      taxes: parseFloat(taxes) || 0,
      desiredMargin: parseFloat(desiredMargin) || 0,
      affiliateCommission: parseFloat(affiliateCommission) || 0,
      shopeeCampaigns: parseFloat(shopeeCampaigns) || 0,
      enablePackaging,
      enableAds,
      enableAffiliateCommission,
      enableShopeeCampaigns,
    });
    
    // Save shopee_acelera directly to store
    await supabase.from('stores').update({ shopee_acelera: shopeeAcelera }).eq('id', currentStore.id);
    
    setIsSaving(false);
    onClose();
  };

  if (!currentStore) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm animate-fade-up">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[88vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl gradient-primary">
              <Settings2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Configurações</h2>
              <p className="text-xs text-muted-foreground">{currentStore.name}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 hover:bg-secondary rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Shopee Fees - Fixed/Automatic */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Taxas da Shopee
            </h3>
            
            <div className="glass-card p-4 space-y-4">
              {/* Fee ranges table */}
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="grid grid-cols-3 gap-0 text-[10px] uppercase tracking-wide font-semibold text-muted-foreground bg-secondary/50 px-3 py-2">
                  <span>Faixa de Preço</span>
                  <span className="text-center">Comissão</span>
                  <span className="text-right">Taxa Fixa</span>
                </div>
                {SHOPEE_FEE_RANGES.map((range, i) => (
                  <div key={i} className="grid grid-cols-3 gap-0 px-3 py-2.5 border-t border-border/30 text-sm">
                    <span className="font-medium text-foreground">{range.label}</span>
                    <span className="text-center text-muted-foreground">{range.percent}%</span>
                    <span className="text-right text-muted-foreground">R${range.fixed.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              {/* CPF Seller Options */}
              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Vendedor CPF</Label>
                    <p className="text-xs text-muted-foreground">Ativar taxa adicional para CPF</p>
                  </div>
                  <Switch
                    checked={isCpfSeller}
                    onCheckedChange={(v) => {
                      setIsCpfSeller(v);
                      if (!v) setHasOver450Orders(false);
                    }}
                  />
                </div>
                
                {isCpfSeller && (
                  <div className="flex items-center justify-between pl-4">
                    <div>
                      <Label className="text-sm font-medium">+450 pedidos em 90 dias</Label>
                      <p className="text-xs text-muted-foreground">Adicional de R$3,00 por item</p>
                    </div>
                    <Switch
                      checked={hasOver450Orders}
                      onCheckedChange={setHasOver450Orders}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Tabela vigente desde março de 2026. A comissão já contempla a taxa de transação.
                </p>
              </div>
            </div>
          </div>

          {/* Taxes */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Impostos
            </h3>
            <div className="space-y-2">
              <Label htmlFor="taxes" className="text-sm font-medium">Alíquota</Label>
              <div className="relative">
                <Input
                  id="taxes"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxes}
                  onChange={(e) => setTaxes(e.target.value)}
                  placeholder="0"
                  className="pr-10 input-modern h-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground">MEI, Simples Nacional, etc.</p>
            </div>
          </div>

          {/* Desired Margin */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-success" />
              Meta de Margem
            </h3>
            <div className="space-y-2">
              <Label htmlFor="desiredMargin" className="text-sm font-medium">Margem Desejada</Label>
              <div className="relative">
                <Input
                  id="desiredMargin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={desiredMargin}
                  onChange={(e) => setDesiredMargin(e.target.value)}
                  placeholder="17"
                  className="pr-10 input-modern h-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Produtos abaixo serão destacados em vermelho</p>
            </div>
          </div>

          {/* Optional Costs Toggles */}
          <div className="space-y-4 pt-4 border-t border-border/50">
            <h3 className="font-bold text-sm">Custos Opcionais</h3>
            
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enablePackaging" className="text-sm font-medium">Custo de Embalagem</Label>
                  <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
                </div>
                <Switch id="enablePackaging" checked={enablePackaging} onCheckedChange={setEnablePackaging} />
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div>
                  <Label htmlFor="enableAds" className="text-sm font-medium">Shopee Ads</Label>
                  <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
                </div>
                <Switch id="enableAds" checked={enableAds} onCheckedChange={setEnableAds} />
              </div>

              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Comissão de Afiliados</Label>
                    <p className="text-xs text-muted-foreground">Percentual sobre a venda</p>
                  </div>
                  <Switch checked={enableAffiliateCommission} onCheckedChange={setEnableAffiliateCommission} />
                </div>
                {enableAffiliateCommission && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input type="number" step="0.1" min="0" max="100" value={affiliateCommission} onChange={(e) => setAffiliateCommission(e.target.value)} placeholder="0" className="w-24 h-10 text-center input-modern" />
                    <span className="text-muted-foreground font-medium">%</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Campanhas da Shopee</Label>
                    <p className="text-xs text-muted-foreground">Desconto em campanhas</p>
                  </div>
                  <Switch checked={enableShopeeCampaigns} onCheckedChange={setEnableShopeeCampaigns} />
                </div>
                {enableShopeeCampaigns && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input type="number" step="0.1" min="0" max="100" value={shopeeCampaigns} onChange={(e) => setShopeeCampaigns(e.target.value)} placeholder="0" className="w-24 h-10 text-center input-modern" />
                    <span className="text-muted-foreground font-medium">%</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Shopee Acelera</Label>
                    <p className="text-xs text-muted-foreground">Taxa do programa Acelera</p>
                  </div>
                </div>
                <div className="space-y-2 pl-4">
                  {[
                    { value: 'none' as const, label: 'Não usar', desc: 'Sem Shopee Acelera' },
                    { value: 'indicado' as const, label: 'Vendedor Indicado', desc: '2,5% do preço de venda' },
                    { value: 'nao_indicado' as const, label: 'Não Indicado', desc: '3,5% do preço de venda' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setShopeeAcelera(opt.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border',
                        shopeeAcelera === opt.value
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-card/50 border-border/30 hover:bg-primary/5'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        shopeeAcelera === opt.value ? 'border-primary' : 'border-muted-foreground/40'
                      )}>
                        {shopeeAcelera === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div>
                        <p className={cn('text-sm font-semibold', shopeeAcelera === opt.value ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border/50 safe-bottom bg-card">
          <Button 
            onClick={handleSave}
            className="w-full h-14 text-base font-bold gradient-primary hover:opacity-90 transition-opacity"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}