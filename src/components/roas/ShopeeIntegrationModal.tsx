import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Zap, RefreshCw, FileX } from 'lucide-react';

const benefits = [
  { icon: Zap, text: 'Sincronização automática de dados' },
  { icon: RefreshCw, text: 'Métricas atualizadas em tempo real' },
  { icon: FileX, text: 'Sem necessidade de exportar CSV manualmente' },
];

export function ShopeeIntegrationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
              <Badge className="mt-1 bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">
                Em análise
              </Badge>
            </div>
          </div>
        </DialogHeader>

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
      </DialogContent>
    </Dialog>
  );
}
