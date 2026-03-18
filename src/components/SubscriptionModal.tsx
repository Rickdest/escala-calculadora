import { ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const CHECKOUT_URL = import.meta.env.VITE_HOTMART_URL || 'https://pay.hotmart.com/B104846948H?off=au88x8b1&checkoutMode=6';

const benefits = [
  'Cálculo automático de todas as taxas da Shopee',
  'Lucro real por produto',
  'ROAS de empate, saudável e ideal',
  'Histórico de produtos salvos',
  'Compartilhar resultados',
  'Conteúdo educacional exclusivo',
  'Controle de estoque (bônus)',
];

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const { user } = useAuth();

  if (!open) return null;

  const handleCheckout = () => {
    const url = new URL(CHECKOUT_URL);
    if (user?.email) url.searchParams.set('email', user.email);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-card w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-8 space-y-5 animate-fade-up max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="text-center space-y-2 pt-2">
          <h2 className="text-xl font-bold text-foreground">Desbloqueie o Precify</h2>
          <p className="text-sm text-muted-foreground">Para usar esta funcionalidade, ative sua assinatura.</p>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/50 p-4 space-y-2.5">
          {benefits.map((b) => (
            <div key={b} className="flex items-start gap-2.5">
              <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" strokeWidth={2} />
              <span className="text-sm text-foreground/80 leading-snug">{b}</span>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1">
          <p className="text-2xl font-bold text-foreground">
            R$ 49,90 <span className="text-sm font-normal text-muted-foreground">/ano</span>
          </p>
          <p className="text-xs text-muted-foreground">menos de R$ 4,16 por mês</p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full h-14 rounded-xl bg-[#F97316] hover:bg-[#ea6c10] text-white font-bold text-[17px] transition-colors active:scale-[0.98]"
        >
          ⚡ Quero acesso completo
        </button>

        <p className="text-center text-xs text-muted-foreground">
          🔒 Pagamento seguro · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
