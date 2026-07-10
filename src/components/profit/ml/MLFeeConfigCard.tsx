import { useState } from 'react';
import { MLCard } from './MLCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, X, Save } from 'lucide-react';
import { useMLFeeConfig } from '@/hooks/useMLFeeConfig';
import { MLFeeTier } from '@/lib/profit/mercadoLivreCalc';
import { toast } from 'sonner';

export function MLFeeConfigCard({ storeId }: { storeId?: string }) {
  const { effective, config, save } = useMLFeeConfig(storeId);
  const [draft, setDraft] = useState(() => effective);
  const [effectiveDate, setEffectiveDate] = useState<string>(config?.effective_date ?? new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  // re-sync when config loads
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && config) {
    setDraft(effective);
    setEffectiveDate(config.effective_date);
    setHydrated(true);
  }

  const setTier = (i: number, patch: Partial<MLFeeTier>) => {
    setDraft((d) => ({
      ...d,
      fixed_fee_tiers: d.fixed_fee_tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)),
    }));
  };
  const addTier = () => setDraft((d) => ({ ...d, fixed_fee_tiers: [...d.fixed_fee_tiers, { min: 0, max: 0, fee: 0 }] }));
  const rmTier = (i: number) =>
    setDraft((d) => ({ ...d, fixed_fee_tiers: d.fixed_fee_tiers.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await save({ ...draft, effective_date: effectiveDate });
      toast.success('Taxas salvas');
    } catch (e: any) {
      toast.error('Erro ao salvar', { description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <MLCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-body font-medium">Configuração de taxas do Mercado Livre</p>
          <p className="text-caption text-text-3">As taxas ficam salvas por loja e são editáveis conforme o ML atualiza.</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> Salvar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Cell label="Comissão Clássico (%)">
          <Input type="number" step="0.1" value={draft.classic_pct}
            onChange={(e) => setDraft({ ...draft, classic_pct: parseFloat(e.target.value) || 0 })} />
        </Cell>
        <Cell label="Comissão Premium (%)">
          <Input type="number" step="0.1" value={draft.premium_pct}
            onChange={(e) => setDraft({ ...draft, premium_pct: parseFloat(e.target.value) || 0 })} />
        </Cell>
        <Cell label="Preço mínimo sem tarifa fixa (R$)">
          <Input type="number" step="0.01" value={draft.fixed_fee_min_price}
            onChange={(e) => setDraft({ ...draft, fixed_fee_min_price: parseFloat(e.target.value) || 0 })} />
        </Cell>
        <Cell label="Vigência">
          <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        </Cell>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-caption font-medium">Faixas de tarifa fixa</p>
          <Button size="sm" variant="outline" onClick={addTier}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar faixa
          </Button>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-12 gap-2 text-caption text-text-3 px-1">
            <div className="col-span-3">Preço mín. (R$)</div>
            <div className="col-span-3">Preço máx. (R$)</div>
            <div className="col-span-3">Tarifa fixa (R$)</div>
            <div className="col-span-2">% do preço (opcional)</div>
            <div className="col-span-1" />
          </div>
          {draft.fixed_fee_tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <Input className="col-span-3" type="number" step="0.01" value={t.min}
                onChange={(e) => setTier(i, { min: parseFloat(e.target.value) || 0 })} />
              <Input className="col-span-3" type="number" step="0.01" value={t.max ?? ''}
                onChange={(e) => setTier(i, { max: e.target.value === '' ? null : parseFloat(e.target.value) || 0 })} />
              <Input className="col-span-3" type="number" step="0.01" value={t.fee}
                onChange={(e) => setTier(i, { fee: parseFloat(e.target.value) || 0 })} />
              <Input className="col-span-2" type="number" step="0.1" value={t.percent ?? ''}
                onChange={(e) => setTier(i, { percent: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })} />
              <Button className="col-span-1" size="sm" variant="ghost" onClick={() => rmTier(i)}>
                <X className="h-4 w-4 text-text-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </MLCard>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-caption text-text-3">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
