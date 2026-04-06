import { useState, useEffect, useMemo } from 'react';
import { Percent, DollarSign, Save, Check, Loader2, Moon, Sun, LogOut, Store, User, Info, Users, Megaphone, UserCheck, MessageCircle, ChevronRight, ShoppingBag, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSignOut } from '@/hooks/useSignOut';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { FEATURES } from '@/config/features';
import { SHOPEE_FEE_RANGES, ShopeeAceleraOption } from '@/types/store';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { storeSettingsSchema, validateForm } from '@/lib/validations';
import { cn } from '@/lib/utils';

export default function Settings() {
  const navigate = useNavigate();
  const { currentStore, updateStoreConfig } = useStore();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { handleSignOut } = useSignOut();
  const { token, isConnected: shopeeConnected, startOAuth, isLoading: shopeeLoading } = useShopeeToken();

  // Section 1: Minha Loja
  const [desiredMargin, setDesiredMargin] = useState(currentStore?.config.desiredMargin?.toString() || '17');
  const [isCpfSeller, setIsCpfSeller] = useState(currentStore?.config.isCpfSeller ?? false);
  const [hasOver450Orders, setHasOver450Orders] = useState(currentStore?.config.hasOver450Orders ?? false);

  // Section 2: Custos Opcionais Globais
  const [enableTaxes, setEnableTaxes] = useState(true);
  const [taxes, setTaxes] = useState(currentStore?.config.taxes?.toString() || '0');
  const [enableAffiliateCommission, setEnableAffiliateCommission] = useState(currentStore?.config.enableAffiliateCommission ?? false);
  const [affiliateCommission, setAffiliateCommission] = useState((currentStore?.config.affiliateCommission || 0).toString());
  const [enableShopeeCampaigns, setEnableShopeeCampaigns] = useState(currentStore?.config.enableShopeeCampaigns ?? false);
  const [shopeeCampaigns, setShopeeCampaigns] = useState((currentStore?.config.shopeeCampaigns || 0).toString());
  const [enableAcelera, setEnableAcelera] = useState((currentStore?.config.shopeeAcelera || 'none') !== 'none');
  const [shopeeAcelera, setShopeeAcelera] = useState<ShopeeAceleraOption>(
    currentStore?.config.shopeeAcelera === 'none' ? 'indicado' : (currentStore?.config.shopeeAcelera || 'indicado')
  );

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const productCount = currentStore?.products?.length || 0;

  useEffect(() => {
    if (currentStore) {
      setDesiredMargin(currentStore.config.desiredMargin.toString());
      setIsCpfSeller(currentStore.config.isCpfSeller ?? false);
      setHasOver450Orders(currentStore.config.hasOver450Orders ?? false);
      setTaxes(currentStore.config.taxes.toString());
      setEnableTaxes(true);
      setAffiliateCommission((currentStore.config.affiliateCommission || 0).toString());
      setEnableAffiliateCommission(currentStore.config.enableAffiliateCommission ?? false);
      setShopeeCampaigns((currentStore.config.shopeeCampaigns || 0).toString());
      setEnableShopeeCampaigns(currentStore.config.enableShopeeCampaigns ?? false);
      const aceleraVal = currentStore.config.shopeeAcelera || 'none';
      setEnableAcelera(aceleraVal !== 'none');
      setShopeeAcelera(aceleraVal === 'none' ? 'indicado' : aceleraVal);
    }
  }, [currentStore]);

  const handleSave = async () => {
    if (!currentStore) return;

    const taxValue = enableTaxes ? (parseFloat(taxes) || 0) : 0;
    const validation = validateForm(storeSettingsSchema, {
      desiredMargin: parseFloat(desiredMargin) || 0,
      taxes: taxValue,
      affiliateCommission: enableAffiliateCommission ? (parseFloat(affiliateCommission) || 0) : 0,
      shopeeCampaigns: enableShopeeCampaigns ? (parseFloat(shopeeCampaigns) || 0) : 0,
    });

    if (!validation.success) {
      const firstError = Object.values((validation as { success: false; errors: Record<string, string> }).errors)[0];
      toast.error(firstError || 'Dados inválidos');
      return;
    }

    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const aceleraValue = enableAcelera ? shopeeAcelera : 'none';

    await updateStoreConfig(currentStore.id, {
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
      shopeeAcelera: aceleraValue,
    });

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);

    toast.success('✓ Configurações salvas', {
      description: `${productCount} produto${productCount !== 1 ? 's foram recalculados' : ' foi recalculado'}.`,
    });
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

      <div className="pt-6 pb-8 md:py-8 space-y-6">
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

        {/* Link to Integrations */}
        <Button
          onClick={() => navigate('/configuracoes/integracoes')}
          variant="outline"
          className="w-full h-14 justify-start gap-4 animate-fade-up"
        >
          <div className="p-2 rounded-xl bg-primary/10">
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold">Integrações</p>
            <p className="text-xs text-muted-foreground">Shopee, Ads e outros marketplaces</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Suporte WhatsApp - visível no topo */}
        <a
          href="https://api.whatsapp.com/send?phone=5511930291287&text=Ol%C3%A1%2C%20preciso%20de%20suporte%20no%20Skalify"
          target="_blank"
          rel="noopener noreferrer"
          className="glass-card p-3.5 flex items-center gap-3 hover:bg-secondary/50 transition-colors animate-fade-up"
        >
          <div className="p-2 rounded-xl bg-primary/10">
            <MessageCircle className="w-[18px] h-[18px] text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Falar com suporte</p>
            <p className="text-xs text-muted-foreground">Atendimento via WhatsApp</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </a>

        {/* Theme Toggle */}
        <div className="glass-card p-5 animate-fade-up stagger-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'light' ? (
                <Sun className="w-5 h-5 text-warning" />
              ) : (
                <Moon className="w-5 h-5 text-primary" />
              )}
              <div>
                <h3 className="font-semibold text-foreground text-sm">Tema do App</h3>
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

        {/* ═══════ SEÇÃO 1 — MINHA LOJA ═══════ */}
        <div className="space-y-1 pt-2">
          <h3 className="section-label">Minha Loja</h3>
        </div>

        {/* Margem Desejada */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-success" />
            <Label htmlFor="desiredMargin" className="text-body font-semibold">Margem Desejada</Label>
          </div>
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
          <p className="text-small text-muted-foreground">Produtos abaixo dessa margem serão destacados em vermelho</p>
        </div>

        {/* Tipo de Vendedor */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary" />
            <Label className="text-body font-semibold">Tipo de Vendedor</Label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setIsCpfSeller(true); setHasOver450Orders(false); }}
              className={cn(
                'flex-1 py-2.5 rounded-button text-body font-semibold transition-all border',
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
                'flex-1 py-2.5 rounded-button text-body font-semibold transition-all border',
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
                <p className="text-small font-semibold">Aplicar adicional de R$3,00</p>
                <p className="text-micro normal-case tracking-normal text-muted-foreground">Marque se você teve mais de 450 pedidos nos últimos 90 dias.</p>
              </div>
              <Switch checked={hasOver450Orders} onCheckedChange={setHasOver450Orders} />
            </div>
          )}
        </div>

        {/* ═══════ SEÇÃO 2 — CUSTOS OPCIONAIS GLOBAIS ═══════ */}
        <div className="space-y-1 pt-4">
          <h3 className="section-label">Custos Opcionais Globais</h3>
          <p className="text-micro normal-case tracking-normal text-muted-foreground">Aplicados automaticamente em todos os produtos</p>
        </div>

        {/* Impostos */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <Label className="text-body font-semibold">Impostos</Label>
            </div>
            <Switch checked={enableTaxes} onCheckedChange={setEnableTaxes} />
          </div>
          {enableTaxes && (
            <div className="space-y-2">
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
              <p className="text-small text-muted-foreground">MEI, Simples Nacional, etc.</p>
            </div>
          )}
        </div>

        {/* Comissão de Afiliados */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <Label className="text-body font-semibold">Comissão de Afiliados</Label>
            </div>
            <Switch checked={enableAffiliateCommission} onCheckedChange={setEnableAffiliateCommission} />
          </div>
          {enableAffiliateCommission && (
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
          )}
        </div>

        {/* Campanhas de Destaque */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-primary" />
              <Label className="text-body font-semibold">Campanhas de Destaque</Label>
            </div>
            <Switch checked={enableShopeeCampaigns} onCheckedChange={setEnableShopeeCampaigns} />
          </div>
          {enableShopeeCampaigns && (
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
          )}
        </div>

        {/* Shopee Acelera */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <Label className="text-body font-semibold">Shopee Acelera</Label>
            </div>
            <Switch checked={enableAcelera} onCheckedChange={setEnableAcelera} />
          </div>
          {enableAcelera && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShopeeAcelera('indicado')}
                className={cn(
                  'flex-1 py-2.5 rounded-button text-small font-semibold transition-all border',
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
                  'flex-1 py-2.5 rounded-button text-small font-semibold transition-all border',
                  shopeeAcelera === 'nao_indicado'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/50 text-muted-foreground border-transparent hover:bg-secondary'
                )}
              >
                Não Indicado (3,5%)
              </button>
            </div>
          )}
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


        {/* ═══════ SEÇÃO 3 — TABELA DE TAXAS DA SHOPEE ═══════ */}
        <div className="space-y-1 pt-4">
          <h3 className="section-label">Taxas da Shopee</h3>
          <p className="text-micro normal-case tracking-normal text-muted-foreground">Somente referência — aplicadas automaticamente</p>
        </div>

        <div className="glass-card p-4 space-y-4">
          <div className="rounded-xl border border-border/50 overflow-hidden">
            <div className="grid grid-cols-3 gap-0 text-micro uppercase tracking-wide font-semibold text-muted-foreground bg-secondary/50 px-3 py-2">
              <span>Faixa de Preço</span>
              <span className="text-center">Comissão</span>
              <span className="text-right">Taxa Fixa</span>
            </div>
            {SHOPEE_FEE_RANGES.map((range, i) => (
              <div key={i} className="grid grid-cols-3 gap-0 px-3 py-2.5 border-t border-border/30 text-body">
                <span className="font-medium text-foreground">{range.label}</span>
                <span className="text-center text-muted-foreground">{range.percent}%</span>
                <span className="text-right text-muted-foreground">R${range.fixed.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-small text-muted-foreground">
              Tabela vigente desde março de 2026. A comissão já contempla a taxa de transação.
            </p>
          </div>
        </div>

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
                  <p className="text-body font-semibold text-foreground">Conta</p>
                  <p className="text-small text-muted-foreground">{user.email}</p>
                </div>
                <Button variant="destructive" size="sm" onClick={handleSignOut}>
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
