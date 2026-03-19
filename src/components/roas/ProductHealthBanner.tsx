import { cn, getMarginStatus } from '@/lib/utils';

interface ProductHealthBannerProps {
  marginPercent: number;
}

export function ProductHealthBanner({ marginPercent }: ProductHealthBannerProps) {
  const health = getMarginStatus(marginPercent);

  return (
    <div className={cn('rounded-2xl border p-4 flex items-start gap-3 animate-fade-in', health.bg, health.border)}>
      <span className="text-xl mt-0.5">{health.emoji}</span>
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
