import { Button } from '@/components/ui/button';
import { Upload, Megaphone } from 'lucide-react';

export function AdsEmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
        <Megaphone className="w-8 h-8 text-text-3" />
      </div>
      <div className="space-y-2">
        <p className="text-[15px] font-bold text-foreground">Importe seu relatório de Shopee Ads</p>
        <p className="text-[13px] text-text-2 max-w-[300px] mx-auto">
          Exporte o CSV em: Shopee Seller Center → Marketing → Shopee Ads → Relatórios → Todos os Anúncios → Exportar
        </p>
      </div>
      <Button onClick={onImport} className="h-12 w-4/5 max-w-[320px] rounded-xl text-sm font-bold gap-2 mt-4">
        <Upload className="w-4 h-4" /> Importar CSV
      </Button>
    </div>
  );
}
