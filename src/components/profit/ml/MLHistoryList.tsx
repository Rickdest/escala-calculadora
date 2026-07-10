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
    return <p className="text-caption text-text-3 p-2">Nenhuma importação registrada.</p>;
  }
  return (
    <div className="grid gap-2">
      {items.map((it) => (
        <MLCard key={it.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-body font-medium truncate">
                {it.file_name || 'Relatório Mercado Livre'}
              </p>
              <p className="text-caption text-text-3">
                {it.period_start ?? '?'} → {it.period_end ?? '?'} · {it.ads_count} anúncios ·
                {' '}{it.linked_count} vinculados · {it.unlinked_count} sem vínculo · {fmtBRL(Number(it.gross_sales_total))}
              </p>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => onView(it)}><ExternalLink className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => onRemove(it.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
          </div>
        </MLCard>
      ))}
    </div>
  );
}
