import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MLCard as Card } from './MLCard';
import { Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { parseMercadoLivreReport, MLReportParsed } from '@/lib/parsers/parseMercadoLivreReport';

interface Props {
  onParsed: (parsed: MLReportParsed, file: File) => void;
}

export function MLImportCard({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function handle(file: File) {
    setLoading(true);
    try {
      const parsed = await parseMercadoLivreReport(file);
      onParsed(parsed, file);
      toast.success('Relatório do Mercado Livre carregado', {
        description: `${parsed.rows.length} anúncios · período ${parsed.periodStart ?? '?'} → ${parsed.periodEnd ?? '?'}`,
      });
    } catch (e: any) {
      toast.error('Falha ao importar', { description: e?.message || 'Arquivo inválido' });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <Card className="p-6 md:p-8 relative overflow-hidden">
      <FileSpreadsheet className="absolute -right-4 -bottom-4 w-32 h-32 text-primary/10" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Passo 1</p>
          <p className="text-h3 font-semibold mt-1">Enviar relatório do Mercado Livre</p>
          <p className="text-caption text-text-3 mt-1 max-w-xl">
            Aba <span className="font-medium text-text-2">Relatório</span> (.xlsx). Reconhece
            {' '}<span className="font-medium text-text-2">Vendas brutas</span> em BRL/R$/ARS.
            SKU é usado como identificador; ID do anúncio como fallback.
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={loading} size="lg">
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
          Enviar planilha
        </Button>
      </div>
    </Card>
  );
}
