import { useState } from 'react';
import { X, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Product } from '@/types/store';

interface Props {
  products: Product[];
  onClose: () => void;
  onLink: (productId: string) => void;
}

export function AdsLinkModal({ products, onClose, onLink }: Props) {
  const [search, setSearch] = useState('');
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-bold text-foreground text-sm">Vincular ao produto cadastrado</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-3 flex-1 overflow-y-auto">
          <p className="text-xs text-muted-foreground">Selecione o produto para calcular o ROAS de Empate e classificação:</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-10 h-10 text-sm" />
          </div>
          <div className="space-y-1 max-h-[300px] overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {filtered.length > 0 ? filtered.map(p => (
              <button
                key={p.id}
                onClick={() => onLink(p.id)}
                className="w-full text-left p-2.5 rounded-lg hover:bg-secondary/50 transition-colors flex items-center gap-3"
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    R$ {p.salePrice.toFixed(2)} · Custo R$ {p.costPrice.toFixed(2)}
                  </p>
                </div>
              </button>
            )) : (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum produto encontrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
