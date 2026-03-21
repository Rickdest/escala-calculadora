import { ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { openCheckout } from '@/services/checkout.service';

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

  const handleCheckout = () => openCheckout(user?.email || undefined);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-8 space-y-5 animate-fade-up max-h-[90vh] overflow-y-auto border border-border">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 transition-colors">
          <X className="w-4 h-4 text-text-2" />
        </button>

        <div className="text-center space-y-2 pt-2">
          <h2 className="text-xl font-bold text-foreground">Desbloqueie o Precify</h2>
          <p className="text-sm text-text-2">Para usar esta funcionalidade, ative sua assinatura.</p>
        </div>

        <div className="rounded-[14px] border border-border bg-surface-2 p-4 space-y-2.5">
          {benefits.map((b) => (
            <div key={b} className="flex items-start gap-2.5">
              <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" strokeWidth={2} />
              <span className="text-sm text-foreground/80 leading-snug">{b}</span>
            </div>
          ))}
        </div>

        <div className="text-center space-y-1">
          <p className="text-2xl font-bold font-mono font-mono-num text-foreground">
            R$ 49,90 <span className="text-sm font-normal font-sans text-text-2">/ano</span>
          </p>
          <p className="text-xs text-text-3">menos de R$ 4,16 por mês</p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full h-12 rounded-[10px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[15px] transition-colors active:scale-[0.98]"
        >
          ⚡ Quero acesso completo
        </button>

        <p className="text-center text-xs text-text-3">
          🔒 Pagamento seguro · Cancele quando quiser
        </p>
      </div>
    </div>
  );
}
