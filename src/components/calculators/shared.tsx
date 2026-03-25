import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { TrendingUp, AlertTriangle, TrendingDown, CalendarDays, Settings, Info } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';

// ── Formatters ──

export const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export const fmtPct = (v: number) => `${v.toFixed(1)}%`;

// ── Margin status ──

export function getMarginStatus(margin: number, netProfit: number) {
  if (netProfit <= 0) return { label: 'Prejuízo', icon: TrendingDown, color: 'text-danger', bg: 'bg-danger/10 border-danger/30' };
  if (margin < 10) return { label: 'Atenção', icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' };
  if (margin < 17) return { label: 'Saudável', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10 border-success/30' };
  return { label: 'Ideal', icon: TrendingUp, color: 'text-success', bg: 'bg-success/10 border-success/30' };
}

// ── Shared input component ──

export function NumInput({ label, value, onChange, placeholder, suffix, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-text-2 font-medium">
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '0,00'}
          className="input-modern pr-10"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-3">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ── Result panel ──

export interface CostLine { label: string; value: number }

export function ResultPanel({ costs, netProfit, margin, salePrice, isReady, showRoas = false }: {
  costs: CostLine[]; netProfit: number; margin: number; salePrice: number; isReady: boolean; showRoas?: boolean;
}) {
  const [salesCount, setSalesCount] = useState(50);
  const status = getMarginStatus(margin, netProfit);
  const StatusIcon = status.icon;

  if (!isReady) {
    return (
      <div className="rounded-[10px] bg-surface-2 border border-border p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-text-3 text-sm text-center">Preencha os campos para ver o resultado</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breakdown */}
      <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-2">
        <p className="section-label mb-3">Breakdown de custos</p>
        {costs.map((c) => (
          <div key={c.label} className="flex items-center justify-between text-sm">
            <span className="text-text-2">{c.label}</span>
            <span className="text-foreground font-medium tabular-nums">{fmt(c.value)}</span>
          </div>
        ))}
        <div className="border-t border-border my-2" />
        <div className="flex items-center justify-between text-sm font-bold">
          <span className={netProfit >= 0 ? 'text-success' : 'text-danger'}>Lucro líquido</span>
          <span className={cn('tabular-nums', netProfit >= 0 ? 'text-success' : 'text-danger')}>{fmt(netProfit)}</span>
        </div>
      </div>

      {/* Margin */}
      <div className="rounded-[10px] bg-surface-2 border border-border p-4 text-center space-y-2">
        <p className="section-label">Margem real</p>
        <p className={cn('text-3xl font-extrabold tabular-nums', netProfit >= 0 ? 'text-success' : 'text-danger')}>
          {fmtPct(margin)}
        </p>
        <div className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold', status.bg, status.color)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status.label}
        </div>
      </div>

      {/* Monthly simulation */}
      <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Simulação Mensal</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-text-3">Vendas por mês</Label>
            <Input
              type="number"
              min={1}
              max={1000}
              value={salesCount}
              onChange={(e) => setSalesCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-20 h-8 text-sm text-center font-bold input-modern"
            />
          </div>
          <Slider
            value={[salesCount]}
            onValueChange={([v]) => setSalesCount(v)}
            min={1}
            max={1000}
            step={1}
          />
          <div className="flex justify-between text-[10px] text-text-3">
            <span>1</span><span>500</span><span>1000</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Receita', value: fmt(salePrice * salesCount), color: 'text-foreground' },
            { label: 'Custos', value: fmt((salePrice - netProfit) * salesCount), color: 'text-danger' },
            { label: 'Lucro', value: fmt(netProfit * salesCount), color: netProfit >= 0 ? 'text-success' : 'text-danger' },
          ].map((item) => (
            <div key={item.label} className="bg-background/50 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-text-3 font-bold uppercase tracking-wider">{item.label}</p>
              <p className={cn('text-xs font-extrabold tabular-nums mt-1', item.color)}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {showRoas && netProfit > 0 && (() => {
        const roasEmpate   = parseFloat((salePrice / netProfit).toFixed(2));
        const roasSaudavel = parseFloat((roasEmpate / 0.61).toFixed(2));
        const roasIdeal    = parseFloat((roasEmpate / 0.40).toFixed(2));
        return (
          <div className="rounded-[10px] bg-surface-2 border border-border p-4 space-y-3">
            <p className="uppercase text-[10px] font-medium text-text-3 tracking-wider">ROAS</p>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] text-text-2">Empate</span>
                  <span className="text-[10px] text-text-3 ml-1.5">abaixo disso = prejuízo</span>
                </div>
                <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">{roasEmpate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] text-text-2">Saudável</span>
                  <span className="text-[10px] text-text-3 ml-1.5">lucro consistente</span>
                </div>
                <span className="font-mono text-[14px] font-bold tabular-nums text-foreground">{roasSaudavel.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[13px] text-text-2">Ideal</span>
                  <span className="text-[10px] text-text-3 ml-1.5">escalar com segurança</span>
                </div>
                <span className="font-mono text-[14px] font-bold tabular-nums text-primary">{roasIdeal.toFixed(2)}</span>
              </div>
            </div>
            {/* Barra colorida */}
            <div className="pt-1">
              <div className="flex justify-between text-[10px] text-text-3 mb-1.5">
                <span>Empate</span><span>Saudável</span><span>Ideal</span>
              </div>
              <div className="relative h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#1F2433' }}>
                <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #EF4444, #EAB308, #22C55E)' }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="font-mono text-[10px] tabular-nums" style={{ color: '#EF4444' }}>{roasEmpate.toFixed(2)}</span>
                <span className="font-mono text-[10px] tabular-nums" style={{ color: '#EAB308' }}>{roasSaudavel.toFixed(2)}</span>
                <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: '#22C55E' }}>{roasIdeal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
