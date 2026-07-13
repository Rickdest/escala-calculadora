import { MLCard } from './MLCard';
import { Button } from '@/components/ui/button';
import { ExternalLink, Trash2, FileSpreadsheet } from 'lucide-react';
import { MLImportHistoryRecord } from '@/hooks/useMLImportHistory';

interface Props {
  items: MLImportHistoryRecord[];
  onView: (item: MLImportHistoryRecord) => void;
  onRemove: (id: string) => void;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function MLHistoryList({ items, onView, onRemove }: Props) {
  if (items.length === 0) {
    return (
      <MLCard className="p-10 text-center">
        <FileSpreadsheet className="mx-auto w-12 h-12 text-text-3/30 mb-3" />
        <p className="text-body font-medium">Nenhuma importação registrada</p>
        <p className="text-caption text-text-3 mt-1">
          Ao importar um relatório, ele aparecerá aqui para você revisar ou recarregar.
        </p>
      </MLCard>
    );
  }
  return (
    <div className="grid gap-2">
      {items.map((it) => (
        <MLCard key={it.id} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-body font-medium truncate">
                {it.file_name || 'Relatório Mercado Livre'}
              </p>
              <p className="text-caption text-text-3 truncate">
                {it.period_start ?? '?'} → {it.period_end ?? '?'} · {it.ads_count} anúncios ·
                {' '}{it.linked_count} vinc. · {it.unlinked_count} sem vínc. · <span className="font-mono tabular-nums">{fmtBRL(Number(it.gross_sales_total))}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onView(it)} title="Recarregar"><ExternalLink className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(it.id)} title="Remover"><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        </MLCard>
      ))}
    </div>
  );
}
