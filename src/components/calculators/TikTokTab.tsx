import { useState, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { calcTikTok, type TikTokResult } from '@/lib/tiktokUtils';
import { NumInput, ResultPanel, type CostLine } from './shared';

export function TikTokTab() {
  const [salePrice, setSalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [packaging, setPackaging] = useState('');
  const [taxes, setTaxes] = useState('');
  const [hasAffiliate, setHasAffiliate] = useState(false);
  const [affiliatePct, setAffiliatePct] = useState('');

  const sp = parseFloat(salePrice) || 0;
  const cp = parseFloat(costPrice) || 0;
  const isReady = sp > 0 && cp > 0;

  const result = useMemo<TikTokResult | null>(() => {
    if (!isReady) return null;
    return calcTikTok(sp, cp, parseFloat(packaging) || 0, parseFloat(taxes) || 0, hasAffiliate ? (parseFloat(affiliatePct) || 0) : 0);
  }, [sp, cp, packaging, taxes, hasAffiliate, affiliatePct, isReady]);

  const costs: CostLine[] = result ? [
    { label: 'Custo do produto', value: result.costPrice },
    { label: 'Comissão (6%)', value: result.commission },
    { label: 'Frete (6%)', value: result.shippingFee },
    ...(result.fixedFee > 0 ? [{ label: 'Taxa fixa', value: result.fixedFee }] : []),
    ...(result.affiliateCost > 0 ? [{ label: 'Afiliado', value: result.affiliateCost }] : []),
    ...(result.packagingCost > 0 ? [{ label: 'Embalagem', value: result.packagingCost }] : []),
    ...(result.taxesCost > 0 ? [{ label: 'Impostos', value: result.taxesCost }] : []),
  ] : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <NumInput label="Preço de venda" value={salePrice} onChange={setSalePrice} suffix="R$" required />
        <NumInput label="Custo do produto" value={costPrice} onChange={setCostPrice} suffix="R$" required />
        <NumInput label="Embalagem" value={packaging} onChange={setPackaging} suffix="R$" />
        <NumInput label="Impostos" value={taxes} onChange={setTaxes} suffix="%" />

        <div className="flex items-center justify-between rounded-[10px] bg-surface-2 border border-border p-3">
          <Label className="text-sm text-text-2">Tem afiliado?</Label>
          <Switch checked={hasAffiliate} onCheckedChange={setHasAffiliate} />
        </div>
        {hasAffiliate && (
          <NumInput label="Comissão do afiliado" value={affiliatePct} onChange={setAffiliatePct} suffix="%" />
        )}

        <div className="rounded-[10px] bg-surface-2 border border-border p-3">
          <p className="section-label mb-1">Taxas aplicadas automaticamente</p>
          <p className="text-xs text-text-2">Comissão 6% · Frete 6% · Taxa fixa R$4,00 (se {'<'} R$79)</p>
        </div>
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
