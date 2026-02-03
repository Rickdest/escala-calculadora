import { useState, useEffect } from 'react';
import { X, Percent, DollarSign, Settings2, Save, Loader2 } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface StoreConfigFormProps {
  onClose: () => void;
}

export function StoreConfigForm({ onClose }: StoreConfigFormProps) {
  const { currentStore, updateStoreConfig } = useStore();
  
  const [shopeeFeePercent, setShopeeFeePercent] = useState(currentStore?.config.shopeeFeePercent?.toString() || '20');
  const [shopeeFeeFixed, setShopeeFeeFixed] = useState(currentStore?.config.shopeeFeeFixed?.toString() || '4');
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '0');
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '17');
  const [affiliateCommission, setAffiliateCommission] = useState((currentStore?.config.affiliateCommission || 0).toString());
  const [shopeeCampaigns, setShopeeCampaigns] = useState((currentStore?.config.shopeeCampaigns || 0).toString());
  const [enablePackaging, setEnablePackaging] = useState(currentStore?.config.enablePackaging ?? true);
  const [enableAds, setEnableAds] = useState(currentStore?.config.enableAds ?? true);
  const [enableAffiliateCommission, setEnableAffiliateCommission] = useState(currentStore?.config.enableAffiliateCommission ?? false);
  const [enableShopeeCampaigns, setEnableShopeeCampaigns] = useState(currentStore?.config.enableShopeeCampaigns ?? false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentStore) {
      setShopeeFeePercent(currentStore.config.shopeeFeePercent.toString());
      setShopeeFeeFixed((currentStore.config.shopeeFeeFixed || 0).toString());
      setTaxes(currentStore.config.taxes.toString());
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setAffiliateCommission((currentStore.config.affiliateCommission || 0).toString());
      setShopeeCampaigns((currentStore.config.shopeeCampaigns || 0).toString());
      setEnablePackaging(currentStore.config.enablePackaging);
      setEnableAds(currentStore.config.enableAds);
      setEnableAffiliateCommission(currentStore.config.enableAffiliateCommission ?? false);
      setEnableShopeeCampaigns(currentStore.config.enableShopeeCampaigns ?? false);
    }
  }, [currentStore]);

  const handleSave = async () => {
    if (!currentStore) return;
    
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    updateStoreConfig(currentStore.id, {
      shopeeFeePercent: parseFloat(shopeeFeePercent) || 0,
      shopeeFeeFixed: parseFloat(shopeeFeeFixed) || 0,
      taxes: parseFloat(taxes) || 0,
      desiredMargin: parseFloat(desiredMargin) || 0,
      affiliateCommission: parseFloat(affiliateCommission) || 0,
      shopeeCampaigns: parseFloat(shopeeCampaigns) || 0,
      enablePackaging,
      enableAds,
      enableAffiliateCommission,
      enableShopeeCampaigns,
    });
    
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
          {/* Shopee Fees */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Taxas da Shopee
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopeeFeePercent" className="text-sm font-medium">Taxa Percentual</Label>
                <div className="relative">
                  <Input
                    id="shopeeFeePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={shopeeFeePercent}
                    onChange={(e) => setShopeeFeePercent(e.target.value)}
                    placeholder="20"
                    className="pr-10 input-modern h-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopeeFeeFixed" className="text-sm font-medium">Taxa Fixa</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                  <Input
                    id="shopeeFeeFixed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={shopeeFeeFixed}
                    onChange={(e) => setShopeeFeeFixed(e.target.value)}
                    placeholder="4.00"
                    className="pl-12 input-modern h-12"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A taxa fixa é cobrada por venda além da comissão percentual
            </p>
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
              <p className="text-xs text-muted-foreground">
                MEI, Simples Nacional, etc.
              </p>
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
              <p className="text-xs text-muted-foreground">
                Produtos abaixo serão destacados em vermelho
              </p>
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
                <Switch
                  id="enablePackaging"
                  checked={enablePackaging}
                  onCheckedChange={setEnablePackaging}
                />
              </div>
              
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div>
                  <Label htmlFor="enableAds" className="text-sm font-medium">Shopee Ads</Label>
                  <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
                </div>
                <Switch
                  id="enableAds"
                  checked={enableAds}
                  onCheckedChange={setEnableAds}
                />
              </div>

              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableAffiliateCommission" className="text-sm font-medium">Comissão de Afiliados</Label>
                    <p className="text-xs text-muted-foreground">Percentual sobre a venda</p>
                  </div>
                  <Switch
                    id="enableAffiliateCommission"
                    checked={enableAffiliateCommission}
                    onCheckedChange={setEnableAffiliateCommission}
                  />
                </div>
                {enableAffiliateCommission && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input
                      id="affiliateCommission"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={affiliateCommission}
                      onChange={(e) => setAffiliateCommission(e.target.value)}
                      placeholder="0"
                      className="w-24 h-10 text-center input-modern"
                    />
                    <span className="text-muted-foreground font-medium">%</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableShopeeCampaigns" className="text-sm font-medium">Campanhas da Shopee</Label>
                    <p className="text-xs text-muted-foreground">Desconto em campanhas</p>
                  </div>
                  <Switch
                    id="enableShopeeCampaigns"
                    checked={enableShopeeCampaigns}
                    onCheckedChange={setEnableShopeeCampaigns}
                  />
                </div>
                {enableShopeeCampaigns && (
                  <div className="flex items-center gap-2 pl-4">
                    <Input
                      id="shopeeCampaigns"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={shopeeCampaigns}
                      onChange={(e) => setShopeeCampaigns(e.target.value)}
                      placeholder="0"
                      className="w-24 h-10 text-center input-modern"
                    />
                    <span className="text-muted-foreground font-medium">%</span>
                  </div>
                )}
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
