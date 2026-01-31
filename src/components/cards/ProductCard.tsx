import { Package, TrendingUp, TrendingDown, MoreVertical, Copy, Trash2, Edit } from 'lucide-react';
import { Product, ProductCalculation } from '@/types/store';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProductCardProps {
  product: Product;
  calculation: ProductCalculation;
  onEdit: (product: Product) => void;
  onDuplicate: (productId: string) => void;
  onDelete: (productId: string) => void;
}

export function ProductCard({ 
  product, 
  calculation, 
  onEdit, 
  onDuplicate, 
  onDelete 
}: ProductCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const marginStatus = calculation.isAboveTarget ? 'success' : 'danger';
  const TrendIcon = calculation.isAboveTarget ? TrendingUp : TrendingDown;

  return (
    <div className="glass-card-hover p-4">
      <div className="flex gap-4">
        {/* Product Image or Icon */}
        <div className="flex-shrink-0">
          {product.imageUrl ? (
            <img 
              src={product.imageUrl} 
              alt={product.name}
              className="w-18 h-18 rounded-xl object-cover"
              style={{ width: '72px', height: '72px' }}
            />
          ) : (
            <div 
              className="rounded-xl bg-secondary flex items-center justify-center"
              style={{ width: '72px', height: '72px' }}
            >
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-foreground truncate text-base">
              {product.name}
            </h3>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 hover:bg-secondary rounded-lg transition-colors flex-shrink-0">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(product)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(product.id)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(product.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-4 mt-1.5">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Venda</p>
              <p className="text-sm font-bold">{formatCurrency(product.salePrice)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Custo</p>
              <p className="text-sm font-semibold text-muted-foreground">{formatCurrency(product.costPrice)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calculation Results */}
      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Lucro</p>
          <p className={cn(
            'text-xl font-extrabold',
            calculation.netProfit >= 0 ? 'text-success' : 'text-destructive'
          )}>
            {formatCurrency(calculation.netProfit)}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Margem</p>
            <div className="flex items-center gap-1.5 justify-end">
              <TrendIcon className={cn(
                'w-4 h-4',
                marginStatus === 'success' ? 'text-success' : 'text-destructive'
              )} />
              <span className={cn(
                'text-xl font-extrabold',
                marginStatus === 'success' ? 'text-success' : 'text-destructive'
              )}>
                {calculation.realMargin.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className={cn(
            'px-3 py-2 rounded-xl text-xs font-bold',
            marginStatus === 'success' 
              ? 'bg-success-muted text-success' 
              : 'bg-danger-muted text-danger'
          )}>
            {calculation.marginDifference >= 0 ? '+' : ''}{calculation.marginDifference.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
