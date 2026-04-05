interface Props {
  label: string;
  value: number;
  max: number;
  pct?: number;
  pctLabel?: string;
  color?: 'default' | 'green';
}

export function FunnelBar({ label, value, max, pct, pctLabel, color = 'default' }: Props) {
  const width = max > 0 ? Math.max((value / max) * 100, 1) : 0;
  const barColor = color === 'green' ? 'bg-emerald-500' : 'bg-primary';

  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="w-28 md:w-36 shrink-0">
        <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      </div>
      <div className="flex-1 h-5 bg-muted/40 rounded-full overflow-hidden relative">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(width, 100)}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-foreground">
          {value.toLocaleString('pt-BR')}
        </span>
      </div>
      {pct !== undefined && (
        <span className="text-[10px] font-mono font-semibold text-primary shrink-0 w-16 text-right">
          {pctLabel ? `${pctLabel} ` : ''}{pct.toFixed(2)}%
        </span>
      )}
    </div>
  );
}
