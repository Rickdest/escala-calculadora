import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

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

export function MLFilters({ value, onChange }: Props) {
  const patch = (p: Partial<MLTableFilters>) => onChange({ ...value, ...p });
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
        <Input
          placeholder="Buscar por nome, SKU ou ID do anúncio…"
          value={value.search}
          onChange={(e) => patch({ search: e.target.value })}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <Select value={value.status} onValueChange={(v) => patch({ status: v as any })}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value.adType} onValueChange={(v) => patch({ adType: v as any })}>
          <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="classico">Clássico</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="none">Sem tipo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value.outcome} onValueChange={(v) => patch({ outcome: v as any })}>
          <SelectTrigger><SelectValue placeholder="Resultado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos resultados</SelectItem>
            <SelectItem value="profit">Com lucro</SelectItem>
            <SelectItem value="loss">Com prejuízo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={value.configured} onValueChange={(v) => patch({ configured: v as any })}>
          <SelectTrigger><SelectValue placeholder="Cadastro" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos cadastros</SelectItem>
            <SelectItem value="yes">Configurados</SelectItem>
            <SelectItem value="no">Não configurados</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={`${value.sortBy}:${value.sortDir}`}
          onValueChange={(v) => {
            const [sortBy, sortDir] = v.split(':') as [MLTableFilters['sortBy'], MLTableFilters['sortDir']];
            patch({ sortBy, sortDir });
          }}
        >
          <SelectTrigger><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default:desc">Ordem original</SelectItem>
            <SelectItem value="revenue:desc">Vendas — maior</SelectItem>
            <SelectItem value="revenue:asc">Vendas — menor</SelectItem>
            <SelectItem value="profit:desc">Lucro — maior</SelectItem>
            <SelectItem value="profit:asc">Lucro — menor</SelectItem>
            <SelectItem value="margin:desc">Margem — maior</SelectItem>
            <SelectItem value="margin:asc">Margem — menor</SelectItem>
            <SelectItem value="units:desc">Unidades — maior</SelectItem>
            <SelectItem value="cost:desc">Custo — maior</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
