import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBilling } from '@/hooks/useBilling';
import { Check, Zap, ShieldCheck } from 'lucide-react';
import logoIcon from '@/assets/logo-icon.png';
import { PRICING } from '@/constants/pricing';
import { cn } from '@/lib/utils';

const benefits = [
  'Cálculo automático de taxas da Shopee',
  'Lucro líquido real por produto, sem achismo',
  'ROAS de empate: saiba quando o anúncio lucra',
  'Gestão de produtos com histórico na nuvem',
  'Análise de Ads com classificação automática',
  'Controle de estoque com alertas críticos',
];

export default function Paywall() {
  const { handleCheckout, refreshSubscription } = useBilling();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  const isYearly = plan === 'yearly';
  const monthlyEquiv = (PRICING.yearly / 12).toFixed(2).replace('.', ',');

  return (
    <AppLayout>
      <div className="py-6 space-y-6 max-w-sm mx-auto">

        {/* Logo */}
        <div className="flex justify-center">
          <img src={logoIcon} alt="Skalify" className="w-12 h-12 rounded-2xl" />
        </div>

        {/* Badge */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3.5 py-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
            <span className="text-xs font-semibold text-primary">Acesso completo desbloqueado</span>
          </span>
        </div>

        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-[26px] font-bold text-foreground leading-tight">
            Pare de chutar.
            <br />
            <span className="text-primary">Comece a lucrar{'\n'}de verdade.</span>
          </h1>
          <p className="text-[13px] text-muted-foreground leading-relaxed px-2">
            Vendedores Shopee que usam o Skalify tomam decisões com dados — e crescem até 3x mais rápido.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/50 p-1 mx-4">
          <button
            onClick={() => setPlan('monthly')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-all',
              !isYearly
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setPlan('yearly')}
            className={cn(
              'flex-1 rounded-lg py-2.5 text-[13px] font-semibold transition-all relative',
              isYearly
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Anual
            <span className="absolute -top-2.5 -right-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
              -{PRICING.yearlySavingPct}%
            </span>
          </button>
        </div>

        {/* Price */}
        <div className="text-center space-y-1">
          {isYearly ? (
            <>
              <p className="text-foreground font-bold font-mono" style={{ fontSize: '34px', lineHeight: '1.1' }}>
                R$ {monthlyEquiv}
                <span className="text-base font-normal font-sans text-muted-foreground"> /mês</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Cobrado como {PRICING.yearlyLabel}/ano
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground font-bold font-mono" style={{ fontSize: '34px', lineHeight: '1.1' }}>
                {PRICING.monthlyLabel}
                <span className="text-base font-normal font-sans text-muted-foreground"> /mês</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Ou {PRICING.yearlyLabel}/ano e economize {PRICING.yearlySavingPct}%
              </p>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="px-2">
          <button
            onClick={handleCheckout}
            className="w-full h-[52px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[16px] transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Zap className="w-[18px] h-[18px]" />
            {isYearly ? 'Assinar plano anual' : 'Assinar plano mensal'}
          </button>
        </div>

        {/* Trust */}
        <p className="text-center text-[11px] text-muted-foreground/60 flex items-center justify-center gap-1.5 flex-wrap">
          <ShieldCheck className="w-3.5 h-3.5 inline" />
          Pagamento seguro · Cancele quando quiser · Acesso imediato
        </p>

        {/* Benefits */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4 mx-1">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              O que está incluído
            </span>
          </div>
          <div className="space-y-3">
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                <span className="text-[13px] text-foreground/80 leading-snug">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Already subscribed */}
        <button
          onClick={refreshSubscription}
          className="w-full text-center text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors pb-2"
        >
          Já assinei → Verificar acesso
        </button>
      </div>
    </AppLayout>
  );
}
