import { AppLayout } from '@/components/layout/AppLayout';
import { useBilling } from '@/hooks/useBilling';
import { Lock, ArrowRight } from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import { PRICING } from '@/constants/pricing';

const benefits = [
  'Cálculo automático de todas as taxas da Shopee',
  'Lucro real por produto',
  'ROAS de empate, saudável e ideal',
  'Histórico de produtos salvos',
  'Compartilhar resultados',
  'Conteúdo educacional exclusivo',
  'Controle de estoque (bônus)',
];

export default function Paywall() {
  const { handleCheckout, refreshSubscription } = useBilling();

  return (
    <AppLayout>
      <div className="py-8 space-y-6 max-w-sm mx-auto">
        <div className="flex flex-col items-center gap-3">
          <img src={logoIcon} alt="Precify" className="w-10 h-10 rounded-xl opacity-60" />
          <div className="w-12 h-12 rounded-full border border-border/50 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Desbloqueie o Precify</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Acesse todas as ferramentas para maximizar seus lucros na Shopee.
          </p>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide text-center">
            O que você tem acesso
          </p>
          <div className="space-y-2.5">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <ArrowRight className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                <span className="text-sm text-foreground/80 leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-3xl font-bold text-foreground">
            {PRICING.monthlyLabel} <span className="text-base font-normal text-muted-foreground">/mês</span>
          </p>
          <p className="text-sm text-muted-foreground">ou {PRICING.yearlyLabel}/ano (economize {PRICING.yearlySavingPct}%)</p>
        </div>

        <button
          onClick={handleCheckout}
          className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[17px] transition-colors active:scale-[0.98]"
        >
          ⚡ Quero acesso completo
        </button>

        <p className="text-center text-xs text-muted-foreground">
          🔒 Pagamento seguro · Cancele quando quiser
        </p>

        <button
          onClick={refreshSubscription}
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Já assinei → Verificar acesso
        </button>
      </div>
    </AppLayout>
  );
}
