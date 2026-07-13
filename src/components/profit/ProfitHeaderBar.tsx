import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  subtitle?: string | ReactNode;
  periodChip?: string | null;
  actions?: ReactNode;
  className?: string;
}

export function ProfitHeaderBar({ title, subtitle, periodChip, actions, className }: Props) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 -mx-1 px-1 pt-1 pb-3 bg-background/95 backdrop-blur-md border-b border-border/60',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-body font-semibold tracking-tight">{title}</p>
            {periodChip && (
              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-text-2 tabular-nums">
                {periodChip}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-caption text-text-3 truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
