import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useBilling } from '@/hooks/useBilling';
import { Check } from 'lucide-react';
import logoIcon from '@/assets/skalify-logo.png';
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
      <div className="py-6 max-w-sm mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

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
                ? 'bg-card text-foreground border border-border/60 shadow-sm'
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

        {/* Price */}
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {isYearly ? (
            <>
              <p className="text-foreground font-bold font-mono" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                R$ {monthlyEquiv}
                <span className="font-sans text-muted-foreground" style={{ fontSize: '16px', fontWeight: 400 }}> /mês</span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
                Cobrado como {PRICING.yearlyLabel}/ano
              </p>
            </>
          ) : (
            <>
              <p className="text-foreground font-bold font-mono" style={{ fontSize: '36px', lineHeight: '1.1' }}>
                {PRICING.monthlyLabel}
                <span className="font-sans text-muted-foreground" style={{ fontSize: '16px', fontWeight: 400 }}> /mês</span>
              </p>
              <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
                Ou {PRICING.yearlyLabel}/ano e economize {PRICING.yearlySavingPct}%
              </p>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="px-3">
          <button
            onClick={handleCheckout}
            className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors active:scale-[0.98]"
            style={{ height: '54px', fontSize: '16px', fontWeight: 700, borderRadius: '14px' }}
          >
            ⚡ {isYearly ? 'Assinar plano anual' : 'Assinar plano mensal'}
          </button>
        </div>

        {/* Trust */}
        <p className="text-center text-muted-foreground/60" style={{ fontSize: '11px' }}>
          🔒 Pagamento seguro · Cancele quando quiser · Acesso imediato
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
                <span className="text-foreground/80" style={{ fontSize: '13px', lineHeight: '1.35' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Already subscribed */}
        <button
          onClick={refreshSubscription}
          className="w-full text-center text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
          style={{ fontSize: '13px', paddingBottom: '8px' }}
        >
          Já assinei → Verificar acesso
        </button>
      </div>
    </AppLayout>
  );
}
