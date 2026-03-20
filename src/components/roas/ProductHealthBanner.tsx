import { cn, getMarginStatus } from '@/lib/utils';
import { TrendingDown, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface ProductHealthBannerProps {
  marginPercent: number;
}

const iconMap: Record<string, React.ElementType> = {
  'trending-down': TrendingDown,
  'alert-triangle': AlertTriangle,
  'check-circle': CheckCircle,
  'trending-up': TrendingUp,
};

export function ProductHealthBanner({ marginPercent }: ProductHealthBannerProps) {
  const health = getMarginStatus(marginPercent);
  const Icon = iconMap[health.emoji] || CheckCircle;

  return (
    <div className={cn('rounded-2xl border p-4 flex items-start gap-3 animate-fade-in', health.bg, health.border)}>
      <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', health.color)} />
      <div className="flex-1">
        <p className={cn('font-bold text-sm', health.color)}>{health.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{health.message}</p>
        <p className={cn('text-xs font-bold mt-1 tabular-nums', health.color)}>
          Margem líquida: {marginPercent.toFixed(1)}%
        </p>
      </div>
    </div>
  );
}
