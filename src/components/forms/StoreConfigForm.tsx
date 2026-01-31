import { useState, useEffect } from 'react';
import { X, Percent, DollarSign, Settings2 } from 'lucide-react';
import { StoreConfig } from '@/types/store';
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
  
  const [shopeeFee, setShopeeFee] = useState(currentStore?.config.shopeeFee?.toString() || '12');
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '6');
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '30');
  const [enablePackaging, setEnablePackaging] = useState(currentStore?.config.enablePackaging ?? true);
  const [enableAds, setEnableAds] = useState(currentStore?.config.enableAds ?? true);

  useEffect(() => {
    if (currentStore) {
      setShopeeFee(currentStore.config.shopeeFee.toString());
      setTaxes(currentStore.config.taxes.toString());
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setEnablePackaging(currentStore.config.enablePackaging);
      setEnableAds(currentStore.config.enableAds);
    }
  }, [currentStore]);

  const handleSave = () => {
    if (!currentStore) return;
    
    updateStoreConfig(currentStore.id, {
      shopeeFee: parseFloat(shopeeFee) || 0,
      taxes: parseFloat(taxes) || 0,
      desiredMargin: parseFloat(desiredMargin) || 0,
      enablePackaging,
      enableAds,
    });
    
    onClose();
  };

  if (!currentStore) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-xl animate-slide-in-bottom max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Configurações da Loja</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <p className="text-sm text-muted-foreground">
            Configure as taxas e margens para <span className="font-medium text-foreground">{currentStore.name}</span>
          </p>

          {/* Shopee Fee */}
          <div className="space-y-2">
            <Label htmlFor="shopeeFee" className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              Taxa da Shopee
            </Label>
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

          {/* Taxes */}
          <div className="space-y-2">
            <Label htmlFor="taxes" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Impostos
            </Label>
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

          {/* Desired Margin */}
          <div className="space-y-2">
            <Label htmlFor="desiredMargin" className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-success" />
              Margem Desejada
            </Label>
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
              Meta de margem de lucro para seus produtos
            </p>
          </div>

          {/* Optional Costs Toggles */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-medium text-sm">Custos Opcionais</h3>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enablePackaging">Custo de Embalagem</Label>
                <p className="text-xs text-muted-foreground">Incluir embalagem no cálculo</p>
              </div>
              <Switch
                id="enablePackaging"
                checked={enablePackaging}
                onCheckedChange={setEnablePackaging}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enableAds">Shopee Ads</Label>
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

        {/* Footer */}
        <div className="p-4 border-t border-border safe-bottom">
          <Button 
            onClick={handleSave}
            className="w-full h-12 text-base font-semibold"
          >
            Salvar Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}
