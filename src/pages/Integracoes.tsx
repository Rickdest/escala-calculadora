import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, addSeconds } from 'date-fns';
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
import { FEATURES } from '@/config/features';

const getTokenDaysRemaining = (token: any): number => {
  if (!token) return 0;
  const created = new Date(token.token_created_at);
  const expiresAt = addSeconds(created, token.expire_in);
  const diffMs = expiresAt.getTime() - Date.now();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const getTokenProgressPercent = (token: any): number => {
  const days = getTokenDaysRemaining(token);
  return Math.min(100, Math.round((days / 365) * 100));
};

const getShopLabel = (token: any): string => {
  if (!token) return 'Minha Loja';
  return `Loja #${token.shop_id}`;
};

const SHOPEE_CONNECT_ERROR_MESSAGES: Record<string, string> = {
  missing_params: 'Parâmetros faltando na resposta da Shopee. Tente novamente.',
  invalid_state: 'Sessão expirada. Tente conectar novamente.',
  token_exchange_http_error: 'Erro de comunicação com a Shopee. Tente novamente em alguns minutos.',
  token_parse_error: 'Resposta inesperada da Shopee. Tente novamente.',
  token_failed: 'A Shopee rejeitou a autorização. Tente novamente.',
  token_upsert_failed: 'Erro ao salvar o token. Entre em contato com o suporte.',
  error_param: 'Erro de configuração na Shopee. Entre em contato com o suporte.',
  redirect_domain: 'Erro de configuração de domínio. Entre em contato com o suporte.',
  error_sign: 'A chave da Shopee Seller está inválida ou não corresponde ao app configurado.',
  wrong_sign: 'A chave da Shopee Seller está inválida ou não corresponde ao app configurado.',
  auth_url_unavailable: 'A Shopee não aceitou iniciar a autorização agora. Tente novamente em instantes.',
  auth_preflight_failed: 'Não foi possível validar a autorização da Shopee agora. Tente novamente em instantes.',
};


export default function Integracoes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const sellerHook = useShopeeToken('seller');
  const adsHook = useShopeeToken('ads');

  const sellerConnected = sellerHook.isConnected;
  const adsConnected = adsHook.isConnected;
  const sellerToken = sellerHook.token;
  const adsToken = adsHook.token;
  const sellerExpired = sellerHook.needsReauth;
  const adsExpired = adsHook.needsReauth;

  const [autoSync, setAutoSync] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check if there's historical ads data without active ads token
  const { data: historicalAdsCount } = useQuery({
    queryKey: ['historical-ads-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('shopee_ads_by_product')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user && !adsConnected,
  });
  const hasHistoricalAds = !adsConnected && (historicalAdsCount ?? 0) > 0;

  // Check if seller and ads are connected to different shops
  const shopMismatch = sellerConnected && adsConnected && sellerToken && adsToken
    && Number(sellerToken.shop_id) !== Number(adsToken.shop_id);

  const [connecting, setConnecting] = useState(false);

  // Detect if user just connected seller and needs ads next
  const justConnectedSeller = searchParams.get('shopee_connected') === 'true'
    && searchParams.get('app_type') === 'seller'
    && sellerConnected && !adsConnected;

  // Show success/error toast on callback
  useEffect(() => {
    if (searchParams.get('shopee_connected') === 'true') {
      const appType = searchParams.get('app_type') || 'seller';
      if (appType === 'ads') {
        toast.success('Shopee Ads conectada! Clique em "Abrir Análise de Ads" para importar os dados.');
      } else {
        toast.success('Shopee conectada!');
      }
      sellerHook.refetch();
      adsHook.refetch();
    }
    const errCode = searchParams.get('shopee_error');
    if (errCode) {
      toast.error(SHOPEE_CONNECT_ERROR_MESSAGES[errCode] || 'Erro ao conectar com a Shopee. Tente novamente.');
    }
  }, []);

  // Auto toast when token is expired
  useEffect(() => {
    if (sellerExpired && sellerConnected) {
      toast.error('Sua autorização Shopee Seller expirou. Clique em "Reconectar agora" para renovar.', { duration: 8000 });
    }
    if (adsExpired && adsConnected) {
      toast.error('Sua autorização Shopee Ads expirou. Clique em "Reconectar agora" para renovar.', { duration: 8000 });
    }
  }, [sellerExpired, adsExpired, sellerConnected, adsConnected]);

  const getLastSync = () => {
    if (!sellerToken) return null;
    return formatDistanceToNow(new Date(sellerToken.updated_at), { addSuffix: true, locale: ptBR });
  };

  const handleConnectSeller = async () => {
    setConnecting(true);
    try {
      await sellerHook.startOAuth('seller');
    } catch {
      setConnecting(false);
    }
  };

  const handleConnectAds = async () => {
    setConnecting(true);
    try {
      await adsHook.startOAuth('ads');
    } catch {
      setConnecting(false);
    }
  };

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

      // Clean up seller-related data
      await supabase.from('product_performance').delete().eq('user_id', user.id);
      // shopee_performance has RLS deny on DELETE, ignore errors
      await supabase.from('shopee_performance').delete().eq('user_id', user.id).then(() => {});

      toast.success('Loja desconectada e dados removidos');
      sellerHook.refetch();
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDisconnectAds = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      const { error } = await supabase
        .from('shopee_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('app_type', 'ads');
      if (error) throw error;

      // Clean up ads-related data
      await supabase.from('shopee_ads_by_product').delete().eq('user_id', user.id);
      await supabase.from('ads_data').delete().eq('user_id', user.id);
      await supabase.from('product_ads_metrics').delete().eq('user_id', user.id);
      // shopee_ads_import_jobs has RLS deny on DELETE, ignore errors
      await supabase.from('shopee_ads_import_jobs').delete().eq('user_id', user.id).then(() => {});

      // Clear ads columns from product_performance but keep organic data
      await supabase.from('product_performance')
        .update({
          ads_roas: null,
          ads_gasto: null,
          ads_gmv: null,
          ads_pedidos: null,
          ads_impressoes: null,
          ads_cliques: null,
        })
        .eq('user_id', user.id);

      toast.success('Shopee Ads desconectada e dados removidos');
      adsHook.refetch();
    } catch {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const neitherConnected = !sellerConnected && !adsConnected;

  return (
    <AppLayout>
      <PageHeader title="Integrações" subtitle="Gerencie as conexões com marketplaces e plataformas" />

      <div className="max-w-2xl mx-auto pt-6 pb-8 space-y-5">

        {/* ═══ SHOP MISMATCH WARNING ═══ */}
        {shopMismatch && (
          <div className="flex items-center gap-3 rounded-xl p-4 border"
            style={{
              background: 'hsla(0, 80%, 50%, 0.08)',
              borderColor: 'hsla(0, 80%, 50%, 0.2)',
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'hsla(0, 80%, 50%, 0.15)' }}
            >
              ⚠️
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-400">
                Contas diferentes conectadas
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Seller está na loja #{sellerToken?.shop_id} e Ads na loja #{adsToken?.shop_id}.
                Para dados consistentes, conecte ambas na mesma conta Shopee.
              </p>
            </div>
          </div>
        )}

        {/* ═══ ONBOARDING BANNER — only when nothing connected ═══ */}
        {neitherConnected && (
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
          </div>
        )}

        {/* ═══ CONNECT CARDS — when neither connected ═══ */}
        {neitherConnected && (
          <div className="space-y-3">
            {/* Seller Card */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#ee4d2d] flex items-center justify-center text-xl">
                  🛍
                </div>
                <div>
                  <p className="text-sm font-semibold">Shopee Seller</p>
                  <p className="text-[11px] text-muted-foreground">Produtos · Pedidos · Estoque</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Importe seus produtos, acompanhe pedidos e sincronize estoque automaticamente.
              </p>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleConnectSeller}
                disabled={connecting}
              >
                {connecting ? 'Redirecionando...' : '🔗 Conectar Shopee Seller'}
              </Button>
            </div>

            {/* Ads Card */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#ee4d2d] flex items-center justify-center text-xl">
                  📊
                </div>
                <div>
                  <p className="text-sm font-semibold">Shopee Ads</p>
                  <p className="text-[11px] text-muted-foreground">ROAS · Campanhas · Gasto</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Analise o ROAS real dos seus anúncios, campanhas e gastos diretamente da API.
              </p>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={handleConnectAds}
                disabled={connecting}
              >
                {connecting ? 'Redirecionando...' : '🔗 Conectar Shopee Ads'}
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              🔒 Somente leitura · O Skalify nunca altera dados na Shopee
            </p>
          </div>
        )}

        {/* ═══ SHOPEE SELLER CARD — when connected or when ads is connected but seller isn't ═══ */}
        {(sellerConnected || adsConnected) && (
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
                      {sellerConnected ? getShopLabel(sellerToken) : 'Shopee Seller'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Produtos · Pedidos · Estoque
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                    sellerExpired
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : sellerConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-muted/20 text-muted-foreground border-border'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      sellerExpired ? 'bg-red-400' : sellerConnected ? 'bg-emerald-400' : 'bg-muted-foreground'
                    }`} />
                    {sellerExpired ? 'Expirado' : sellerConnected ? 'Conectada' : 'Não conectada'}
                  </div>
                  {sellerConnected ? (
                    sellerExpired ? (
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1" onClick={() => sellerHook.startOAuth('seller')}>
                        ⚠️ Reconectar agora
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => sellerHook.startOAuth('seller')}>
                        ↻ Reconectar
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                      onClick={handleConnectSeller}
                      disabled={connecting}
                    >
                      🔗 Conectar
                    </Button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {sellerConnected ? (
                  <>
                    {/* Token bar with progress */}
                    <div className="rounded-lg px-3 py-2.5 mb-4 text-xs border"
                      style={{
                        background: sellerExpired ? 'hsla(0, 80%, 50%, 0.07)' : 'hsla(142, 71%, 45%, 0.07)',
                        borderColor: sellerExpired ? 'hsla(0, 80%, 50%, 0.15)' : 'hsla(142, 71%, 45%, 0.15)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`${sellerExpired ? 'text-red-400' : 'text-emerald-400'} flex items-center gap-1.5`}>
                          {sellerExpired ? '⚠️ Autorização expirada' : '🔑 Autorização ativa'}
                        </span>
                        <span className="text-muted-foreground">
                          Última sync: {getLastSync()}
                        </span>
                      </div>
                      {sellerExpired ? (
                        <p className="text-red-400 text-[10px]">
                          Clique em "Reconectar agora" para renovar a autorização da Shopee.
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                            <span>Validade da autorização</span>
                            <span className="text-emerald-400 font-medium">
                              {getTokenDaysRemaining(sellerToken)} dias restantes
                            </span>
                          </div>
                          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className="h-1 rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${getTokenProgressPercent(sellerToken)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Toggle */}
                    <div className="space-y-0 divide-y divide-border">
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm">Sincronização automática</p>
                          <p className="text-xs text-muted-foreground">
                            Atualiza produtos e pedidos a cada 6 horas
                          </p>
                        </div>
                        <Switch checked={autoSync} onCheckedChange={setAutoSync} disabled={sellerExpired} />
                      </div>
                    </div>

                    {/* Readonly note */}
                    <div className="text-xs text-muted-foreground/60 bg-muted/20 rounded-lg p-3 mt-4 border-l-2 border-muted leading-relaxed">
                      🔒 <strong className="text-muted-foreground">Somente leitura.</strong>{' '}
                      O Skalify nunca altera dados na Shopee. Preço, estoque e nome são importados apenas para leitura.
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
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Conecte a API Seller para importar produtos, pedidos e estoque da Shopee automaticamente.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ BANNER: Seller connected, Ads pending ═══ */}
        {justConnectedSeller && (
          <div className="flex items-center gap-3 rounded-xl p-4 border"
            style={{
              background: 'hsla(142, 71%, 45%, 0.08)',
              borderColor: 'hsla(142, 71%, 45%, 0.2)',
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
              style={{ background: 'hsla(142, 71%, 45%, 0.15)' }}
            >
              ✅
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-400">
                Seller conectado com sucesso!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agora conecte os dados de Ads abaixo para ver ROAS, campanhas e gastos.
              </p>
            </div>
          </div>
        )}

        {/* ═══ SHOPEE ADS CARD ═══ */}
        {(sellerConnected || adsConnected) && (
          <div>
            {!sellerConnected && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                Shopee
              </p>
            )}

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                    📊
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Shopee Ads</p>
                    <p className="text-[11px] text-muted-foreground">
                      ROAS · Campanhas · Gasto
                      {adsConnected && adsToken && (
                        <span className="ml-1">· Loja #{adsToken.shop_id}</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${
                    adsExpired
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : adsConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-muted/20 text-muted-foreground border-border'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      adsExpired ? 'bg-red-400' : adsConnected ? 'bg-emerald-400' : 'bg-muted-foreground'
                    }`} />
                    {adsExpired ? 'Expirado' : adsConnected ? 'Conectada' : 'Não conectada'}
                  </div>
                  {adsConnected ? (
                    adsExpired ? (
                      <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1" onClick={handleConnectAds}>
                        ⚠️ Reconectar agora
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleConnectAds}>
                        ↻ Reconectar
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
                      onClick={handleConnectAds}
                    >
                      🔗 Conectar
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-4">
                {adsConnected && adsToken ? (
                  <>
                    {/* Token bar with progress */}
                    <div className="rounded-lg px-3 py-2.5 mb-3 text-xs border"
                      style={{
                        background: adsExpired ? 'hsla(0, 80%, 50%, 0.07)' : 'hsla(142, 71%, 45%, 0.07)',
                        borderColor: adsExpired ? 'hsla(0, 80%, 50%, 0.15)' : 'hsla(142, 71%, 45%, 0.15)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`${adsExpired ? 'text-red-400' : 'text-emerald-400'} flex items-center gap-1.5`}>
                          {adsExpired ? '⚠️ Autorização expirada' : '🔑 Autorização ativa'}
                        </span>
                      </div>
                      {adsExpired ? (
                        <p className="text-red-400 text-[10px]">
                          Clique em "Reconectar agora" para renovar a autorização de Ads.
                        </p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                            <span>Validade da autorização</span>
                            <span className="text-emerald-400 font-medium">
                              {getTokenDaysRemaining(adsToken)} dias restantes
                            </span>
                          </div>
                          <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className="h-1 rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${getTokenProgressPercent(adsToken)}%` }}
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed bg-muted/20 rounded-lg p-3">
                      Dados de campanhas, ROAS e gastos são sincronizados automaticamente via API.
                    </p>

                    <Button
                      className="w-full mt-3 gap-2"
                      onClick={() => navigate('/roas?tab=ads&startAdsImport=1')}
                    >
                      📊 Abrir Análise de Ads
                    </Button>

                    {/* Disconnect Ads */}
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                      <div>
                        <p className="text-sm">Desconectar Ads</p>
                        <p className="text-xs text-muted-foreground">
                          Remove o token de Ads
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
                            <AlertDialogTitle>Desconectar Shopee Ads?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O token de Ads será removido. Você poderá reconectar a qualquer momento.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDisconnectAds}
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
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Conecte a API de Ads para importar dados de campanhas, ROAS e gastos automaticamente.
                    </p>
                    <div className="flex items-center gap-2 rounded-lg p-3 text-xs border"
                      style={{
                        background: 'hsla(210, 100%, 50%, 0.07)',
                        borderColor: 'hsla(210, 100%, 50%, 0.15)',
                      }}
                    >
                      <span>ℹ️</span>
                      <span className="text-muted-foreground">
                        Esta é uma segunda autorização necessária para acessar dados de campanhas e anúncios. Você será redirecionado para a Shopee novamente.
                      </span>
                    </div>
                    {hasHistoricalAds && (
                      <div className="flex items-center gap-2 rounded-lg p-3 text-xs border"
                        style={{
                          background: 'hsla(45, 100%, 50%, 0.07)',
                          borderColor: 'hsla(45, 100%, 50%, 0.2)',
                        }}
                      >
                        <span>📊</span>
                        <span className="text-muted-foreground">
                          Há histórico de Ads salvo, mas a autorização da API Ads não está ativa no momento. Reconecte para atualizar.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
