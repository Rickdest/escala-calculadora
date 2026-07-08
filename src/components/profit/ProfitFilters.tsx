import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

export type Granularity = 'day' | 'week' | 'month';
export type RangePreset = '7d' | '30d' | 'month' | 'all' | 'custom';

export interface DateRange {
  start: string; // ISO
  end: string;
}

interface Props {
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  preset: RangePreset;
  onPresetChange: (p: RangePreset) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (r: DateRange | null) => void;
  minDate?: string;
  maxDate?: string;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function fmtBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function ProfitFilters({
  granularity,
  onGranularityChange,
  preset,
  onPresetChange,
  customRange,
  onCustomRangeChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState<Date | undefined>(customRange ? new Date(customRange.start + 'T00:00:00') : undefined);
  const [to, setTo] = useState<Date | undefined>(customRange ? new Date(customRange.end + 'T00:00:00') : undefined);

  const presets: { key: RangePreset; label: string }[] = [
    { key: '7d', label: '7 dias' },
    { key: '30d', label: '30 dias' },
    { key: 'month', label: 'Este mês' },
    { key: 'all', label: 'Tudo' },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-4">
      <div>
        <Label className="text-caption">Agrupar por</Label>
        <Tabs value={granularity} onValueChange={(v) => onGranularityChange(v as Granularity)}>
          <TabsList>
            <TabsTrigger value="day">Dia</TabsTrigger>
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div>
        <Label className="text-caption">Período</Label>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <Button
              key={p.key}
              size="sm"
              variant={preset === p.key ? 'default' : 'outline'}
              onClick={() => onPresetChange(p.key)}
            >
              {p.label}
            </Button>
          ))}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant={preset === 'custom' ? 'default' : 'outline'}>
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {preset === 'custom' && customRange
                  ? `${fmtBR(customRange.start)} → ${fmtBR(customRange.end)}`
                  : 'Personalizado'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="end">
              <div className="flex flex-col md:flex-row gap-3">
                <div>
                  <p className="text-caption text-text-3 mb-1">De</p>
                  <Calendar mode="single" selected={from} onSelect={setFrom} />
                </div>
                <div>
                  <p className="text-caption text-text-3 mb-1">Até</p>
                  <Calendar mode="single" selected={to} onSelect={setTo} />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button
                  size="sm"
                  disabled={!from || !to}
                  onClick={() => {
                    if (from && to) {
                      const s = from <= to ? from : to;
                      const e = from <= to ? to : from;
                      onCustomRangeChange({ start: toISO(s), end: toISO(e) });
                      onPresetChange('custom');
                      setOpen(false);
                    }
                  }}
                >
                  Aplicar
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
