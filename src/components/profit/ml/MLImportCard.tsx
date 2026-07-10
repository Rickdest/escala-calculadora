import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <Card className="p-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <FileSpreadsheet className="h-5 w-5 text-primary hidden md:block" />
        <div className="flex-1">
          <p className="text-body font-medium">Enviar relatório do Mercado Livre (.xlsx)</p>
          <p className="text-caption text-text-3">
            Aba <span className="font-medium">Relatório</span>. Reconhece <span className="font-medium">Vendas brutas</span> em qualquer moeda (BRL, R$, ARS…).
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
        <Button onClick={() => inputRef.current?.click()} disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Upload className="mr-2 h-4 w-4" />}
          Enviar planilha
        </Button>
      </div>
    </Card>
  );
}
