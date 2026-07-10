import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface MLTableFilters {
  search: string;
  status: 'all' | 'active' | 'inactive';
  adType: 'all' | 'classico' | 'premium' | 'none';
  outcome: 'all' | 'profit' | 'loss';
  configured: 'all' | 'yes' | 'no';
}

export const DEFAULT_ML_FILTERS: MLTableFilters = {
  search: '',
  status: 'all',
  adType: 'all',
  outcome: 'all',
  configured: 'all',
};

interface Props {
  value: MLTableFilters;
  onChange: (v: MLTableFilters) => void;
}

export function MLFilters({ value, onChange }: Props) {
  const patch = (p: Partial<MLTableFilters>) => onChange({ ...value, ...p });
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      <Input
        placeholder="Buscar por nome, SKU ou ID..."
        value={value.search}
        onChange={(e) => patch({ search: e.target.value })}
      />
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
    </div>
  );
}
