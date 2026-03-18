import { useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { ProductVariation, getVariationLabel } from '@/types/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface VariationsTableProps {
  variations: ProductVariation[];
  onChange: (variations: ProductVariation[]) => void;
  defaultCost: number;
  defaultSale: number;
}

export function VariationsTable({ variations, onChange, defaultCost, defaultSale }: VariationsTableProps) {
  const [bulkCost, setBulkCost] = useState('');
  const [bulkSale, setBulkSale] = useState('');
  const [bulkStock, setBulkStock] = useState('');

  const updateVariation = (id: string, updates: Partial<ProductVariation>) => {
    onChange(variations.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const removeVariation = (id: string) => {
    onChange(variations.filter(v => v.id !== id));
  };

  const applyBulk = () => {
    const cost = bulkCost ? parseFloat(bulkCost) : undefined;
    const sale = bulkSale ? parseFloat(bulkSale) : undefined;
    const stock = bulkStock ? parseInt(bulkStock) : undefined;

    onChange(variations.map(v => ({
      ...v,
      ...(cost !== undefined && { costPrice: cost }),
      ...(sale !== undefined && { salePrice: sale }),
      ...(stock !== undefined && { stockQuantity: stock }),
    })));

    setBulkCost('');
    setBulkSale('');
    setBulkStock('');
  };

  const totalStock = variations.reduce((sum, v) => sum + v.stockQuantity, 0);

  if (variations.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Adicione atributos e valores para gerar as combinações automaticamente.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk apply */}
      <div className="bg-primary/5 rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Copy className="w-4 h-4 text-primary" />
          <Label className="text-xs font-semibold">Aplicar para todas</Label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-muted-foreground">Custo</Label>
            <Input type="number" step="0.01" min="0" value={bulkCost} onChange={(e) => setBulkCost(e.target.value)} placeholder="R$" className="input-modern h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Venda</Label>
            <Input type="number" step="0.01" min="0" value={bulkSale} onChange={(e) => setBulkSale(e.target.value)} placeholder="R$" className="input-modern h-8 text-xs" />
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Estoque</Label>
            <Input type="number" min="0" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} placeholder="Qtd" className="input-modern h-8 text-xs" />
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={applyBulk} className="w-full text-xs">
          Aplicar
        </Button>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>{variations.length} combinações</span>
        <span className="font-semibold text-foreground">Estoque total: {totalStock}</span>
      </div>

      {/* Variation rows */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {variations.map((variation) => {
          const label = getVariationLabel(variation.attributes);
          return (
            <div key={variation.id} className="bg-secondary/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">{label}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeVariation(variation.id)} className="h-7 w-7 p-0 text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">SKU</Label>
                  <Input
                    value={variation.sku || ''}
                    onChange={(e) => updateVariation(variation.id, { sku: e.target.value })}
                    placeholder="—"
                    className="input-modern h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Custo</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={variation.costPrice}
                    onChange={(e) => updateVariation(variation.id, { costPrice: parseFloat(e.target.value) || 0 })}
                    className="input-modern h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Venda</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={variation.salePrice}
                    onChange={(e) => updateVariation(variation.id, { salePrice: parseFloat(e.target.value) || 0 })}
                    className="input-modern h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Estoque</Label>
                  <Input
                    type="number" min="0"
                    value={variation.stockQuantity}
                    onChange={(e) => updateVariation(variation.id, { stockQuantity: parseInt(e.target.value) || 0 })}
                    className="input-modern h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
