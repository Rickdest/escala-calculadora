import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Zap, RefreshCw, FileX, Loader2, CheckCircle2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useShopeeToken } from '@/hooks/useShopeeToken';
import { toast } from 'sonner';

const benefits = [
  { icon: Zap, text: 'Sincronização automática de dados' },
  { icon: RefreshCw, text: 'Métricas atualizadas em tempo real' },
  { icon: FileX, text: 'Sem necessidade de exportar CSV manualmente' },
];

export function ShopeeIntegrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin } = useAdmin();
  const { isConnected, startOAuth, syncAds, isLoading: tokenLoading } = useShopeeToken();
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      await startOAuth();
    } catch (e) {
      toast.error('Erro ao iniciar conexão com Shopee');
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const result = await syncAds();
      toast.success('Sincronização concluída!');
      console.log('Shopee sync result:', result);
    } catch (e) {
      toast.error('Erro ao sincronizar dados');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EE4D2D]/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#EE4D2D]" />
            </div>
            <div>
              <DialogTitle className="text-base">Integração com Shopee</DialogTitle>
              {isAdmin && isConnected ? (
                <Badge className="mt-1 bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px]">
                  Conectada
                </Badge>
              ) : (
                <Badge className="mt-1 bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
                  {isAdmin ? 'Modo Teste' : 'Em análise'}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {isAdmin ? (
          <>
            {isConnected ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Loja conectada com sucesso!</span>
                </div>
                <Button onClick={handleSync} disabled={syncing} className="w-full">
                  {syncing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sincronizando...</>
                  ) : (
                    <><RefreshCw className="w-4 h-4 mr-2" /> Sincronizar Dados de Ads</>
                  )}
                </Button>
                <Button variant="outline" onClick={onClose} className="w-full">
                  Fechar
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Conecte sua loja Shopee para sincronizar dados de anúncios automaticamente.
                </p>
                <div className="space-y-2.5">
                  {benefits.map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                      <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{text}</span>
                    </div>
                  ))}
                </div>
                <Button onClick={handleConnect} disabled={connecting || tokenLoading} className="w-full bg-[#EE4D2D] hover:bg-[#EE4D2D]/90">
                  {connecting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Conectando...</>
                  ) : (
                    <><ShoppingBag className="w-4 h-4 mr-2" /> Conectar Loja Shopee</>
                  )}
                </Button>
                <Button variant="outline" onClick={onClose} className="w-full">
                  Continuar com CSV
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              A integração direta com a API da Shopee está em processo de aprovação. Quando aprovada, você poderá conectar sua loja com um clique.
            </p>
            <div className="space-y-2.5">
              {benefits.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-foreground">
                  <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Enquanto isso, continue usando a importação de CSV normalmente. Você será notificado assim que a integração estiver disponível.
            </p>
            <Button onClick={onClose} className="w-full mt-1">
              Continuar com CSV
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
