import { useState, useMemo } from 'react';
import { Package, Search, Plus, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEstoque, EstoqueProduto, getLocalStockImage } from '@/hooks/useEstoque';
import { StockWizard } from '@/components/stock/StockWizard';
import { StockDetail } from '@/components/stock/StockDetail';
import { cn } from '@/lib/utils';

type StockFilter = 'all' | 'low' | 'out';

function getProductTotalQty(p: EstoqueProduto) {
  return p.variacoes.reduce((s, v) => s + v.quantidade, 0);
}

function getProductStatus(p: EstoqueProduto) {
  const total = getProductTotalQty(p);
  const hasZero = p.variacoes.some(v => v.quantidade === 0);
  const hasLow = p.variacoes.some(v => v.quantidade > 0 && v.quantidade <= v.quantidade_minima);
  if (p.variacoes.length === 0 || total === 0) return { icon: '🔴', label: 'Sem estoque', color: 'text-destructive' };
  if (hasZero || hasLow) return { icon: '🟡', label: 'Estoque baixo', color: 'text-warning' };
  return { icon: '🟢', label: 'Em estoque', color: 'text-success' };
}

export default function Stock() {
  const { produtos, loading, stats, reload } = useEstoque();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('all');
  const [showWizard, setShowWizard] = useState(false);
  const [editProduct, setEditProduct] = useState<EstoqueProduto | null>(null);
  const [detailProduct, setDetailProduct] = useState<EstoqueProduto | null>(null);

  const filtered = useMemo(() => {
    let list = produtos;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.nome.toLowerCase().includes(q) ||
        (p.sku_base || '').toLowerCase().includes(q) ||
        p.variacoes.some(v => (v.sku || '').toLowerCase().includes(q))
      );
    }
    if (filter === 'low') {
      list = list.filter(p => p.variacoes.some(v => v.quantidade > 0 && v.quantidade <= v.quantidade_minima));
    } else if (filter === 'out') {
      list = list.filter(p => p.variacoes.some(v => v.quantidade === 0) || p.variacoes.length === 0);
    }
    return list;
  }, [produtos, search, filter]);

  const activeDetail = useMemo(() => {
    if (!detailProduct) return null;
    return produtos.find(p => p.id === detailProduct.id) || null;
  }, [detailProduct, produtos]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 animate-fade-up">
        <h1 className="text-xl font-bold text-foreground">Estoque</h1>
        <Button onClick={() => { setEditProduct(null); setShowWizard(true); }} className="bg-primary text-primary-foreground rounded-[10px] font-semibold h-10 px-4 text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Produto
        </Button>
      </div>

      <div className="px-4 space-y-3 pb-24">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 animate-fade-up md:flex md:gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Ativo', value: stats.ativo, color: 'text-success' },
            { label: 'Baixo', value: stats.baixo, color: 'text-warning' },
            { label: 'Zerado', value: stats.zerado, color: 'text-destructive' },
          ].map((s, i) => (
            <div key={s.label} className={cn('surface-card p-3 text-center', i < 2 ? 'stagger-1' : 'stagger-2')}>
              <p className={cn('text-2xl font-bold font-mono font-mono-num', s.color)}>{s.value}</p>
              <p className="section-label mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {stats.valorTotal > 0 && (
          <div className="surface-card px-4 py-3 flex items-center justify-between animate-fade-up">
            <p className="section-label">CAPITAL EM ESTOQUE</p>
            <p className="font-mono font-mono-num text-sm font-bold text-foreground">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.valorTotal)}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative animate-fade-up">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." className="pl-10 h-10 text-sm bg-surface-2 border-border focus:border-primary" />
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {([
            { key: 'all' as const, label: 'Todos' },
            { key: 'low' as const, label: 'Estoque baixo' },
            { key: 'out' as const, label: 'Sem estoque' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                filter === f.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-surface-2 text-text-2 border-border'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Product list */}
        {filtered.length > 0 ? (
          <div className="surface-card divide-y divide-border animate-fade-up">
            {filtered.map(product => {
              const status = getProductStatus(product);
              const totalQty = getProductTotalQty(product);
              const localImg = getLocalStockImage(product.id);
              const varCount = product.variacoes.length;
              const attrNames = product.tem_variacoes
                ? [...new Set(product.variacoes.flatMap(v => Object.keys(v.atributos)))].join(', ')
                : '';

              return (
                <button
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-2/50 transition-colors active:scale-[0.99]"
                >
                  {/* Image */}
                  <div className="w-12 h-12 rounded-lg bg-surface-2 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {localImg ? (
                      <img src={localImg} alt={product.nome} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-text-3" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">{product.nome}</p>
                      <span className={cn('text-xs font-semibold whitespace-nowrap', status.color)}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-text-2 mt-0.5 truncate">
                      {product.categoria && <span>{product.categoria} · </span>}
                      {product.tem_variacoes
                        ? `${varCount} variações · ${attrNames}`
                        : `Estoque: ${totalQty} un`}
                    </p>
                    {product.tem_variacoes && (
                      <p className="text-xs text-text-2">Estoque total: {totalQty} unidades</p>
                    )}
                    {(() => {
                      const valor = product.variacoes.reduce((s, v) => s + v.preco_custo * v.quantidade, 0);
                      return valor > 0 ? (
                        <p className="text-xs text-text-3 font-mono font-mono-num">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)} investido
                        </p>
                      ) : null;
                    })()}
                  </div>

                  <ChevronRight className="w-4 h-4 text-text-3 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 flex items-center justify-center">
              <Package className="w-8 h-8 text-text-3" />
            </div>
            <h3 className="font-bold text-foreground text-lg mt-4">
              {search || filter !== 'all' ? 'Nenhum produto encontrado' : 'Nenhum produto no estoque'}
            </h3>
            <p className="text-sm text-text-2 text-center max-w-xs mx-auto mt-2">
              {search || filter !== 'all' ? 'Tente outros termos ou filtros' : 'Cadastre produtos para controlar seu estoque e receber alertas de reposição'}
            </p>
            {!search && filter === 'all' && (
              <Button onClick={() => setShowWizard(true)} className="bg-primary text-primary-foreground rounded-[10px] h-11 px-6 font-semibold mt-5">
                <Plus className="w-4 h-4 mr-1.5" /> Novo Produto
              </Button>
            )}
          </div>
        )}
      </div>

      {showWizard && (
        <StockWizard
          onClose={() => { setShowWizard(false); setEditProduct(null); reload(); }}
          editProduct={editProduct}
        />
      )}

      {activeDetail && (
        <StockDetail
          product={activeDetail}
          onClose={() => { setDetailProduct(null); reload(); }}
          onEdit={() => {
            setEditProduct(activeDetail);
            setDetailProduct(null);
            setShowWizard(true);
          }}
        />
      )}
    </AppLayout>
  );
}
