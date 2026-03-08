import { useState, useEffect } from 'react';
import { Settings2, Percent, DollarSign, Package, Save, Check, Loader2, Moon, Sun, LogOut, Store, User, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { SHOPEE_FEE_RANGES } from '@/types/store';
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
  const [saved, setSaved] = useState(false);
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
        {/* User Profile Link */}
        {user && (
          <Button
            onClick={() => navigate('/profile')}
            variant="outline"
            className="w-full h-14 justify-start gap-4 animate-fade-up"
          >
            <div className="p-2 rounded-xl bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">Meu Perfil</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </Button>
        )}

        {/* Theme Toggle */}
        <div className="glass-card p-5 animate-fade-up stagger-1">
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
        <div className="glass-card p-5 animate-fade-up stagger-2">
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

        {/* Shopee Fees - Fixed Table */}
        <div className="space-y-4 animate-fade-up stagger-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-primary" />
            Taxas da Shopee (Automáticas)
          </h3>

          <div className="glass-card p-5 space-y-4">
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

            {/* CPF Seller */}
            <div className="pt-3 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Vendedor CPF</Label>
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
                    <Label className="text-sm font-semibold">+450 pedidos em 90 dias</Label>
                    <p className="text-xs text-muted-foreground">Adicional de R$3,00 por item</p>
                  </div>
                  <Switch checked={hasOver450Orders} onCheckedChange={setHasOver450Orders} />
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
          <div className="glass-card p-5">
            <div className="space-y-2">
              <Label htmlFor="taxes" className="text-sm font-semibold">Alíquota</Label>
              <div className="relative">
                <Input id="taxes" type="number" step="0.1" min="0" max="100" value={taxes} onChange={(e) => setTaxes(e.target.value)} placeholder="0" className="pr-10 input-modern h-12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
              </div>
              <p className="text-xs text-muted-foreground">MEI, Simples Nacional, etc.</p>
            </div>
          </div>
        </div>

        {/* Desired Margin */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Percent className="w-4 h-4 text-success" />
            Meta de Margem
          </h3>
          <div className="glass-card p-5">
            <div className="space-y-2">
              <Label htmlFor="desiredMargin" className="text-sm font-semibold">Margem Desejada</Label>
              <div className="relative">
                <Input id="desiredMargin" type="number" step="0.1" min="0" max="100" value={desiredMargin} onChange={(e) => setDesiredMargin(e.target.value)} placeholder="17" className="pr-10 input-modern h-12" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
              </div>
              <p className="text-xs text-muted-foreground">Produtos abaixo serão destacados em vermelho</p>
            </div>
          </div>
        </div>

        {/* Optional Costs */}
        <div className="space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            Custos Opcionais
          </h3>
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Custo de Embalagem</Label>
                <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
              </div>
              <Switch checked={enablePackaging} onCheckedChange={setEnablePackaging} />
            </div>
            <div className="pt-4 border-t border-border/50 flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Shopee Ads</Label>
                <p className="text-xs text-muted-foreground">Incluir no cálculo</p>
              </div>
              <Switch checked={enableAds} onCheckedChange={setEnableAds} />
            </div>
            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Comissão de Afiliados</Label>
                  <p className="text-xs text-muted-foreground">Percentual sobre a venda</p>
                </div>
                <Switch checked={enableAffiliateCommission} onCheckedChange={setEnableAffiliateCommission} />
              </div>
              {enableAffiliateCommission && (
                <div className="flex items-center gap-2 pl-4">
                  <Input type="number" step="0.1" min="0" max="100" value={affiliateCommission} onChange={(e) => setAffiliateCommission(e.target.value)} placeholder="0" className="w-24 h-10 text-center input-modern" />
                  <span className="text-muted-foreground font-semibold">%</span>
                </div>
              )}
            </div>
            <div className="pt-4 border-t border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Campanhas da Shopee</Label>
                  <p className="text-xs text-muted-foreground">Desconto em campanhas</p>
                </div>
                <Switch checked={enableShopeeCampaigns} onCheckedChange={setEnableShopeeCampaigns} />
              </div>
              {enableShopeeCampaigns && (
                <div className="flex items-center gap-2 pl-4">
                  <Input type="number" step="0.1" min="0" max="100" value={shopeeCampaigns} onChange={(e) => setShopeeCampaigns(e.target.value)} placeholder="0" className="w-24 h-10 text-center input-modern" />
                  <span className="text-muted-foreground font-semibold">%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Current Summary */}
        <div className="bg-accent rounded-2xl p-5">
          <h4 className="font-bold text-accent-foreground mb-4">Resumo Atual</h4>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <p className="number-md text-primary">Automática</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Taxa Shopee</p>
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
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Salvando...</>
          ) : saved ? (
            <><Check className="w-5 h-5 mr-2" />Salvo!</>
          ) : (
            <><Save className="w-5 h-5 mr-2" />Salvar Configurações</>
          )}
        </Button>

        {/* Manage Stores */}
        <Button onClick={() => navigate('/stores')} variant="outline" className="w-full h-12">
          <Store className="w-5 h-5 mr-2" />
          Gerenciar Lojas
        </Button>

        {/* Logout Section */}
        {user && (
          <div className="pt-6 border-t border-border/50">
            <div className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Conta</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => signOut()}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}