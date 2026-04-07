import { useState } from 'react';
import { useBilling } from '@/hooks/useBilling';
import { useSignOut } from '@/hooks/useSignOut';
import { Check, Store } from 'lucide-react';
import logoIcon from '@/assets/skalify-logo.png';
import { PRICING } from '@/constants/pricing';
import { cn } from '@/lib/utils';

const sharedBenefits = [
  'Precificação inteligente',
  'Análise de Shopee Ads',
  'Análise de produto',
  'Análise de Anúncio',
  'Performance por produto',
  'Mapa de oportunidades',
  'Dados que o painel da Shopee não mostra',
];

const monthlyBenefits = [...sharedBenefits, '2 lojas conectadas'];

const yearlyBenefits = [
  ...sharedBenefits,
  'Múltiplas lojas (até 7)',
  'Suporte prioritário',
];

export default function Paywall() {
  const { refreshSubscription } = useBilling();
  const { handleSignOut } = useSignOut();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  const handlePlanCheckout = () => {
    const url = plan === 'yearly' ? PRICING.checkoutYearly : PRICING.checkoutMonthly;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const isYearly = plan === 'yearly';
  const monthlyEquiv = (PRICING.yearly / 12).toFixed(2).replace('.', ',');
  const benefits = isYearly ? yearlyBenefits : monthlyBenefits;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Logo */}
        <div className="flex justify-center pt-2">
          <img src={logoIcon} alt="Skalify" className="w-14 h-14 rounded-2xl" />
        </div>

        {/* Badge */}
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/25"
            style={{ padding: '5px 14px', fontSize: '12px', fontWeight: 600, color: 'hsl(var(--primary))' }}
          >
            ⚡ Acesso completo desbloqueado
          </span>
        </div>

        {/* Hero */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h1 style={{ fontSize: '28px', lineHeight: '1.15', fontWeight: 400 }} className="text-foreground">
            Pare de chutar.
            <br />
            <strong style={{ fontWeight: 800 }}>
              Comece a lucrar
              <br />
              de verdade.
            </strong>
          </h1>
          <p style={{ fontSize: '13px', lineHeight: '1.5' }} className="text-muted-foreground px-4">
            Vendedores Shopee que usam o Skalify tomam decisões com dados — e crescem até 3x mais rápido.
          </p>
        </div>

        {/* Toggle */}
        <div
          className="flex items-center rounded-[14px] border border-border/60 bg-muted/30 mx-6"
          style={{ padding: '4px', gap: '4px' }}
        >
          <button
            onClick={() => setPlan('monthly')}
            className={cn(
              'flex-1 rounded-[10px] transition-all',
            !isYearly
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground border border-transparent'
            )}
            style={{ padding: '10px 0', fontSize: '13px', fontWeight: 600 }}
          >
            Mensal
          </button>
          <button
            onClick={() => setPlan('yearly')}
            className={cn(
              'flex-1 rounded-[10px] transition-all relative',
              isYearly
                ? 'bg-card text-foreground border border-border/60 shadow-sm'
                : 'text-muted-foreground border border-transparent'
            )}
            style={{ padding: '10px 0', fontSize: '13px', fontWeight: 600 }}
          >
            Anual
            <span
              className="absolute bg-primary text-primary-foreground rounded-full"
              style={{ top: '-10px', right: '-6px', fontSize: '10px', fontWeight: 700, padding: '2px 7px', lineHeight: '1.2' }}
            >
              -{PRICING.yearlySavingPct}%
            </span>
          </button>
        </div>

        {/* Plan name & subtitle */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <p className="text-foreground font-bold" style={{ fontSize: '16px' }}>
            {isYearly ? 'Skalify Pro' : 'Essencial - Mensal'}
          </p>
          <p className="text-muted-foreground px-6" style={{ fontSize: '12px', lineHeight: '1.4', fontStyle: 'italic' }}>
            {isYearly
              ? 'Ideal para: sellers sérios que querem controle total e escalar com inteligência.'
              : 'Ideal para: quem está começando a vender na Shopee e quer clareza nos números.'}
          </p>
        </div>

        {/* Price */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          {/* Original price + discount badge */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground line-through" style={{ fontSize: '14px' }}>
              {isYearly ? `${PRICING.yearlyOriginalLabel}/ano` : `${PRICING.monthlyOriginalLabel}/mês`}
            </span>
            <span
              className="rounded-full bg-primary/15 text-primary font-bold"
              style={{ fontSize: '11px', padding: '2px 8px' }}
            >
              -{isYearly ? PRICING.yearlySavingPct : PRICING.monthlyDiscountPct}% OFF
            </span>
          </div>

          {/* Current price */}
          {isYearly ? (
            <>
              <p className="text-foreground font-bold font-mono" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                {PRICING.yearlyLabel}
                <span className="font-sans text-muted-foreground" style={{ fontSize: '16px', fontWeight: 400 }}> /ano</span>
              </p>
              <p className="text-primary font-semibold" style={{ fontSize: '13px' }}>
                Apenas R$ {monthlyEquiv}/mês · você economiza R$ {PRICING.yearlySaving},00
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground font-bold font-mono" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                {PRICING.monthlyLabel}
                <span className="font-sans text-muted-foreground" style={{ fontSize: '16px', fontWeight: 400 }}> /mês</span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
                Sem fidelidade · cancele quando quiser
              </p>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="px-3">
          <button
            onClick={handlePlanCheckout}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors active:scale-[0.98]"
            style={{ height: '54px', fontSize: '16px', fontWeight: 700, borderRadius: '14px', boxShadow: '0 4px 20px -4px hsl(var(--primary) / 0.5)' }}
          >
            {isYearly ? 'Quero o Skalify Pro →' : 'Quero começar agora →'}
          </button>
        </div>

        {/* Store indicator */}
        <div className="flex items-center justify-center gap-1.5 text-muted-foreground" style={{ fontSize: '12px' }}>
          <Store className="w-3.5 h-3.5" />
          <span>{isYearly ? 'Até 7 lojas conectadas' : '2 lojas conectadas'}</span>
        </div>

        {/* Trust */}
        <p className="text-center text-muted-foreground/60" style={{ fontSize: '11px' }}>
          🔒 Garantia de 7 dias · Acesso imediato
        </p>

        {/* Benefits */}
        <div
          className="rounded-2xl border border-border/40 bg-card/40 mx-1"
          style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <span className="text-muted-foreground uppercase" style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>
              O que está incluído
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {benefits.map((b) => (
              <div key={b} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={2} />
                <span className={cn("text-foreground/80", (b.includes('lojas') || b.includes('prioritário')) && 'text-primary font-semibold')} style={{ fontSize: '13px', lineHeight: '1.35' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Already subscribed */}
        <button
          onClick={refreshSubscription}
          className="w-full text-center text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          style={{ fontSize: '13px' }}
        >
          Já assinei → Verificar acesso
        </button>

        <button
          onClick={handleSignOut}
          className="w-full text-center text-muted-foreground/60 hover:text-foreground transition-colors"
          style={{ fontSize: '13px', paddingBottom: '8px' }}
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}
