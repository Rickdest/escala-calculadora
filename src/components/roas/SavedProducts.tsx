import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bookmark, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

const STORAGE_KEY = 'precify_saved_roas_products';
const MAX_PRODUCTS = 10;

export interface SavedRoasProduct {
  id: string;
  name: string;
  salePrice: number;
  costPrice: number;
  lucroBruto: number;
  roasEmpate: number | null;
  roasSaudavel: number | null;
  roasIdeal: number | null;
  marginPercent: number;
  savedAt: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function getSaved(): SavedRoasProduct[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function setSaved(products: SavedRoasProduct[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

interface SavedProductsProps {
  currentProduct?: {
    salePrice: number;
    costPrice: number;
    lucroBruto: number;
    roasEmpate: number | null;
    roasSaudavel: number | null;
    roasIdeal: number | null;
    marginPercent: number;
  } | null;
  onLoad?: (product: SavedRoasProduct) => void;
}

export function SavedProducts({ currentProduct, onLoad }: SavedProductsProps) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<SavedRoasProduct[]>([]);
  const [saveName, setSaveName] = useState('');

  useEffect(() => { setProducts(getSaved()); }, []);

  const handleSave = () => {
    if (!currentProduct || !saveName.trim()) { toast.error('Preencha o nome do produto'); return; }
    if (products.length >= MAX_PRODUCTS) { toast.error(`Limite de ${MAX_PRODUCTS} produtos atingido.`); return; }
    const newProduct: SavedRoasProduct = {
      id: Date.now().toString(),
      name: saveName.trim(),
      ...currentProduct,
      savedAt: new Date().toISOString(),
    };
    const updated = [newProduct, ...products];
    setSaved(updated);
    setProducts(updated);
    setSaveName('');
    toast.success('Produto salvo!');
  };

  const handleDelete = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setSaved(updated);
    setProducts(updated);
    toast.success('Produto removido');
  };

  const getStatusEmoji = (margin: number) => margin < 0 ? '🔴' : margin <= 15 ? '🟡' : '🟢';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="glass-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 h-auto hover:bg-secondary/30">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Meus Produtos Salvos</span>
              {products.length > 0 && (
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">{products.length}/{MAX_PRODUCTS}</span>
              )}
            </div>
            <ChevronDown className={cn('w-4 h-4 transition-transform text-muted-foreground', open && 'rotate-180')} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-3 animate-fade-in">
            {currentProduct && (
              <div className="flex gap-2">
                <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Nome do produto" className="input-modern h-9 text-sm flex-1" maxLength={40} />
                <Button onClick={handleSave} size="sm" className="h-9 text-xs gap-1 gradient-primary active:scale-95 transition-transform" disabled={!saveName.trim() || products.length >= MAX_PRODUCTS}>
                  <Bookmark className="w-3.5 h-3.5" />Salvar
                </Button>
              </div>
            )}
            {products.length >= MAX_PRODUCTS && (
              <div className="flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg p-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />Limite de {MAX_PRODUCTS} produtos atingido
              </div>
            )}
            {products.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 italic">Nenhum produto salvo ainda</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                {products.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 hover:bg-secondary/50 transition-colors group cursor-pointer" onClick={() => onLoad?.(p)}>
                    <span className="text-base">{getStatusEmoji(p.marginPercent)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{formatCurrency(p.lucroBruto)}/venda</span>
                        {p.roasEmpate && <span>• Emp: {p.roasEmpate.toFixed(1)}x</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
