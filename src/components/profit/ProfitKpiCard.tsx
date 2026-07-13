import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  value: string;
  sub?: string | null;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'primary';
  /** 0-100 fills a thin horizontal bar in the same tone. */
  bar?: number | null;
  className?: string;
}

const toneClass: Record<NonNullable<Props['tone']>, { value: string; icon: string; bar: string }> = {
  default: { value: 'text-foreground', icon: 'text-primary/25', bar: 'bg-primary' },
  primary: { value: 'text-foreground', icon: 'text-primary/25', bar: 'bg-primary' },
  success: { value: 'text-success', icon: 'text-success/30', bar: 'bg-success' },
  warning: { value: 'text-warning', icon: 'text-warning/30', bar: 'bg-warning' },
  destructive: { value: 'text-destructive', icon: 'text-destructive/30', bar: 'bg-destructive' },
};

export function ProfitKpiCard({
  label, value, sub, icon: Icon, tone = 'default', bar = null, className = '',
}: Props) {
  const t = toneClass[tone];
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border bg-card p-3 md:p-5 min-w-0 overflow-hidden shadow-sm',
        className,
      )}
    >
      <Icon className={cn('absolute top-3 right-3 w-7 h-7 md:w-9 md:h-9', t.icon)} />
      <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn('text-xl md:text-3xl font-black font-mono tabular-nums mt-1 truncate', t.value)}>
        {value}
      </p>
      {bar !== null && bar !== undefined ? (
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', t.bar)}
            style={{ width: `${Math.max(0, Math.min(100, bar))}%` }}
          />
        </div>
      ) : null}
      {sub ? <p className="text-[11px] text-text-3 mt-2 truncate">{sub}</p> : null}
    </div>
  );
}
