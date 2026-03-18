import { useState } from 'react';
import { X, Plus, Minus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { Product, getVariationLabel } from '@/types/store';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  product: Product;
  onClose: () => void;
  onEdit: () => void;
}

export function StockProductDetail({ product, onClose, onEdit }: Props) {
  const { updateProduct, deleteProduct } = useStore();
  const [adjustQty, setAdjustQty] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSimpleStockChange = async (delta: number) => {
    const newQty = Math.max(0, product.stockQuantity + delta);
    await updateProduct(product.id, { stockQuantity: newQty });
    toast.success(`Estoque atualizado: ${newQty}`);
  };

  const handleSimpleAdjust = async () => {
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty < 0) return;
    await updateProduct(product.id, { stockQuantity: qty });
    setAdjustQty('');
    toast.success(`Estoque ajustado para ${qty}`);
  };

  const handleVariationStockChange = async (variationId: string, delta: number) => {
    const updatedVariations = product.variations.map(v =>
      v.id === variationId ? { ...v, stockQuantity: Math.max(0, v.stockQuantity + delta) } : v
    );
    const totalStock = updatedVariations.reduce((sum, v) => sum + v.stockQuantity, 0);
    await updateProduct(product.id, { variations: updatedVariations, stockQuantity: totalStock });
  };

  const handleDelete = async () => {
    await deleteProduct(product.id);
    toast.success('Produto excluído');
    onClose();
  };

  const hasVars = product.hasVariations && product.variations.length > 0;
  const minStock = (product as any).minStockQuantity ?? 5;

  const getStockStatus = (qty: number, min: number) => {
    if (qty === 0) return { color: 'text-destructive', bg: 'bg-destructive/10', icon: '🔴', label: 'Sem estoque' };
    if (qty <= min) return { color: 'text-warning', bg: 'bg-warning/10', icon: '🟡', label: 'Estoque baixo' };
    return { color: 'text-success', bg: 'bg-success/10', icon: '🟢', label: 'Normal' };
  };

  const status = getStockStatus(product.stockQuantity, minStock);

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm animate-fade-up">
      <div className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold truncate">{product.name}</h2>
            {(product as any).category && (
              <p className="text-xs text-muted-foreground">{(product as any).category}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
            <button onClick={onClose} className="p-2.5 hover:bg-secondary rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Delete confirm */}
          {showDeleteConfirm && (
            <div className="glass-card p-4 border-destructive/30 bg-destructive/5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <p className="text-sm font-bold text-destructive">Excluir este produto?</p>
              </div>
              <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Cancelar</Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="flex-1">Excluir</Button>
              </div>
            </div>
          )}

          {!hasVars ? (
            /* Simple product */
            <div className="space-y-5">
              {/* Big stock display */}
              <div className={cn('glass-card p-6 text-center', status.bg)}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Quantidade em estoque</p>
                <p className={cn('text-5xl font-extrabold', status.color)}>{product.stockQuantity}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span>{status.icon}</span>
                  <span className={cn('text-sm font-medium', status.color)}>{status.label}</span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-3 gap-3">
                <Button onClick={() => handleSimpleStockChange(1)} className="h-14 flex flex-col gap-1 gradient-primary">
                  <Plus className="w-5 h-5" />
                  <span className="text-xs">Entrada</span>
                </Button>
                <Button onClick={() => handleSimpleStockChange(-1)} variant="outline" className="h-14 flex flex-col gap-1">
                  <Minus className="w-5 h-5" />
                  <span className="text-xs">Saída</span>
                </Button>
                <div className="flex flex-col gap-1">
                  <Input type="number" min="0" value={adjustQty} onChange={e => setAdjustQty(e.target.value)} placeholder="Qtd" className="h-9 text-sm input-modern text-center" />
                  <Button onClick={handleSimpleAdjust} variant="outline" size="sm" className="h-5 text-[10px]" disabled={!adjustQty}>Ajustar</Button>
                </div>
              </div>

              {/* Info */}
              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Qtd mínima alerta</span>
                  <span className="font-semibold">{minStock}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custo unitário</span>
                  <span className="font-semibold">{formatCurrency(product.costPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor em estoque</span>
                  <span className="font-bold text-primary">{formatCurrency(product.costPrice * product.stockQuantity)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Product with variations */
            <div className="space-y-3">
              {/* Summary */}
              <div className="glass-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total em estoque</p>
                  <p className="text-2xl font-extrabold text-primary">{product.stockQuantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-semibold">Variações</p>
                  <p className="text-2xl font-extrabold">{product.variations.length}</p>
                </div>
              </div>

              {/* Variation list */}
              {product.variations.map(v => {
                const label = getVariationLabel(v.attributes);
                const vMin = (v as any).minStockQuantity ?? 5;
                const vStatus = getStockStatus(v.stockQuantity, vMin);

                return (
                  <div key={v.id} className={cn('glass-card p-4', vStatus.bg)}>
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span>{vStatus.icon}</span>
                          <p className="font-bold text-sm text-foreground truncate">{label}</p>
                        </div>
                        {v.sku && <p className="text-xs text-muted-foreground ml-6">SKU: {v.sku}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => handleVariationStockChange(v.id, -1)}>
                          <Minus className="w-3.5 h-3.5" />
                        </Button>
                        <span className={cn('w-10 text-center font-bold text-lg', vStatus.color)}>{v.stockQuantity}</span>
                        <Button variant="outline" size="sm" className="w-8 h-8 p-0" onClick={() => handleVariationStockChange(v.id, 1)}>
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
