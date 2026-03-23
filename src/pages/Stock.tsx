import { useState, useMemo } from 'react';
import { Package, Search, Plus, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
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
  if (p.variacoes.length === 0 || total === 0) return { label: 'Sem estoque', dotColor: 'bg-destructive' };
  if (hasZero || hasLow) return { label: 'Estoque baixo', dotColor: 'bg-warning' };
  return { label: 'Em estoque', dotColor: 'bg-success' };
}

export default function Stock() {
  const { produtos, loading, loadError, retryLoad, stats, reload } = useEstoque();
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
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-4" />
          <p className="text-text-2 text-sm">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <p className="text-text-2 text-sm">Erro ao carregar estoque.</p>
          <button
            onClick={() => retryLoad()}
            className="text-primary underline text-sm"
          >
            Tentar novamente
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Estoque" />

      <div className="pt-2 pb-24 md:pb-6 md:pt-6 space-y-2.5">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 animate-fade-up md:flex md:gap-3">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'Ativo', value: stats.ativo, color: 'text-success' },
            { label: 'Baixo', value: stats.baixo, color: 'text-warning' },
            { label: 'Zerado', value: stats.zerado, color: 'text-destructive' },
          ].map((s, i) => (
            <div key={s.label} className={cn('surface-card p-3 text-center md:w-[200px]', i < 2 ? 'stagger-1' : 'stagger-2')}>
              <p className={cn('text-2xl font-bold font-mono font-mono-num', s.color)}>{s.value}</p>
              <p className="section-label mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {stats.valorTotal > 0 && (
          <div className="surface-card px-4 py-3 flex items-center justify-between animate-fade-up">
            <p className="section-label">CAPITAL EM ESTOQUE</p>
            <p className="font-mono font-mono-num text-sm font-bold text-foreground">
              {formatCurrency(stats.valorTotal)}
            </p>
          </div>
        )}

        {/* Search */}
        <div className="flex gap-2 animate-fade-up">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou SKU..." className="pl-10 h-10 bg-surface-2 border-border rounded-lg focus:border-primary" />
          </div>
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
              const valor = product.variacoes.reduce((s, v) => s + v.preco_custo * v.quantidade, 0);

              return (
                <button
                  key={product.id}
                  onClick={() => setDetailProduct(product)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-2/50 transition-colors"
                >
                  {/* Initial */}
                  <div className="w-10 h-10 rounded-lg bg-surface-2 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {localImg ? (
                      <img src={localImg} alt={product.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[15px] font-bold text-text-2">{product.nome.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[15px] font-medium text-foreground truncate">{product.nome}</p>
                    <p className="text-[13px] text-text-2 font-mono font-mono-num">
                      {totalQty} un
                      {valor > 0 && ` · ${formatCurrency(valor)}`}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className={cn('w-2 h-2 rounded-full', status.dotColor)} />
                    <span className="font-mono text-[14px] font-bold font-mono-num text-foreground">
                      {totalQty}
                    </span>
                    <ChevronRight className="w-4 h-4 text-text-3" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-xl bg-surface-2 mx-auto flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-text-3" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">
              {search || filter !== 'all' ? 'Nenhum produto encontrado' : 'Nenhum produto no estoque'}
            </h3>
            <p className="text-sm text-text-2 mb-5">
              {search || filter !== 'all' ? 'Tente outros termos ou filtros' : 'Cadastre produtos para controlar seu estoque'}
            </p>
            {!search && filter === 'all' && (
              <Button onClick={() => setShowWizard(true)} className="bg-primary hover:bg-primary/90 rounded-[10px]">
                <Plus className="w-4 h-4 mr-2" /> Novo Produto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditProduct(null); setShowWizard(true); }}
        className="fixed z-50 bg-[hsl(var(--accent))] hover:brightness-110 active:scale-95 transition-all duration-150 shadow-lg
          bottom-[calc(96px+env(safe-area-inset-bottom))] right-5 w-14 h-14 rounded-full flex items-center justify-center
          md:right-8 md:rounded-xl md:w-auto md:h-auto md:px-5 md:py-3"
        style={{ backgroundColor: '#F97316' }}
      >
        <Plus className="w-6 h-6 text-white md:w-5 md:h-5" />
        <span className="hidden md:inline ml-2 text-white text-sm font-bold">Novo Produto</span>
      </button>

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
