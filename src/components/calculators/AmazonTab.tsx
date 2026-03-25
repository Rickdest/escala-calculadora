import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { calcAmazon, type AmazonResult, type AmazonPlan, AMAZON_CATEGORIES } from '@/lib/amazonUtils';
import { NumInput, ResultPanel, TaxInput, useTaxFromConfig, type CostLine } from './shared';

export function AmazonTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [categoryIdx, setCategoryIdx] = useState('35');
  const [plan, setPlan] = useState<AmazonPlan>('profissional');
  const [packaging, setPackaging] = useState('');
  const { taxes, setTaxes, configTax } = useTaxFromConfig();

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;
  const idx = parseInt(categoryIdx);
  const cat = AMAZON_CATEGORIES[idx];

  const result = useMemo<AmazonResult | null>(() => {
    if (!isReady) return null;
    return calcAmazon(sp, cp, cat.rate, plan, parseFloat(packaging) || 0, parseFloat(taxes) || 0);
  }, [sp, cp, cat.rate, plan, packaging, taxes, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: `Comissão (${(result.commissionRate * 100).toFixed(0)}%)`, value: result.commissionCost },
    ...(result.planFixedFee > 0 ? [{ label: 'Taxa plano individual', value: result.planFixedFee }] : []),
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
              {AMAZON_CATEGORIES.map((c, i) => (
                <SelectItem key={i} value={String(i)}>
                  {c.label} ({(c.rate * 100).toFixed(0)}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-text-2 font-medium">Plano</Label>
          <Select value={plan} onValueChange={(v) => setPlan(v as AmazonPlan)}>
            <SelectTrigger className="input-modern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="profissional">Profissional</SelectItem>
              <SelectItem value="individual">Individual (+R$2/item)</SelectItem>
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
