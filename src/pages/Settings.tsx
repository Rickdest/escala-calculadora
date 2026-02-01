import { useState, useEffect } from 'react';
import { Settings2, Percent, DollarSign, Package, Save, Check, Loader2, Moon, Sun, LogOut, Store } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const { currentStore, updateStoreConfig } = useStore();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  
  const [shopeeFeePercent, setShopeeFeePercent] = useState(currentStore?.config.shopeeFeePercent?.toString() || '12');
  const [shopeeFeeFixed, setShopeeFeeFixed] = useState((currentStore?.config.shopeeFeeFixed || 0).toString());
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '6');
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '30');
  const [enablePackaging, setEnablePackaging] = useState(currentStore?.config.enablePackaging ?? true);
  const [enableAds, setEnableAds] = useState(currentStore?.config.enableAds ?? true);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when store changes
  useEffect(() => {
    if (currentStore) {
      setShopeeFeePercent(currentStore.config.shopeeFeePercent.toString());
      setShopeeFeeFixed((currentStore.config.shopeeFeeFixed || 0).toString());
      setTaxes(currentStore.config.taxes.toString());
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setEnablePackaging(currentStore.config.enablePackaging);
      setEnableAds(currentStore.config.enableAds);
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
      enablePackaging,
      enableAds,
    });
    
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        {/* Theme Toggle */}
        <div className="glass-card p-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-secondary">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-warning" />
                ) : (
                  <Moon className="w-5 h-5 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-foreground">Tema do App</h3>
                <p className="text-xs text-muted-foreground">
                  {theme === 'light' ? 'Modo Claro' : 'Modo Escuro'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={theme === 'light' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setTheme('light')}
                className={theme === 'light' ? 'gradient-primary' : ''}
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button 
                variant={theme === 'dark' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setTheme('dark')}
                className={theme === 'dark' ? 'gradient-primary' : ''}
              >
                <Moon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Store Info */}
        <div className="glass-card p-5 animate-fade-up stagger-1">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl gradient-primary">
              <Settings2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg">Taxas da Loja</h2>
              <p className="text-sm text-muted-foreground">
                Configure as taxas para {currentStore.name}
              </p>
            </div>
          </div>
        </div>

        {/* Shopee Fees */}
        <div className="space-y-4 animate-fade-up stagger-2">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Taxas da Shopee
          </h3>

          <div className="glass-card p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shopeeFeePercent" className="text-sm font-semibold">Taxa %</Label>
                <div className="relative">
                  <Input
                    id="shopeeFeePercent"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={shopeeFeePercent}
                    onChange={(e) => setShopeeFeePercent(e.target.value)}
                    placeholder="12"
                    className="pr-10 input-modern h-12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="shopeeFeeFixed" className="text-sm font-semibold">Taxa Fixa</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                  <Input
                    id="shopeeFeeFixed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={shopeeFeeFixed}
                    onChange={(e) => setShopeeFeeFixed(e.target.value)}
                    placeholder="2.00"
                    className="pl-12 input-modern h-12"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Comissão percentual + taxa fixa por venda
            </p>
          </div>
        </div>

        {/* Taxes */}
        <div className="space-y-4 animate-fade-up stagger-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Impostos
          </h3>

          <div className="glass-card p-5">
            <div className="space-y-2">
              <Label htmlFor="taxes" className="text-sm font-semibold">Alíquota</Label>
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
                  className="pr-10 input-modern h-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                MEI, Simples Nacional, etc.
              </p>
            </div>
          </div>
        </div>

        {/* Desired Margin */}
        <div className="space-y-4 animate-fade-up stagger-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-success" />
            Meta de Margem
          </h3>

          <div className="glass-card p-5">
            <div className="space-y-2">
              <Label htmlFor="desiredMargin" className="text-sm font-semibold">Margem Desejada</Label>
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
                  className="pr-10 input-modern h-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Produtos abaixo serão destacados em vermelho
              </p>
            </div>
          </div>
        </div>

        {/* Optional Costs */}
        <div className="space-y-4 animate-fade-up stagger-5">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Custos Opcionais
          </h3>

          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="enablePackaging" className="text-sm font-semibold">Custo de Embalagem</Label>
                <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
              </div>
              <Switch
                id="enablePackaging"
                checked={enablePackaging}
                onCheckedChange={setEnablePackaging}
              />
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAds" className="text-sm font-semibold">Shopee Ads</Label>
                  <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
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
        <div className="bg-accent rounded-2xl p-5 animate-fade-up">
          <h4 className="font-bold text-accent-foreground mb-4">Resumo Atual</h4>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="number-md text-primary">{shopeeFeePercent}%</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Taxa %</p>
            </div>
            <div>
              <p className="number-md text-primary">R${parseFloat(shopeeFeeFixed || '0').toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Taxa Fixa</p>
            </div>
            <div>
              <p className="number-md text-primary">{taxes}%</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Impostos</p>
            </div>
            <div>
              <p className="number-md text-success">{desiredMargin}%</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Meta</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          className={cn(
            'w-full h-14 text-base font-bold transition-all',
            saved ? 'bg-success hover:bg-success' : 'gradient-primary hover:opacity-90'
          )}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Salvando...
            </>
          ) : saved ? (
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

        {/* Manage Stores */}
        <Button 
          onClick={() => navigate('/stores')}
          variant="outline"
          className="w-full h-12"
        >
          <Store className="w-5 h-5 mr-2" />
          Gerenciar Lojas
        </Button>

        {/* Logout Section */}
        <div className="pt-6 border-t border-border/50">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Conta</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button 
                onClick={async () => {
                  await signOut();
                  navigate('/auth');
                }}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
