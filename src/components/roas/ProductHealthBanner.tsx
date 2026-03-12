import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductHealthBannerProps {
  marginPercent: number;
}

export function ProductHealthBanner({ marginPercent }: ProductHealthBannerProps) {
  const health = marginPercent < 0
    ? { status: 'danger', emoji: '🔴', icon: AlertTriangle, title: 'Produto no prejuízo', message: 'Revise seu custo ou preço de venda.', bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive' }
    : marginPercent <= 15
    ? { status: 'warning', emoji: '🟡', icon: AlertCircle, title: 'Margem apertada', message: 'Anunciar pode ser arriscado.', bg: 'bg-warning/10 border-warning/30', text: 'text-warning' }
    : { status: 'success', emoji: '🟢', icon: CheckCircle2, title: 'Produto saudável!', message: 'Bom candidato para anúncios.', bg: 'bg-success/10 border-success/30', text: 'text-success' };

  return (
    <div className={cn('rounded-2xl border p-4 flex items-start gap-3 animate-fade-in', health.bg)}>
      <span className="text-xl mt-0.5">{health.emoji}</span>
      <div className="flex-1">
        <p className={cn('font-bold text-sm', health.text)}>{health.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{health.message}</p>
        <p className={cn('text-xs font-bold mt-1 tabular-nums', health.text)}>
          Margem líquida: {marginPercent.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
