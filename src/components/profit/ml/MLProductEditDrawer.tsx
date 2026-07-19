import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MLProductRecord } from '@/hooks/useMLProducts';
import { Save, Link2Off } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  product: MLProductRecord | null;
  onSave: (patch: Partial<MLProductRecord>) => Promise<void> | void;
  onUnlink?: (id: string) => Promise<void> | void;
}

const empty: Partial<MLProductRecord> = {
  name: '',
  sku: '',
  ad_id: '',
  variation: '',
  status: '',
  ad_type: null,
  sale_price: 0,
  cost_price: 0,
  packaging_cost: 0,
  additional_cost: 0,
  freight_cost: 0,
  freight_mode: 'none',
  tax_value: 0,
  tax_mode: 'default',
  notes: '',
};

export function MLProductEditDrawer({ open, onClose, product, onSave, onUnlink }: Props) {
  const [form, setForm] = useState<Partial<MLProductRecord>>(empty);

  useEffect(() => {
    setForm(product ?? empty);
  }, [product]);

  const set = (k: keyof MLProductRecord, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const num = (v: string) => (v === '' ? null : parseFloat(v.replace(',', '.')) || 0);

  async function handleSave() {
    await onSave(form);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar produto Mercado Livre' : 'Novo produto'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-2">
          <Field label="Nome"><Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="SKU"><Input value={form.sku ?? ''} onChange={(e) => set('sku', e.target.value)} /></Field>
          <Field label="ID do anúncio"><Input value={form.ad_id ?? ''} onChange={(e) => set('ad_id', e.target.value)} /></Field>
          <Field label="Variação"><Input value={form.variation ?? ''} onChange={(e) => set('variation', e.target.value)} /></Field>
          <Field label="Status"><Input value={form.status ?? ''} onChange={(e) => set('status', e.target.value)} placeholder="Ativo / Pausado / Inativo" /></Field>
          <Field label="Tipo de anúncio">
            <Select value={form.ad_type ?? 'none'} onValueChange={(v) => set('ad_type', v === 'none' ? null : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não definido</SelectItem>
                <SelectItem value="classico">Clássico</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preço de venda (R$)"><Input type="number" step="0.01" value={form.sale_price ?? ''} onChange={(e) => set('sale_price', num(e.target.value))} /></Field>
          <Field label="Custo do produto (R$)"><Input type="number" step="0.01" value={form.cost_price ?? ''} onChange={(e) => set('cost_price', num(e.target.value))} /></Field>
          <Field label="Embalagem (R$)"><Input type="number" step="0.01" value={form.packaging_cost ?? ''} onChange={(e) => set('packaging_cost', num(e.target.value))} /></Field>
          <Field label="Custo adicional (R$)"><Input type="number" step="0.01" value={form.additional_cost ?? ''} onChange={(e) => set('additional_cost', num(e.target.value))} /></Field>
          <Field label="Frete - modo">
            <Select value={form.freight_mode ?? 'none'} onValueChange={(v) => set('freight_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem frete</SelectItem>
                <SelectItem value="per_unit">Por unidade</SelectItem>
                <SelectItem value="per_sale">Por venda/pedido</SelectItem>
                <SelectItem value="total_manual">Valor total manual</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Frete - valor (R$)"><Input type="number" step="0.01" value={form.freight_cost ?? ''} onChange={(e) => set('freight_cost', num(e.target.value))} /></Field>
          <Field label="Imposto - modo">
            <Select value={form.tax_mode ?? 'default'} onValueChange={(v) => set('tax_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Usar imposto padrão da loja</SelectItem>
                <SelectItem value="percent">Percentual (%)</SelectItem>
                <SelectItem value="fixed">Valor fixo por unidade (R$)</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Imposto - valor"><Input type="number" step="0.01" value={form.tax_value ?? ''} onChange={(e) => set('tax_value', num(e.target.value))} disabled={form.tax_mode === 'default'} /></Field>
          <Field label="Observações" className="md:col-span-2">
            <Textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </Field>
        </div>
        <DialogFooter className="gap-2">
          {product?.id && onUnlink && (
            <Button variant="outline" onClick={() => onUnlink(product.id)}>
              <Link2Off className="mr-2 h-4 w-4" /> Desvincular
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" /> Salvar configurações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-caption text-text-3">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
