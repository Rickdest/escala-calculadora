import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calcShein, type SheinResult, type SheinCategory } from '@/lib/sheinUtils';
import { NumInput, ResultPanel, TaxInput, useTaxFromConfig, type CostLine } from './shared';

export function SheinTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [category, setCategory] = useState<SheinCategory>('moda');
  const [weightBand, setWeightBand] = useState('0.3');
  const [packaging, setPackaging] = useState('');
  const { taxes, setTaxes, configTax } = useTaxFromConfig();

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;

  const result = useMemo<SheinResult | null>(() => {
    if (!isReady) return null;
    return calcShein(sp, cp, category, parseFloat(weightBand), parseFloat(packaging) || 0, parseFloat(taxes) || 0);
  }, [sp, cp, category, weightBand, packaging, taxes, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: `Comissão (${(result.commissionRate * 100).toFixed(0)}%)`, value: result.commissionCost },
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
          <Select value={category} onValueChange={(v) => setCategory(v as SheinCategory)}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="moda">Moda (20%)</SelectItem>
              <SelectItem value="outros">Outras categorias (18%)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Peso do produto</Label>
          <Select value={weightBand} onValueChange={setWeightBand}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0.3">Até 300g — R$4,00</SelectItem>
              <SelectItem value="1">300g até 1kg — R$5,00</SelectItem>
              <SelectItem value="2">1kg até 2kg — R$5,00</SelectItem>
              <SelectItem value="5">2kg até 5kg — R$6,00</SelectItem>
              <SelectItem value="9">5kg até 9kg — R$7,00</SelectItem>
            </SelectContent>
          </Select>
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
      />
    </div>
  );
}
