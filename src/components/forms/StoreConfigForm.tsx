import { useState, useEffect } from 'react';
import { X, Percent, DollarSign, Settings2, Save, Loader2, Info, Users, Megaphone, UserCheck } from 'lucide-react';
import { ShopeeAceleraOption } from '@/types/store';
import { cn } from '@/lib/utils';
import { useStore } from '@/contexts/StoreContext';
import { SHOPEE_FEE_RANGES } from '@/types/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

interface StoreConfigFormProps {
  onClose: () => void;
}

export function StoreConfigForm({ onClose }: StoreConfigFormProps) {
  const { currentStore, updateStoreConfig, stores } = useStore();
  
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '17');
  const [isCpfSeller, setIsCpfSeller] = useState(currentStore?.config.isCpfSeller ?? false);
  const [hasOver450Orders, setHasOver450Orders] = useState(currentStore?.config.hasOver450Orders ?? false);
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '0');
  const [enableTaxes, setEnableTaxes] = useState((currentStore?.config.taxes || 0) > 0);
  const [enableAffiliateCommission, setEnableAffiliateCommission] = useState(currentStore?.config.enableAffiliateCommission ?? false);
  const [affiliateCommission, setAffiliateCommission] = useState((currentStore?.config.affiliateCommission || 0).toString());
  const [enableShopeeCampaigns, setEnableShopeeCampaigns] = useState(currentStore?.config.enableShopeeCampaigns ?? false);
  const [shopeeCampaigns, setShopeeCampaigns] = useState((currentStore?.config.shopeeCampaigns || 0).toString());
  const [enableAcelera, setEnableAcelera] = useState((currentStore?.config.shopeeAcelera || 'none') !== 'none');
  const [shopeeAcelera, setShopeeAcelera] = useState<ShopeeAceleraOption>(currentStore?.config.shopeeAcelera === 'none' ? 'indicado' : (currentStore?.config.shopeeAcelera || 'indicado'));
  const [isSaving, setIsSaving] = useState(false);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (currentStore) {
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setIsCpfSeller(currentStore.config.isCpfSeller ?? false);
      setHasOver450Orders(currentStore.config.hasOver450Orders ?? false);
      setTaxes(currentStore.config.taxes.toString());
      setEnableTaxes((currentStore.config.taxes || 0) > 0);
      setAffiliateCommission((currentStore.config.affiliateCommission || 0).toString());
      setEnableAffiliateCommission(currentStore.config.enableAffiliateCommission ?? false);
      setShopeeCampaigns((currentStore.config.shopeeCampaigns || 0).toString());
      setEnableShopeeCampaigns(currentStore.config.enableShopeeCampaigns ?? false);
      const aceleraVal = (currentStore as any).shopee_acelera || 'none';
      setEnableAcelera(aceleraVal !== 'none');
      setShopeeAcelera(aceleraVal === 'none' ? 'indicado' : aceleraVal);
      setProductCount(currentStore.products?.length || 0);
    }
  }, [currentStore]);

  const handleSave = async () => {
    if (!currentStore) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const taxValue = enableTaxes ? (parseFloat(taxes) || 0) : 0;
    
    updateStoreConfig(currentStore.id, {
      isCpfSeller,
      hasOver450Orders: isCpfSeller ? hasOver450Orders : false,
      taxes: taxValue,
      desiredMargin: parseFloat(desiredMargin) || 0,
      affiliateCommission: enableAffiliateCommission ? (parseFloat(affiliateCommission) || 0) : 0,
      shopeeCampaigns: enableShopeeCampaigns ? (parseFloat(shopeeCampaigns) || 0) : 0,
      enablePackaging: true,
      enableAds: true,
      enableAffiliateCommission,
      enableShopeeCampaigns,
    });
    
    const aceleraValue = enableAcelera ? shopeeAcelera : 'none';
    await supabase.from('stores').update({ shopee_acelera: aceleraValue }).eq('id', currentStore.id);
    
    setIsSaving(false);
    
    toast({
      title: "✓ Configurações salvas",
      description: `${productCount} produto${productCount !== 1 ? 's' : ''} ${productCount !== 1 ? 'foram recalculados' : 'foi recalculado'}.`,
    });
    
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

          {/* 1. Margem Desejada */}
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
              <p className="text-xs text-muted-foreground">Produtos abaixo dessa margem serão destacados em vermelho</p>
            </div>
          </div>

          {/* 2. Tipo de Vendedor */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Tipo de Vendedor
            </h3>
            <div className="glass-card p-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setIsCpfSeller(true); setHasOver450Orders(false); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border',
                    isCpfSeller
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                  )}
                >
                  CPF (Pessoa Física)
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCpfSeller(false); setHasOver450Orders(false); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border',
                    !isCpfSeller
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                  )}
                >
                  CNPJ (Pessoa Jurídica)
                </button>
              </div>
              {isCpfSeller && (
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                  <div>
                    <p className="text-xs font-semibold">Aplicar adicional de R$3,00</p>
                    <p className="text-[10px] text-muted-foreground">Marque se você teve mais de 450 pedidos nos últimos 90 dias.</p>
                  </div>
                  <Switch checked={hasOver450Orders} onCheckedChange={setHasOver450Orders} />
                </div>
              )}
            </div>
          </div>

          {/* 3. Impostos */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Impostos
            </h3>
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Impostos</Label>
                  <p className="text-xs text-muted-foreground">Aplicado em todos os produtos</p>
                </div>
                <Switch checked={enableTaxes} onCheckedChange={setEnableTaxes} />
              </div>
              {enableTaxes && (
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
              )}
            </div>
          </div>

          {/* 4. Comissão de Afiliados */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Comissão de Afiliados
            </h3>
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Comissão</Label>
                  <p className="text-xs text-muted-foreground">Aplicado em todos os produtos</p>
                </div>
                <Switch checked={enableAffiliateCommission} onCheckedChange={setEnableAffiliateCommission} />
              </div>
              {enableAffiliateCommission && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={affiliateCommission}
                      onChange={(e) => setAffiliateCommission(e.target.value)}
                      placeholder="0"
                      className="pr-10 input-modern h-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Campanhas de Destaque */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              Campanhas de Destaque
            </h3>
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Campanhas</Label>
                  <p className="text-xs text-muted-foreground">Aplicado em todos os produtos</p>
                </div>
                <Switch checked={enableShopeeCampaigns} onCheckedChange={setEnableShopeeCampaigns} />
              </div>
              {enableShopeeCampaigns && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={shopeeCampaigns}
                      onChange={(e) => setShopeeCampaigns(e.target.value)}
                      placeholder="0"
                      className="pr-10 input-modern h-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 6. Shopee Acelera */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Shopee Acelera
            </h3>
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Shopee Acelera</Label>
                  <p className="text-xs text-muted-foreground">Aplicado em todos os produtos</p>
                </div>
                <Switch checked={enableAcelera} onCheckedChange={setEnableAcelera} />
              </div>
              {enableAcelera && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShopeeAcelera('indicado')}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                        shopeeAcelera === 'indicado'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                      )}
                    >
                      Vendedor Indicado (2,5%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShopeeAcelera('nao_indicado')}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all border',
                        shopeeAcelera === 'nao_indicado'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                      )}
                    >
                      Não Indicado (3,5%)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Taxas da Shopee (informativa) */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Taxas da Shopee
            </h3>
            <div className="glass-card p-4 space-y-4">
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
              <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Tabela vigente desde março de 2026. A comissão já contempla a taxa de transação.
                </p>
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
