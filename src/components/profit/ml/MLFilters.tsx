import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MLTableFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  adType: 'all' | 'classico' | 'premium' | 'none';
  outcome: 'all' | 'profit' | 'loss';
  configured: 'all' | 'yes' | 'no';
  sortBy: 'default' | 'revenue' | 'profit' | 'margin' | 'units' | 'cost';
  sortDir: 'asc' | 'desc';
}

export const DEFAULT_ML_FILTERS: MLTableFilters = {
  search: '',
  status: 'all',
  adType: 'all',
  outcome: 'all',
  configured: 'all',
  sortBy: 'default',
  sortDir: 'desc',
};

interface Props {
  value: MLTableFilters;
  onChange: (v: MLTableFilters) => void;
}

interface ChipGroupProps<T extends string> {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

function ChipGroup<T extends string>({ options, value, onChange }: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'px-3 py-1 rounded-full border text-[11px] font-medium transition-colors',
            value === o.key
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/30 text-text-2 border-border/60 hover:bg-muted/60',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function MLFilters({ value, onChange }: Props) {
  const patch = (p: Partial<MLTableFilters>) => onChange({ ...value, ...p });
  return (
    <div className="rounded-2xl border border-border bg-card p-3 md:p-4 space-y-3 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
        <Input
          placeholder="Buscar por nome, SKU ou ID do anúncio…"
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          className="pl-9 h-9 bg-background"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
          <ChipGroup
            value={value.status}
            onChange={(v) => patch({ status: v })}
            options={[
              { key: 'all', label: 'Todos' },
              { key: 'active', label: 'Ativos' },
              { key: 'inactive', label: 'Inativos' },
            ]}
          />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Tipo</p>
          <ChipGroup
            value={value.adType}
            onChange={(v) => patch({ adType: v })}
            options={[
              { key: 'all', label: 'Todos' },
              { key: 'classico', label: 'Clássico' },
              { key: 'premium', label: 'Premium' },
              { key: 'none', label: 'Sem tipo' },
            ]}
          />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Resultado</p>
          <ChipGroup
            value={value.outcome}
            onChange={(v) => patch({ outcome: v })}
            options={[
              { key: 'all', label: 'Todos' },
              { key: 'profit', label: 'Lucro' },
              { key: 'loss', label: 'Prejuízo' },
            ]}
          />
        </div>
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Cadastro</p>
          <ChipGroup
            value={value.configured}
            onChange={(v) => patch({ configured: v })}
            options={[
              { key: 'all', label: 'Todos' },
              { key: 'yes', label: 'Configurados' },
              { key: 'no', label: 'Não configurados' },
            ]}
          />
        </div>

        <div className="ml-auto min-w-[180px]">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Ordenar por</p>
          <Select
            value={`${value.sortBy}:${value.sortDir}`}
            onValueChange={(v) => {
              const [sortBy, sortDir] = v.split(':') as [MLTableFilters['sortBy'], MLTableFilters['sortDir']];
              patch({ sortBy, sortDir });
            }}
          >
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default:desc">Ordem original</SelectItem>
              <SelectItem value="revenue:desc">Vendas - maior</SelectItem>
              <SelectItem value="revenue:asc">Vendas - menor</SelectItem>
              <SelectItem value="profit:desc">Lucro - maior</SelectItem>
              <SelectItem value="profit:asc">Lucro - menor</SelectItem>
              <SelectItem value="margin:desc">Margem - maior</SelectItem>
              <SelectItem value="margin:asc">Margem - menor</SelectItem>
              <SelectItem value="units:desc">Unidades - maior</SelectItem>
              <SelectItem value="cost:desc">Custo - maior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
