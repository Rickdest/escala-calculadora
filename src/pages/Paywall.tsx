import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBilling } from '@/hooks/useBilling';
import { Check, Zap, TrendingUp, ShieldCheck } from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import { PRICING } from '@/constants/pricing';
import { cn } from '@/lib/utils';

const benefits = [
  'Cálculo automático de taxas da Shopee (comissão, impostos, frete)',
  'Lucro líquido real por produto, sem achismo',
  'ROAS de empate: saiba exatamente quando o anúncio está lucrando',
  'Gestão de produtos com histórico salvo na nuvem',
  'Análise de Ads com classificação automática de anúncios',
  'Controle de estoque com alertas de nível crítico',
  'Conteúdo educacional exclusivo para sellers Shopee',
];

export default function Paywall() {
  const { handleCheckout, refreshSubscription } = useBilling();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  const isYearly = plan === 'yearly';
  const monthlyEquiv = (PRICING.yearly / 12).toFixed(2).replace('.', ',');

  return (
    <AppLayout>
      <div className="py-8 space-y-8 max-w-md mx-auto px-1">

        {/* Header */}
        <div className="flex flex-col items-center gap-4">
          <img src={logoIcon} alt="Skalify" className="w-11 h-11 rounded-xl" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
            <TrendingUp className="w-3.5 h-3.5 text-primary" strokeWidth={2} />
            <span className="text-xs font-semibold text-primary tracking-wide">
              Acesso completo desbloqueado
            </span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            Pare de chutar.
            <br />
            Comece a lucrar de verdade.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            Vendedores Shopee que usam o Skalify tomam decisões com dados —
            e crescem até 3x mais rápido que a concorrência.
          </p>
        </div>

        {/* Plan toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          <button
            onClick={() => setPlan('monthly')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200',
              !isYearly
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setPlan('yearly')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 relative',
              isYearly
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Anual
            <span className="absolute -top-2 -right-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
              -{PRICING.yearlySavingPct}%
            </span>
          </button>
        </div>

        {/* Price display */}
        <div className="text-center space-y-1">
          {isYearly ? (
            <>
              <p className="text-foreground font-bold" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                <span className="font-mono">
                  R$ {monthlyEquiv}
                </span>
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Cobrado como {PRICING.yearlyLabel}/ano · Você economiza R$ {(PRICING.monthly * 12 - PRICING.yearly).toFixed(2).replace('.', ',')}
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground font-bold" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                <span className="font-mono">
                  {PRICING.monthlyLabel}
                </span>
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Ou {PRICING.yearlyLabel}/ano e economize {PRICING.yearlySavingPct}%
              </p>
            </>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleCheckout}
          className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[17px] transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          {isYearly ? 'Assinar plano anual' : 'Assinar plano mensal'}
        </button>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Pagamento seguro
          </span>
          <span>·</span>
          <span>Cancele quando quiser</span>
          <span>·</span>
          <span>Acesso imediato</span>
        </div>

        {/* Benefits */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
              O que está incluído
            </p>
          </div>
          <div className="space-y-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                <span className="text-sm text-foreground/80 leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Already subscribed */}
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
