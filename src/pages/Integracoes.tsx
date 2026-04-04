import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useShopeeToken, useShopeeTokenStatus } from '@/hooks/useShopeeToken';
import { useStore } from '@/contexts/StoreContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format, addSeconds } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Integracoes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const sellerHook = useShopeeToken('seller');
  const adsHook = useShopeeToken('ads');

  const sellerConnected = sellerHook.isConnected;
  const adsConnected = adsHook.isConnected;
  const sellerToken = sellerHook.token;
  const adsToken = adsHook.token;

  const [autoSync, setAutoSync] = useState(true);
  const [notifySync, setNotifySync] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Compute token expiry display
  const getTokenExpiry = (token: any) => {
    if (!token) return null;
    const created = new Date(token.token_created_at);
    const expiresAt = addSeconds(created, token.expire_in);
    return format(expiresAt, "dd/MM/yyyy", { locale: ptBR });
  };

  const getLastSync = () => {
    if (!sellerToken) return null;
    return formatDistanceToNow(new Date(sellerToken.updated_at), { addSuffix: true, locale: ptBR });
  };

  // Count synced products
  const productCount = currentStore?.products?.filter(p => p.source === 'shopee').length || 0;

  const handleDisconnect = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('shopee_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('app_type', 'seller');
      if (error) throw error;
      toast.success('Loja desconectada');
      sellerHook.refetch();
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Integrações" subtitle="Gerencie as conexões com marketplaces e plataformas" />

      <div className="max-w-2xl mx-auto pt-6 pb-8 space-y-5">

        {/* Onboarding banner — only when not connected */}
        {!sellerConnected && (
          <div className="flex items-center gap-3 rounded-xl p-4 border"
            style={{
              background: 'hsla(24, 100%, 45%, 0.08)',
              borderColor: 'hsla(24, 100%, 45%, 0.2)',
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'hsla(24, 100%, 45%, 0.15)' }}
            >
              🔗
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'hsl(var(--primary))' }}>
                Conecte sua loja para desbloquear todas as funcionalidades
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Importe produtos automaticamente, veja pedidos reais e sincronize estoque
              </p>
            </div>
            <Button
              size="sm"
              className="flex-shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => sellerHook.startOAuth('seller')}
            >
              Conectar agora
            </Button>
          </div>
        )}

        {/* ═══ SHOPEE SELLER ═══ */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
            Shopee
          </p>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ee4d2d] flex items-center justify-center text-xl">
                  🛍
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {sellerConnected ? (currentStore?.name || 'Minha Loja') : 'Shopee'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {sellerConnected
                      ? 'Seller In House System · Partner ID 2032348'
                      : 'Importe produtos, pedidos e estoque automaticamente'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status chip */}
                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                  sellerConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-muted/20 text-muted-foreground border-border'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sellerConnected ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                  {sellerConnected ? 'Conectada' : 'Não conectada'}
                </div>

                {sellerConnected ? (
                  <Button variant="outline" size="sm" onClick={() => sellerHook.startOAuth('seller')}>
                    ↻ Reconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                    onClick={() => sellerHook.startOAuth('seller')}
                  >
                    🔗 Conectar
                  </Button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-4">
              {sellerConnected && sellerToken ? (
                <>
                  {/* Token bar */}
                  <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-4 text-xs border"
                    style={{
                      background: 'hsla(142, 71%, 45%, 0.08)',
                      borderColor: 'hsla(142, 71%, 45%, 0.15)',
                    }}
                  >
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      🔑 Token ativo · expira em {getTokenExpiry(sellerToken)}
                    </span>
                    <span className="text-muted-foreground">
                      Última sincronização: {getLastSync()}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Produtos sincronizados
                      </p>
                      <p className="text-sm font-semibold text-emerald-400">
                        {productCount} produtos
                      </p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        Próxima sincronização
                      </p>
                      <p className="text-sm font-semibold text-primary">
                        automática
                      </p>
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-0 divide-y divide-border">
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm">Sincronização automática</p>
                        <p className="text-xs text-muted-foreground">
                          Atualiza produtos e pedidos a cada 6 horas
                        </p>
                      </div>
                      <Switch checked={autoSync} onCheckedChange={setAutoSync} />
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm">Notificar quando sincronizar</p>
                        <p className="text-xs text-muted-foreground">
                          Receba um aviso ao final de cada sync
                        </p>
                      </div>
                      <Switch checked={notifySync} onCheckedChange={setNotifySync} />
                    </div>
                  </div>

                  {/* Readonly note */}
                  <div className="text-xs text-muted-foreground/60 bg-muted/20 rounded-lg p-3 mt-4 border-l-2 border-muted leading-relaxed">
                    🔒 <strong className="text-muted-foreground">Somente leitura.</strong>{' '}
                    O Skalify nunca altera dados na Shopee. Preço, estoque e nome são importados apenas para leitura. O custo do produto é o único campo editável aqui.
                  </div>

                  {/* Disconnect */}
                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                    <div>
                      <p className="text-sm">Desconectar loja</p>
                      <p className="text-xs text-muted-foreground">
                        Remove o token e para a sincronização
                      </p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          Desconectar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desconectar Shopee?</AlertDialogTitle>
                          <AlertDialogDescription>
                            O token será removido e a sincronização será interrompida. Você poderá reconectar a qualquer momento.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDisconnect}
                            className="bg-red-500 hover:bg-red-600 text-white"
                            disabled={disconnecting}
                          >
                            {disconnecting ? 'Desconectando...' : 'Desconectar'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              ) : (
                <>
                  {/* Disconnected state */}
                  <div className="grid grid-cols-3 gap-2.5 mb-4 opacity-40">
                    {['Produtos', 'Pedidos', 'Último sync'].map(label => (
                      <div key={label} className="bg-muted/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-sm font-semibold">—</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Ao conectar você autoriza o Skalify a ler (nunca escrever) seus dados da Shopee via OAuth 2.0. O processo leva menos de 1 minuto.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ═══ SHOPEE ADS ═══ */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
            Shopee Ads
          </p>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ee4d2d]/20 flex items-center justify-center text-xl">
                  📊
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Shopee Ads API</p>
                  <p className="text-[11px] text-muted-foreground">
                    Ads Service · Partner ID 2032223
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                  adsConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-muted/20 text-muted-foreground border-border'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${adsConnected ? 'bg-emerald-400' : 'bg-muted-foreground'}`} />
                  {adsConnected ? 'Conectada' : 'Não conectada'}
                </div>
                {adsConnected ? (
                  <Button variant="outline" size="sm" onClick={() => adsHook.startOAuth('ads')}>
                    ↻ Reconectar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                    onClick={() => adsHook.startOAuth('ads')}
                  >
                    🔗 Conectar
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4">
              {adsConnected && adsToken && (
                <div className="flex items-center justify-between rounded-lg px-3 py-2 mb-3 text-xs border"
                  style={{
                    background: 'hsla(142, 71%, 45%, 0.08)',
                    borderColor: 'hsla(142, 71%, 45%, 0.15)',
                  }}
                >
                  <span className="text-emerald-400">🔑 Token ativo · expira em {getTokenExpiry(adsToken)}</span>
                  <span className="text-muted-foreground">Dados via CSV por enquanto</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                A sincronização automática de dados de Ads (ROAS, GMV, Gasto) está em implementação.{' '}
                Continue usando o <strong className="text-foreground">CSV de Ads</strong> na aba Ads.{' '}
                Quando disponível, aparecerá aqui automaticamente.
              </p>
            </div>
          </div>
        </div>

        {/* ═══ COMING SOON ═══ */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5 mt-2">
            Outros marketplaces
          </p>
          <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
            <div className="text-2xl mb-2 opacity-40">🏪</div>
            <p className="text-sm mb-1">Mercado Livre · Amazon · TikTok Shop</p>
            <p className="text-xs text-muted-foreground/60">
              Em breve — acompanhe as novidades
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
