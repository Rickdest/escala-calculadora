import { useMemo } from 'react';
import { EnrichedAdsData } from '@/hooks/useAdsData';
import { generateAlerts } from '@/lib/adsLogic';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

export function AlertsSection({ data }: { data: EnrichedAdsData[] }) {
  const alerts = useMemo(() => generateAlerts(data), [data]);
  if (alerts.length === 0) return null;

  const icons: Record<string, React.ElementType> = {
    critico: TrendingDown, atencao: AlertTriangle, oportunidade: TrendingUp, insight: Zap,
  };
  const colors: Record<string, string> = {
    critico: 'border-destructive/20 bg-destructive/5',
    atencao: 'border-warning/20 bg-warning/5',
    oportunidade: 'border-success/20 bg-success/5',
    insight: 'border-primary/20 bg-primary/5',
  };

  return (
    <div className="space-y-3">
      <p className="section-label flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5 text-primary" /> Alertas Automáticos
      </p>
      {alerts.slice(0, 8).map((a, i) => {
        const Icon = icons[a.type] || AlertTriangle;
        return (
          <div key={i} className={cn('flex items-start gap-3 p-3 rounded-xl border', colors[a.type])}>
            <Icon className={cn('w-4 h-4 flex-shrink-0 mt-0.5', `text-${a.cor}`)} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{a.productName}</p>
              <p className="text-[11px] text-text-2 mt-0.5">{a.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
