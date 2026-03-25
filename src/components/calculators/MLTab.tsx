import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink } from 'lucide-react';
import { calcML, type MLResult, type MLAnuncio, ML_CATEGORIES } from '@/lib/mlUtils';
import { NumInput, ResultPanel, TaxInput, useTaxFromConfig, type CostLine } from './shared';

export function MLTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [categoryIdx, setCategoryIdx] = useState('0');
  const [anuncio, setAnuncio] = useState<MLAnuncio>('classico');
  const [freight, setFreight] = useState('');
  const [packaging, setPackaging] = useState('');
  const { taxes, setTaxes, configTax } = useTaxFromConfig();

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;
  const idx = parseInt(categoryIdx);

  const result = useMemo<MLResult | null>(() => {
    if (!isReady) return null;
    return calcML(sp, cp, idx, anuncio, parseFloat(freight) || 0, parseFloat(packaging) || 0, parseFloat(taxes) || 0);
  }, [sp, cp, idx, anuncio, freight, packaging, taxes, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: `Comissão (${(result.commissionRate * 100).toFixed(1)}%)`, value: result.commissionCost },
    ...(result.fixedFee > 0 ? [{ label: 'Taxa fixa', value: result.fixedFee }] : []),
    ...(result.freightCost > 0 ? [{ label: 'Frete', value: result.freightCost }] : []),
    ...(result.packagingCost > 0 ? [{ label: 'Embalagem', value: result.packagingCost }] : []),
    ...(result.taxesCost > 0 ? [{ label: 'Impostos', value: result.taxesCost }] : []),
  ] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />
        <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Categoria</Label>
          <Select value={categoryIdx} onValueChange={setCategoryIdx}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              {ML_CATEGORIES.map((c, i) => (
                <SelectItem key={i} value={String(i)}>
                  {c.label} (Clássico {(c.classico * 100).toFixed(1)}% | Premium {(c.premium * 100).toFixed(1)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Tipo de anúncio</Label>
          <Select value={anuncio} onValueChange={(v) => setAnuncio(v as MLAnuncio)}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="classico">Clássico</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <NumInput label="Custo de envio" value={freight} onChange={setFreight} suffix="R$" />
          <a
            href="https://www.mercadolivre.com.br/ajuda/custos-envio-reputacao-verde-mercado-lider_40538"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Consultar tabela de custos do ML <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <NumInput label="Embalagem" value={packaging} onChange={setPackaging} suffix="R$" />
        <TaxInput value={taxes} onChange={setTaxes} configValue={configTax} />
      </div>

      <ResultPanel
        costs={costs}
        netProfit={result?.netProfit ?? 0}
        margin={result?.margin ?? 0}
        salePrice={sp}
        isReady={isReady && !!result}
        showRoas
      />
    </div>
  );
}
