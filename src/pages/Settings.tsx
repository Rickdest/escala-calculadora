import { useState } from 'react';
import { Settings2, Percent, DollarSign, Package, Save, Check } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { currentStore, updateStoreConfig } = useStore();
  
  const [shopeeFee, setShopeeFee] = useState(currentStore?.config.shopeeFee?.toString() || '12');
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '6');
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '30');
  const [enablePackaging, setEnablePackaging] = useState(currentStore?.config.enablePackaging ?? true);
  const [enableAds, setEnableAds] = useState(currentStore?.config.enableAds ?? true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!currentStore) return;
    
    updateStoreConfig(currentStore.id, {
      shopeeFee: parseFloat(shopeeFee) || 0,
      taxes: parseFloat(taxes) || 0,
      desiredMargin: parseFloat(desiredMargin) || 0,
      enablePackaging,
      enableAds,
    });
    
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Sync state when store changes
  useState(() => {
    if (currentStore) {
      setShopeeFee(currentStore.config.shopeeFee.toString());
      setTaxes(currentStore.config.taxes.toString());
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setEnablePackaging(currentStore.config.enablePackaging);
      setEnableAds(currentStore.config.enableAds);
    }
  });

  if (!currentStore) {
    return (
      <AppLayout>
        <PageHeader title="Configurações" showStoreSelector={false} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
          <p className="text-muted-foreground">Selecione uma loja primeiro</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="Configurações"
        subtitle={currentStore.name}
      />

      <div className="px-4 py-6 space-y-6">
        {/* Store Info */}
        <div className="bg-card rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Settings2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Taxas da Loja</h2>
              <p className="text-sm text-muted-foreground">
                Configure as taxas e metas para {currentStore.name}
              </p>
            </div>
          </div>
        </div>

        {/* Fees Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Taxas e Impostos
          </h3>

          <div className="bg-card rounded-2xl p-4 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="space-y-2">
              <Label htmlFor="shopeeFee" className="text-sm">Taxa da Shopee</Label>
              <div className="relative">
                <Input
                  id="shopeeFee"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={shopeeFee}
                  onChange={(e) => setShopeeFee(e.target.value)}
                  placeholder="12"
                  className="pr-8 input-focus"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Comissão cobrada pela Shopee sobre vendas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxes" className="text-sm">Impostos</Label>
              <div className="relative">
                <Input
                  id="taxes"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={taxes}
                  onChange={(e) => setTaxes(e.target.value)}
                  placeholder="6"
                  className="pr-8 input-focus"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Impostos sobre a venda (MEI, Simples, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Margin Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Percent className="w-4 h-4 text-success" />
            Meta de Margem
          </h3>

          <div className="bg-card rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="space-y-2">
              <Label htmlFor="desiredMargin" className="text-sm">Margem Desejada</Label>
              <div className="relative">
                <Input
                  id="desiredMargin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={desiredMargin}
                  onChange={(e) => setDesiredMargin(e.target.value)}
                  placeholder="30"
                  className="pr-8 input-focus"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Produtos abaixo dessa margem serão destacados em vermelho
              </p>
            </div>
          </div>
        </div>

        {/* Optional Costs Section */}
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Custos Opcionais
          </h3>

          <div className="bg-card rounded-2xl p-4 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enablePackaging" className="text-sm font-medium">Custo de Embalagem</Label>
                <p className="text-xs text-muted-foreground">Incluir embalagem no cálculo</p>
              </div>
              <Switch
                id="enablePackaging"
                checked={enablePackaging}
                onCheckedChange={setEnablePackaging}
              />
            </div>
            
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAds" className="text-sm font-medium">Shopee Ads</Label>
                  <p className="text-xs text-muted-foreground">Incluir custos de anúncios</p>
                </div>
                <Switch
                  id="enableAds"
                  checked={enableAds}
                  onCheckedChange={setEnableAds}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Current Summary */}
        <div className="bg-accent rounded-2xl p-4">
          <h4 className="font-medium text-accent-foreground mb-3">Resumo Atual</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{shopeeFee}%</p>
              <p className="text-xs text-muted-foreground">Shopee</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{taxes}%</p>
              <p className="text-xs text-muted-foreground">Impostos</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{desiredMargin}%</p>
              <p className="text-xs text-muted-foreground">Meta</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          className={cn(
            'w-full h-12 text-base font-semibold transition-all',
            saved && 'bg-success hover:bg-success'
          )}
        >
          {saved ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Salvo!
            </>
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </AppLayout>
  );
}
